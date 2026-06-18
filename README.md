# WhatsApp Partner Bot

Bot WhatsApp berbasis `whatsapp-web.js`, Prisma SQLite, dan OpenAI.

## Setup

1. Salin `.env.example` menjadi `.env`.
2. Isi `OPENAI_API_KEY`.
3. Atur persona/model di `.env` sesuai kebutuhan.
4. Jalankan:

```powershell
npm run setup
npm run db:migrate
npm run dev
```

## Konfigurasi Env

`OPENAI_RESPONSE_MODEL`: model untuk membalas chat utama, default `gpt-4o`.

`OPENAI_ROUTER_MODEL`: model ringan untuk klasifikasi skenario/mood, default `gpt-4o-mini`.

`OPENAI_RESPONSE_TEMPERATURE`: kreativitas jawaban. Semakin tinggi semakin ekspresif.

`OPENAI_MAX_RESPONSE_TOKENS`: batas panjang balasan bot.

`BOT_PARTNER_NAME`: nama persona bot.

`BOT_FALLBACK_USER_NAME`: panggilan default kalau nama kontak tidak ada.

`BOT_RELATIONSHIP_LABEL`: peran persona ke user, misalnya `pasangan hidup`.

`BOT_USER_CALL_SIGN`: daftar panggilan sayang yang boleh dipakai bot.

`BOT_OWNER_WHATSAPP_IDS`: daftar JID WhatsApp owner yang boleh dipanggil `Rizal`/`Sayang`, pisahkan dengan koma jika lebih dari satu.

`BOT_OWNER_VERIFY_CODE`: kode rahasia sekali pakai untuk command `/verifyowner <kode>` jika JID owner berubah.

`BOT_OWNER_DISPLAY_NAME`, `BOT_OWNER_CALL_SIGN`: nama dan panggilan khusus untuk owner.

`BOT_OWNER_PERSONAL_NICKNAME`: nickname personal opsional untuk owner. Kosongkan jika tidak ingin dipakai.

`BOT_PUBLIC_RELATIONSHIP_LABEL`, `BOT_PUBLIC_CALL_SIGN`: relasi dan panggilan untuk user lain selain owner.

Catatan owner: setelah mengubah `BOT_OWNER_WHATSAPP_IDS`, restart bot agar konfigurasi baru terbaca. User non-owner otomatis dipaksa ke gaya teman/kenalan; skenario romantis dan kenaikan intimacy tidak diterapkan untuk mereka.

Jika JID owner berubah, atur `BOT_OWNER_VERIFY_CODE` dengan kode rahasia baru, restart bot, lalu kirim `/verifyowner <kode>` dari nomor owner. Kode yang berhasil dipakai akan tersimpan sebagai sudah terpakai di database.

`BOT_BASE_PERSONA`: aturan persona utama.

`BOT_LANGUAGE_STYLE`: gaya bahasa global.

`BOT_RESPONSE_EMOJI_ENABLED`: `true` agar bot boleh memakai emoji/emote sesekali saat konteksnya cocok.

`BOT_REPLY_TO_USER_MESSAGES_ENABLED`: `true` agar bot membalas memakai fitur reply/quote ke pesan user terakhir.

`BOT_REPLY_TO_USER_MESSAGES_PROBABILITY`: peluang bot memakai reply/quote saat membalas. `0.6` berarti kira-kira 60% balasan akan quote pesan user.

`BOT_FOLLOW_UP_MEMORY_ENABLED`: `true` agar bot sesekali menanyakan lanjutan dari memory lama yang relevan.

`BOT_FOLLOW_UP_MEMORY_PROBABILITY`: peluang follow-up memory dipakai saat obrolan ringan. `0.25` berarti kira-kira 25%.

`BOT_FOLLOW_UP_MEMORY_MIN_AGE_HOURS`: umur minimal memory sebelum boleh dipakai untuk follow-up, supaya bot tidak langsung mengungkit pesan yang baru saja dikirim.

`BOT_PARTNER_TIME_GREETING_ENABLED`: `true` agar sapaan pagi/siang/sore/malam dijawab lebih natural.

`BOT_PARTNER_LONG_ABSENCE_ENABLED`: `true` agar bot bisa sedikit kangen/manja saat owner baru chat lagi setelah lama diam.

