const fs = require("fs");
const path = require("path");

const args = new Set(process.argv.slice(2));
const cleanAuth = args.size === 0 || args.has("--auth");
const cleanCache = args.size === 0 || args.has("--cache");

const targets = [];
if (cleanAuth) targets.push(".wwebjs_auth");
if (cleanCache) targets.push(".wwebjs_cache");

for (const target of targets) {
  const fullPath = path.resolve(process.cwd(), target);
  if (!fs.existsSync(fullPath)) {
    console.log(`[clean] Skip ${target}: tidak ada.`);
    continue;
  }

  fs.rmSync(fullPath, { recursive: true, force: true });
  console.log(`[clean] Hapus ${target}.`);
}

console.log("[clean] Selesai. Jalankan ulang bot untuk membuat session/cache baru.");
