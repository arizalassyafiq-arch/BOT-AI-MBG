import { User } from "@prisma/client";
import { AppConfigValues } from "../config/AppConfig";
import { MemoryManager } from "./MemoryManager";
import { MoodTimelineService } from "./MoodTimelineService";
import { OwnerVerificationService } from "./OwnerVerificationService";
import { ResponseModePolicy } from "./ResponseModePolicy";

export interface BotCommandContext {
  config: AppConfigValues;
  memoryManager: MemoryManager;
  moodTimelineService: MoodTimelineService;
  ownerVerificationService: OwnerVerificationService;
  senderJid: string;
  isOwner: boolean;
  user: User;
}

export interface BotCommandResult {
  handled: boolean;
  reply?: string;
}

export class BotCommandHandler {
  constructor(private readonly responseModePolicy: ResponseModePolicy) {}

  async handle(message: string, context: BotCommandContext): Promise<BotCommandResult> {
    const trimmedMessage = message.trim();
    if (!trimmedMessage.startsWith("/")) {
      return { handled: false };
    }

    const [command, ...args] = trimmedMessage.split(/\s+/);
    const normalizedCommand = command.toLowerCase();

    switch (normalizedCommand) {
      case "/whoami":
        return {
          handled: true,
          reply: this.buildWhoAmIReply(context),
        };
      case "/status":
        return {
          handled: true,
          reply: this.buildStatusReply(context),
        };
      case "/mode":
        return this.handleModeCommand(args, context);
      case "/setowner":
        return {
          handled: true,
          reply: this.buildSetOwnerReply(context, args[0]),
        };
      case "/verifyowner":
        return this.handleVerifyOwnerCommand(args, context);
      case "/diary":
        return this.handleDiaryCommand(args, context);
      case "/mood":
        return this.handleMoodCommand(args, context);
      case "/help":
        return {
          handled: true,
          reply: this.buildHelpReply(),
        };
      default:
        return {
          handled: true,
          reply: "Command belum dikenal. Coba /help ya.",
        };
    }
  }

  private async handleModeCommand(args: string[], context: BotCommandContext): Promise<BotCommandResult> {
    const requestedMode = args[0]?.toLowerCase();
    const supportedModes = this.responseModePolicy.listSupportedModes();

    if (!requestedMode) {
      return {
        handled: true,
        reply: `Mode sekarang: ${context.user.responseMode}. Pilihan: ${supportedModes.join(", ")}.`,
      };
    }

    if (!context.isOwner) {
      return {
        handled: true,
        reply: "Mode khusus cuma bisa diubah oleh owner utama.",
      };
    }

    if (!this.responseModePolicy.isSupported(requestedMode)) {
      return {
        handled: true,
        reply: `Mode tidak dikenal. Pilihan yang tersedia: ${supportedModes.join(", ")}.`,
      };
    }

    const updatedUser = await context.memoryManager.updateResponseMode(context.user.id, requestedMode);

    return {
      handled: true,
      reply: `Mode Megumi sekarang: ${updatedUser.responseMode}.`,
    };
  }

  private buildWhoAmIReply(context: BotCommandContext): string {
    const ownerStatus = context.isOwner ? "ya" : "tidak";

    return [
      `JID kamu: ${context.senderJid}`,
      `Owner match: ${ownerStatus}`,
      `Nama kontak: ${context.user.name ?? "-"}`,
      `Mode: ${context.user.responseMode}`,
    ].join("\n");
  }

  private buildStatusReply(context: BotCommandContext): string {
    const ownerStatus = context.isOwner ? "owner" : "non-owner";

    return [
      `Status: ${ownerStatus}`,
      `Mode: ${context.user.responseMode}`,
      `Mood: ${context.user.mood}`,
      `Intimacy: ${context.user.intimacyLevel}/100`,
      `Trust: ${context.user.trustLevel}/100`,
      `Tension: ${context.user.tensionLevel}/100`,
      `Energy: ${context.user.energyLevel}/100`,
      `Phase: ${context.user.relationshipPhase}`,
      `Last topic: ${context.user.lastTopic ?? "-"}`,
      `Open loop: ${context.user.openLoop ?? "-"}`,
    ].join("\n");
  }

  private buildSetOwnerReply(context: BotCommandContext, requestedJid?: string): string {
    if (!context.isOwner) {
      return "Demi keamanan, hanya owner yang sudah terdaftar yang boleh mendaftarkan owner baru.";
    }

    const jid = requestedJid || context.senderJid;
    const existingIds = context.config.ownerWhatsAppIds.length
      ? context.config.ownerWhatsAppIds.join(",")
      : context.senderJid;

    return [
      "Untuk keamanan, owner disimpan lewat .env dan perlu restart bot.",
      `Tambahkan/ganti baris ini: BOT_OWNER_WHATSAPP_IDS="${existingIds},${jid}"`,
      "Setelah itu restart dengan Ctrl + C lalu npm run dev.",
    ].join("\n");
  }