`BOT_PARTNER_LONG_ABSENCE_HOURS`: batas jam dianggap lama tidak chat. Default `8`.

`BOT_PARTNER_QUESTION_RESTRAINT_ENABLED`: `true` agar bot tidak terlalu sering menutup balasan dengan pertanyaan.

`BOT_PARTNER_MAX_RECENT_QUESTIONS`: jumlah maksimal balasan bot bertanya dalam beberapa chat terakhir sebelum pertanyaan baru dikurangi.

`BOT_PARTNER_CONTEXT_REACTION_ENABLED`: `true` agar pesan seperti capek, pusing, atau bingung dijawab lebih kontekstual dan tidak langsung menasihati panjang.

`BOT_PROACTIVE_CONVERSATION_ENABLED`: `true` agar bot sesekali melempar pertanyaan ringan ke owner saat obrolan santai, tanpa menunggu user memberi topik jelas.

`BOT_PROACTIVE_CONVERSATION_PROBABILITY`: peluang pertanyaan proaktif muncul pada obrolan ringan. `0.18` berarti kira-kira 18%.

`BOT_PROACTIVE_CONVERSATION_MIN_INTERVAL_HOURS`: jeda minimal antar pertanyaan proaktif agar bot tidak terasa terlalu banyak bertanya.

`BOT_RESPONSE_REPETITION_GUARD_ENABLED`: `true` agar bot mengurangi pengulangan frasa yang baru saja dipakai.

`BOT_RESPONSE_REPETITION_RECENT_LIMIT`: jumlah balasan bot terakhir yang dicek untuk anti repetisi.

`BOT_USD_IDR_FOLLOW_UP_ENABLED`: `true` agar bot mengirim update kurs USD ke IDR berkala. Default disarankan `false` jika kurs hanya ingin dijawab saat ditanya.

`BOT_USD_IDR_FOLLOW_UP_INTERVAL_MINUTES`: interval update kurs dalam menit. Default `60`.

`BOT_USD_IDR_FOLLOW_UP_NOTIFY_ON_STARTUP`: `true` agar bot langsung mengirim kurs saat WhatsApp client siap.

`BOT_USD_IDR_FOLLOW_UP_RECIPIENTS`: daftar JID penerima update kurs, pisahkan koma. Kosongkan untuk memakai `BOT_OWNER_WHATSAPP_IDS`.

`BOT_USD_IDR_RATE_API_URL`: endpoint API kurs. Default memakai endpoint open access ExchangeRate-API untuk base `USD`.

`BOT_HOT_NEWS_ENABLED`: `true` agar bot bisa menjawab pertanyaan soal berita panas/viral dan sesekali membuka obrolan ringan tentang headline terbaru.

`BOT_HOT_NEWS_QUESTION_PROBABILITY`: peluang bot menyelipkan pertanyaan berita panas saat obrolan ringan dengan owner. Default `0.06` agar tidak sering.

`BOT_HOT_NEWS_MIN_INTERVAL_HOURS`: jeda minimal antar pertanyaan berita panas yang dimulai bot. Default `10`.

`BOT_HOT_NEWS_CACHE_MINUTES`: durasi cache headline RSS agar bot tidak terlalu sering fetch sumber berita.

`BOT_HOT_NEWS_MAX_ITEMS`: jumlah headline maksimal yang dipakai sebagai konteks jawaban.

`BOT_HOT_NEWS_RSS_URLS`: daftar RSS sumber berita, pisahkan koma. Default memakai Google News Indonesia/topik viral.

`BOT_TYPING_INDICATOR_ENABLED`: `true` agar bot menampilkan status mengetik sebelum membalas.

`BOT_TYPING_MIN_DELAY_MS`, `BOT_TYPING_MAX_DELAY_MS`: batas bawah/atas delay natural sebelum bot mengirim balasan.

`BOT_CHAT_HISTORY_LIMIT`: jumlah pesan terakhir yang dikirim ke model response.

`BOT_ROUTER_HISTORY_LIMIT`: jumlah pesan terakhir untuk ringkasan router.

`BOT_MESSAGE_DEBOUNCE_MS`: jeda tunggu untuk menggabungkan beberapa pesan cepat dari user yang sama sebelum bot membalas.

`BOT_MEMORY_FACTS_LIMIT`: jumlah fakta memory jangka panjang yang dimasukkan ke prompt response.

