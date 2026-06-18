import { OpenAI } from "openai";
import { AppConfig } from "../config/AppConfig";
import { MemoryManager } from "./MemoryManager";

export class DiaryExtractionService {
  private openai: OpenAI;

  constructor(private readonly memoryManager: MemoryManager) {
    const config = AppConfig.load();
    this.openai = new OpenAI({ apiKey: config.openAiApiKey });
  }

  async extractAndSave(userId: string, userMessage: string, isOwner: boolean): Promise<void> {
    if (!isOwner) {
      return; // Diary is owner-only!
    }

    const config = AppConfig.load();
    const systemPrompt = `
      Anda adalah asisten pencatat memori hubungan jangka panjang (diary/memory) untuk owner dari bot AI.
      Tugas Anda adalah menganalisis pesan terbaru dari owner (user) dan menentukan apakah pesan tersebut berisi informasi penting tentang dirinya atau hubungan mereka yang perlu diingat selamanya.

      Kategori informasi penting yang perlu disimpan:
      1. Kebiasaan baru, hobi, makanan kesukaan, atau ketidaksukaan (misal: "aku sekarang suka kopi latte", "aku benci sayur kol").
      2. Rencana, target hidup, proyek penting, target karir, target belajar, pekerjaan, ujian, atau janji penting (misal: "bulan depan aku mau rilis game baru", "besok sore ada meeting penting").
      3. Fakta personal mendasar (misal: "tanggal lahirku 10 Oktober", "aku anak kedua").
      4. Kejadian penting, perasaan mendalam, atau milestone hubungan (misal: "kemarin aku habis jalan-jalan", "aku merasa cemas akhir-akhir ini").
      5. Peringatan, alarm, jadwal penting (misal: "tolong ingetin aku bayar kosan tanggal 5").

      Aturan Penulisan Catatan:
      - Tulis catatan singkat, padat, dan langsung ke intinya dalam Bahasa Indonesia yang santai (misal: "Rizal suka kopi latte", "Rizal sedang membuat proyek game baru", "Rizal berulang tahun tanggal 10 Oktober").
      - Gunakan nama owner "Rizal" untuk merujuk pada user.
      - Jika pesan hanya berisi obrolan ringan biasa (seperti "halo", "apa kabar", "lagi apa", candaan tanpa informasi penting), maka jangan simpan apa pun.

      Kembalikan output HANYA dalam format JSON valid berikut tanpa penjelasan tambahan:
      {
        "extractedNotes": [
          "isi catatan penting 1",
          "isi catatan penting 2"
        ]
      }
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: config.routerModel, // gpt-4o-mini
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Pesan owner: "${userMessage}"` }
        ],
        temperature: 0,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0].message.content || "{}";
      const result = JSON.parse(content);
      const notes: string[] = result.extractedNotes || [];

      for (const note of notes) {
        const trimmedNote = note.trim();
        if (trimmedNote) {
          console.log(`[DiaryExtractor] Menyimpan catatan otomatis: "${trimmedNote}"`);
          await this.memoryManager.addDiaryEntry(userId, trimmedNote);
        }
      }
    } catch (error) {
      console.error("[DiaryExtractor] Gagal mengekstrak catatan hubungan:", error);
    }
  }
}