  private async handleVerifyOwnerCommand(args: string[], context: BotCommandContext): Promise<BotCommandResult> {
    const result = await context.ownerVerificationService.claimOwner(context.config, context.senderJid, args[0]);

    const replies: Record<typeof result.status, string> = {
      verified: `Berhasil. JID ini sekarang terverifikasi sebagai owner: ${context.senderJid}`,
      already_owner: "JID ini sudah terdaftar sebagai owner.",
      not_configured: "Kode verifikasi owner belum diatur. Tambahkan BOT_OWNER_VERIFY_CODE di .env lalu restart bot.",
      invalid_code: "Kode verifikasi salah.",
      already_used: "Kode verifikasi ini sudah pernah dipakai. Buat kode baru di .env lalu restart bot jika JID berubah lagi.",
    };

    return {
      handled: true,
      reply: replies[result.status],
    };
  }

  private async handleDiaryCommand(args: string[], context: BotCommandContext): Promise<BotCommandResult> {
    if (!context.isOwner) {
      return {
        handled: true,
        reply: "Maaf, fitur catatan/diary ini hanya bisa diakses oleh owner utama.",
      };
    }

    const subCommand = args[0]?.toLowerCase();

    if (!subCommand || subCommand === "list") {
      const entries = await context.memoryManager.getDiaryEntries(context.user.id);
      if (entries.length === 0) {
        return {
          handled: true,
          reply: "Belum ada catatan hubungan tersimpan. Kamu bisa menambahkannya secara otomatis saat mengobrol atau manual dengan perintah: /diary add <catatan>.",
        };
      }

      const formatted = entries
        .map((entry) => `[ID: ${entry.id}] (${new Date(entry.createdAt).toLocaleDateString("id-ID")}): ${entry.value}`)
        .join("\n\n");

      return {
        handled: true,
        reply: `=== CATATAN HUBUNGAN KITA ===\n\n${formatted}`,
      };
    }

    if (subCommand === "add") {
      const content = args.slice(1).join(" ").trim();
      if (!content) {
        return {
          handled: true,
          reply: "Format salah. Gunakan: /diary add <isi catatan>",
        };
      }

      await context.memoryManager.addDiaryEntry(context.user.id, content);
      return {
        handled: true,
        reply: `Catatan hubungan berhasil disimpan! ✨`,
      };
    }

    if (subCommand === "delete") {
      const targetId = Number(args[1]);
      if (!targetId || isNaN(targetId)) {
        return {
          handled: true,
          reply: "Format salah. Gunakan: /diary delete <ID catatan>",
        };
      }

      const success = await context.memoryManager.deleteDiaryEntry(context.user.id, targetId);
      if (!success) {
        return {
          handled: true,
          reply: `Catatan dengan ID ${targetId} tidak ditemukan.`,
        };
      }

      return {
        handled: true,
        reply: `Catatan dengan ID ${targetId} berhasil dihapus.`,
      };
    }

    if (subCommand === "clear") {
      await context.memoryManager.clearDiaryEntries(context.user.id);
      return {
        handled: true,
        reply: "Semua catatan hubungan kita berhasil dihapus.",
      };
    }

    return {
      handled: true,
      reply: "Subcommand diary tidak dikenal. Gunakan: /diary [list|add|delete|clear]",
    };
  }

  private async handleMoodCommand(args: string[], context: BotCommandContext): Promise<BotCommandResult> {
    if (!context.isOwner) {
      return {
        handled: true,
        reply: "Maaf, timeline mood hanya bisa dilihat oleh owner utama.",
      };
    }

    const requestedLimit = Number(args[0]);
    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : 7;
    const entries = await context.moodTimelineService.getRecentEntries(context.user.id, limit);

    return {
      handled: true,
      reply: `=== TIMELINE MOOD TERAKHIR ===\n\n${context.moodTimelineService.formatEntriesForOwner(entries)}`,
    };
  }

  private buildHelpReply(): string {
    return [
      "Command yang tersedia:",
      "/whoami - lihat JID dan status owner",
      "/status - lihat state chat kamu",
      "/mode - lihat mode aktif",
      "/mode auto|romantic|comfort|daily|jealous|silent - ubah mode owner",
      "/setowner <jid> - panduan tambah owner dari .env",
      "/verifyowner <kode> - klaim owner sekali pakai jika JID berubah",
      "/diary - lihat catatan hubungan",
      "/diary add <catatan> - tambah catatan secara manual",
      "/diary delete <id> - hapus catatan berdasarkan ID",
      "/diary clear - hapus semua catatan",
      "/mood [jumlah] - lihat timeline mood terakhir",
    ].join("\n");
  }
}