`BOT_DEFAULT_INTIMACY_LEVEL`: nilai kedekatan awal user baru.

`BOT_CHARACTER_BACKGROUND`, `BOT_CHARACTER_PERSONALITY`, `BOT_CHARACTER_SPEECH_STYLE`, `BOT_CHARACTER_BOUNDARIES`, `BOT_CHARACTER_RELATIONSHIP_PACE`, `BOT_CHARACTER_HABITS`, `BOT_CHARACTER_CONTEXTUAL_BEHAVIORS`, `BOT_CHARACTER_MOOD_TRIGGERS`, `BOT_CHARACTER_DIALOG_EXAMPLES`, `BOT_CHARACTER_FORBIDDEN_BEHAVIORS`: profil karakter detail untuk menjaga persona tetap konsisten.

Conversation state internal menyimpan `mood`, `intimacyLevel`, `trustLevel`, `tensionLevel`, `energyLevel`, `familiarityLevel`, `lastTopic`, `openLoop`, `relationshipPhase`, dan `userPreferredTone`.

Mood timeline menyimpan snapshot mood/energy/tension/intimacy setelah respons utama diproses. Timeline ini dipakai sebagai konteks halus agar respons berikutnya lebih peka terhadap pola mood owner belakangan, tanpa menyebut angka internal ke chat.

Persona Megumi Satou juga membawa konteks Kyoto: berumur 20 tahun, berasal dan tinggal di Kyoto, Japan, serta sedang berkuliah di Kyoto University. Bot bisa sesekali menyelipkan nuansa Kyoto/kampus saat natural, terutama ketika user bertanya soal Megumi, kuliah, kampus, waktu, atau suasana harian.

`WHATSAPP_HEADLESS`: `true` untuk browser tersembunyi, `false` untuk menampilkan Chrome.

`WHATSAPP_BROWSER_EXECUTABLE_PATH`: path Chrome/Edge opsional jika browser tidak berada di lokasi standar. Kosongkan agar bot mencari Chrome/Edge otomatis.

`WHATSAPP_USER_AGENT`: user-agent browser untuk WhatsApp Web.

## Command

`npm run dev`: menjalankan bot dari TypeScript.

`npm run build`: compile TypeScript ke `dist`.

`npm start`: menjalankan hasil build dari `dist/app.js`.

`npm run check`: validasi compile TypeScript.

`npm run setup`: install dependency dan generate Prisma Client.

`npm run db:generate`: generate Prisma Client.

`npm run db:migrate`: membuat/menerapkan migration database lokal.

`npm run db:studio`: membuka Prisma Studio.

`npm run clean:browser`: tutup proses Chrome/Edge yang masih memakai sesi WhatsApp bot.

`npm run clean:session`: hapus sesi login WhatsApp. Pakai kalau QR/login bermasalah.

`npm run clean:cache`: hapus cache WhatsApp Web.

`npm run clean:whatsapp`: hapus sesi dan cache WhatsApp.

`npm run dev:reset`: hapus sesi/cache lalu menjalankan bot lagi.

## Command WhatsApp

`/whoami`: tampilkan JID pengirim, status owner, nama kontak, dan mode aktif.

`/status`: tampilkan state chat seperti mood, intimacy, trust, tension, energy, dan phase.

`/mode`: tampilkan mode aktif dan daftar mode.

`/mode auto|romantic|comfort|daily|jealous|silent`: ubah mode respons khusus owner.

`/setowner <jid>`: tampilkan panduan menambah owner lewat `.env`.

`/verifyowner <kode>`: klaim owner sekali pakai memakai `BOT_OWNER_VERIFY_CODE`.

`/mood [jumlah]`: tampilkan timeline mood terakhir untuk owner.

## QR Tidak Muncul

1. Pastikan tidak ada terminal lama yang masih menjalankan bot.
2. Jika muncul pesan sesi sedang dipakai, jalankan `npm run clean:browser`, lalu jalankan ulang.
3. Jalankan `npm run clean:session` jika sesi tetap terkunci setelah semua proses lama ditutup.
4. Jalankan `npm run clean:cache` jika cache WhatsApp Web bermasalah.
5. Jalankan `npm run dev`.
6. Scan QR dari WhatsApp: `Linked devices` -> `Link a device`.
