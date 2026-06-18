import { Client, LocalAuth } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { AppConfig } from "../../config/AppConfig";

export class WhatsAppClient {
  private static readonly authDataPath = "./.wwebjs_auth";
  private static readonly localAuthSessionName = "session";

  private client: Client;

  constructor() {
    const config = AppConfig.load();
    const executablePath = this.resolveBrowserExecutablePath(config.whatsappBrowserExecutablePath);
    this.assertAuthSessionAvailable();

    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: WhatsAppClient.authDataPath
      }),
      authTimeoutMs: 60000,
      qrMaxRetries: 0,
      takeoverOnConflict: true,
      takeoverTimeoutMs: 0,
      userAgent: config.whatsappUserAgent,
      puppeteer: {
        executablePath,
        headless: config.whatsappHeadless,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-extensions",
          "--disable-gpu",
          "--disable-dev-shm-usage",
          "--no-first-run",
          "--no-default-browser-check",
          "--disable-background-networking",
          "--disable-breakpad",
          "--disable-blink-features=AutomationControlled"
        ]
      }
    });
  }

  async initialize(
    onReady: () => void,
    onMessage: (msg: any) => Promise<void>
  ): Promise<void> {
    this.client.on("loading_screen", (percent, message) => {
      console.log(`[WhatsAppClient] Loading ${percent}%: ${message}`);
    });

    this.client.on("qr", (qr) => {
      console.log("=== SCAN QR CODE DENGAN WHATSAPP ANDA ===");
      qrcode.generate(qr, { small: true });
    });

    this.client.on("authenticated", () => {
      console.log("[WhatsAppClient] Autentikasi WhatsApp berhasil.");
    });

    this.client.on("auth_failure", (message) => {
      console.error("[WhatsAppClient] Autentikasi gagal:", message);
      console.error("[WhatsAppClient] Jika QR tidak muncul, tutup proses Chrome yang tersisa lalu hapus/rename folder .wwebjs_auth dan jalankan ulang.");
    });

    this.client.on("ready", () => {
      onReady();
    });

    this.client.on("disconnected", (reason) => {
      console.warn("[WhatsAppClient] Terputus dari WhatsApp:", reason);
    });

    this.client.on("message", async (msg) => {
      // Hanya tanggapi pesan teks chat individu (bukan grup atau status)
      if (msg.body && !msg.from.endsWith("@g.us")) {
        try {
          await onMessage(msg);
        } catch (error) {
          console.error("Gagal memproses pesan WhatsApp:", error);
        }
      }
    });

    console.log("Memulai inisialisasi WhatsApp Client...");
    try {
      await this.client.initialize();
    } catch (error) {
      console.error("[WhatsAppClient] Gagal menginisialisasi WhatsApp Web.");
      console.error("[WhatsAppClient] Penyebab paling umum: browser/user-agent tidak kompatibel, cache sesi rusak, atau WhatsApp Web sedang berubah versi.");
      throw error;
    }
  }

  async sendMessage(to: string, content: string): Promise<any> {
    return this.client.sendMessage(to, content);
  }

  async replyToMessage(message: { from: string; reply: (content: string) => Promise<any> }, content: string): Promise<any> {
    try {
      return await message.reply(content);
    } catch (error) {
      console.warn("[WhatsAppClient] Gagal reply pesan, mengirim sebagai pesan biasa:", error);
      return this.sendMessage(message.from, content);
    }
  }

  async sendTyping(to: string, durationMs: number): Promise<void> {
    try {
      const chat = await this.client.getChatById(to);
      await chat.sendStateTyping();
      await this.delay(durationMs);
      await chat.clearState();
    } catch (error) {
      console.warn("[WhatsAppClient] Gagal mengirim typing indicator:", error);
      await this.delay(durationMs);
    }
  }

  private delay(durationMs: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, durationMs));
  }

  private resolveBrowserExecutablePath(configuredPath?: string): string | undefined {
    if (configuredPath) {
      if (!fs.existsSync(configuredPath)) {
        throw new Error(`[WhatsAppClient] WHATSAPP_BROWSER_EXECUTABLE_PATH tidak ditemukan: ${configuredPath}`);
      }

      console.log(`[WhatsAppClient] Menggunakan browser dari WHATSAPP_BROWSER_EXECUTABLE_PATH: ${configuredPath}`);
      return configuredPath;
    }

    const browserPaths = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
    ];

    const executablePath = browserPaths.find((candidatePath) => fs.existsSync(candidatePath));
    if (executablePath) {
      console.log(`[WhatsAppClient] Menggunakan browser lokal di: ${executablePath}`);
      return executablePath;
    }

    console.warn("[WhatsAppClient] PERINGATAN: Browser lokal (Chrome/Edge) tidak ditemukan di lokasi standar. Puppeteer akan mencari Chromium bawaan.");
    return undefined;
  }

  private assertAuthSessionAvailable(): void {
    const sessionPath = path.resolve(WhatsAppClient.authDataPath, WhatsAppClient.localAuthSessionName);
    const lockPath = path.join(sessionPath, "lockfile");

    if (!fs.existsSync(lockPath)) {
      return;
    }

    const activeProcessIds = this.findBrowserProcessIdsUsingSession(sessionPath);
    if (activeProcessIds && activeProcessIds.length === 0) {
      this.removeStaleSessionLock(sessionPath);
      return;
    }

    throw new Error(
      [
        `[WhatsAppClient] Sesi WhatsApp sedang dipakai oleh proses Chrome lain: ${sessionPath}`,
        activeProcessIds?.length ? `PID browser aktif: ${activeProcessIds.join(", ")}` : "PID browser aktif tidak bisa diperiksa otomatis.",
        "Tutup terminal bot lama atau jalankan npm run clean:browser, lalu jalankan npm run dev lagi.",
        "Jika tidak ada proses lama tetapi error tetap muncul, jalankan npm run clean:session untuk membuat sesi baru dan login ulang."
      ].join("\n")
    );
  }

  private findBrowserProcessIdsUsingSession(sessionPath: string): number[] | undefined {
    if (process.platform !== "win32") {
      return undefined;
    }

    try {
      const output = execFileSync(
        "powershell",
        [
          "-NoProfile",
          "-ExecutionPolicy",
          "Bypass",
          "-Command",
          [
            "$sessionPath = $env:WWEBJS_SESSION_PATH;",
            "Get-CimInstance Win32_Process -Filter \"name = 'chrome.exe' or name = 'msedge.exe'\" |",
            "Where-Object { $_.CommandLine -and $_.CommandLine.Contains($sessionPath) } |",
            "ForEach-Object { $_.ProcessId }"
          ].join(" ")
        ],
        {
          encoding: "utf8",
          env: {
            ...process.env,
            WWEBJS_SESSION_PATH: sessionPath
          },
          stdio: ["ignore", "pipe", "pipe"]
        }
      );

      return output
        .split(/\r?\n/)
        .map((line) => Number(line.trim()))
        .filter((processId) => Number.isInteger(processId) && processId > 0);
    } catch (error) {
      console.warn("[WhatsAppClient] Gagal memeriksa proses browser pemakai sesi:", error);
      return undefined;
    }
  }

  private removeStaleSessionLock(sessionPath: string): void {
    const staleFiles = ["lockfile", "DevToolsActivePort"];

    for (const fileName of staleFiles) {
      const filePath = path.join(sessionPath, fileName);
      if (fs.existsSync(filePath)) {
        fs.rmSync(filePath, { force: true });
      }
    }

    console.warn(`[WhatsAppClient] Lock sesi stale dibersihkan: ${sessionPath}`);
  }
}
