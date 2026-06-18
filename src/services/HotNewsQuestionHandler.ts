import { OpenAI } from "openai";
import { HotNewsItem, HotNewsService } from "./HotNewsService";

export interface HotNewsQuestionResult {
  handled: boolean;
  reply?: string;
}

export interface HotNewsQuestionHandlerOptions {
  enabled: boolean;
  model: string;
}

export class HotNewsQuestionHandler {
  constructor(
    private readonly openai: OpenAI,
    private readonly hotNewsService: HotNewsService,
    private readonly options: HotNewsQuestionHandlerOptions
  ) {}

  async handle(message: string): Promise<HotNewsQuestionResult> {
    if (!this.options.enabled || !this.isHotNewsQuestion(message)) {
      return { handled: false };
    }

    try {
      const query = this.extractQuery(message);
      const items = await this.hotNewsService.getHotItems(query);
      if (items.length === 0) {
        return {
          handled: true,
          reply: "Aku belum nemu headline panas yang jelas sekarang. Coba sebut topiknya biar aku cek lebih fokus.",
        };
      }

      return {
        handled: true,
        reply: await this.buildReply(message, items),
      };
    } catch (error) {
      console.warn("[HotNews] Gagal mengambil/menjawab berita panas:", error);
      return {
        handled: true,
        reply: "Aku belum bisa cek berita panasnya sekarang. Nanti coba tanya lagi ya.",
      };
    }
  }

  private isHotNewsQuestion(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    const mentionsNews = /\b(berita|news|headline|kabar|isu|kasus)\b/i.test(lowerMessage);
    const mentionsHeat = /\b(viral|panas|trending|rame|ramai|heboh|terbaru|hari ini|update)\b/i.test(lowerMessage);
    const asksOpinion = /\b(menurutmu|pendapat|tanggapan|gimana|bagaimana|kenapa|kok)\b/i.test(lowerMessage);

    return (mentionsNews && (mentionsHeat || asksOpinion)) || (mentionsHeat && asksOpinion);
  }

  private extractQuery(message: string): string | undefined {
    const cleanedQuery = message
      .toLowerCase()
      .replace(/\b(berita|news|headline|kabar|isu|kasus|viral|panas|trending|rame|ramai|heboh|terbaru|hari ini|update|menurutmu|pendapat|tanggapan|gimana|bagaimana|apa|yang|ada|lagi|dong|sato|chan|aku|mau|tanya)\b/gi, " ")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();

    return cleanedQuery.length >= 3 ? cleanedQuery : undefined;
  }

  private async buildReply(message: string, items: HotNewsItem[]): Promise<string> {
    const headlineContext = items
      .map((item, index) => {
        const source = item.source ? ` (${item.source})` : "";
        return `${index + 1}. ${item.title}${source}`;
      })
      .join("\n");

    const response = await this.openai.chat.completions.create({
      model: this.options.model,
      messages: [
        {
          role: "system",
          content: [
            "Kamu adalah Megumi Satou yang sedang membalas chat WhatsApp Rizal.",
            "Jawab dalam Bahasa Indonesia santai, 1-2 kalimat, natural, dan tidak kaku.",
            "Gunakan hanya headline yang diberikan. Jangan mengarang detail, kronologi, angka, atau klaim yang tidak ada di headline.",
            "Jika user minta pendapat, beri tanggapan hati-hati dengan frasa seperti 'dari headline yang kelihatan'.",
          ].join(" "),
        },
        {
          role: "user",
          content: `Pesan Rizal: "${message}"\n\nHeadline yang tersedia:\n${headlineContext}`,
        },
      ],
      temperature: 0.45,
    });

    return response.choices[0].message.content?.trim()
      || this.formatFallbackReply(items);
  }

  private formatFallbackReply(items: HotNewsItem[]): string {
    const headline = items[0];
    return `Yang lagi kelihatan panas: ${headline.title}. Dari headline aja, aku bakal hati-hati dulu sebelum nyimpulin terlalu jauh.`;
  }
}
