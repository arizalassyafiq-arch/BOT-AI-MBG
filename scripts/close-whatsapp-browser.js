const { execFileSync } = require("child_process");
const path = require("path");

const sessionPath = path.resolve(process.cwd(), ".wwebjs_auth", "session");

if (process.platform !== "win32") {
  console.log("[clean:browser] Script ini saat ini hanya menutup Chrome/Edge otomatis di Windows.");
  process.exit(0);
}

const command = [
  "$sessionPath = $env:WWEBJS_SESSION_PATH;",
  "$processes = Get-CimInstance Win32_Process -Filter \"name = 'chrome.exe' or name = 'msedge.exe'\" |",
  "Where-Object { $_.CommandLine -and $_.CommandLine.Contains($sessionPath) }",
  "; if (-not $processes) { exit 0 }",
  "; $processes | ForEach-Object {",
  "  Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue",
  "  Write-Output $_.ProcessId",
  "}"
].join(" ");

try {
  const output = execFileSync(
    "powershell",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        WWEBJS_SESSION_PATH: sessionPath
      },
      stdio: ["ignore", "pipe", "pipe"]
    }
  );

  const processIds = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (processIds.length === 0) {
    console.log("[clean:browser] Tidak ada proses Chrome/Edge yang memakai sesi WhatsApp bot.");
    process.exit(0);
  }

  console.log(`[clean:browser] Menutup proses browser sesi WhatsApp bot: ${processIds.join(", ")}.`);
} catch (error) {
  console.error("[clean:browser] Gagal menutup proses browser sesi WhatsApp bot.");
  console.error(error.message || error);
  process.exit(1);
}
