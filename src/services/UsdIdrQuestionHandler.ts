import { UsdIdrExchangeRateService, UsdIdrRateSnapshot } from "./UsdIdrExchangeRateService";

export interface UsdIdrQuestionResult {
  handled: boolean;
  reply?: string;
}

type UsdIdrIntent = "none" | "rate_lookup" | "market_explanation";

export class UsdIdrQuestionHandler {
  constructor(private readonly exchangeRateService: UsdIdrExchangeRateService) {}

  async handle(message: string): Promise<UsdIdrQuestionResult> {
    const intent = this.classifyIntent(message);
    if (intent === "none") {
      return { handled: false };
    }

    const snapshot = await this.exchangeRateService.getCurrentRate();
    return {
      handled: true,
      reply: intent === "market_explanation"
        ? this.formatMarketExplanation(snapshot)
        : this.formatRateReply(snapshot),
    };
  }

  private classifyIntent(message: string): UsdIdrIntent {
    const lowerMessage = message.toLowerCase();
    const mentionsDollar = /\b(dollar|dolar|usd|\$)\b/i.test(lowerMessage);
    const mentionsRupiah = /\b(rupiah|idr|rp)\b/i.test(lowerMessage);
    const asksRate = /\b(kurs|rate|harga|berapa|nilai|tukar|konversi)\b/i.test(lowerMessage);
    const asksCause = /\b(kenapa|mengapa|kok|sebab|penyebab|alasannya|faktor)\b/i.test(lowerMessage);
    const discussesMovement = /\b(menguat|melemah|naik|turun|kuat|lemah|anjlok|tertekan)\b/i.test(lowerMessage);

    if (!mentionsDollar || (!mentionsRupiah && !asksRate)) {
      return "none";
    }

    if (asksCause || discussesMovement) {
      return "market_explanation";
    }

    return asksRate ? "rate_lookup" : "none";
  }

  private formatRateReply(snapshot: UsdIdrRateSnapshot): string {
    const rate = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 2,
    }).format(snapshot.rate);
    const checkedAt = new Intl.DateTimeFormat("id-ID", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "Asia/Jakarta",
    }).format(snapshot.fetchedAt);

    return `Sekarang 1 ${snapshot.baseCode} sekitar ${rate}. Aku cek ${checkedAt} WIB, ya.`;
  }

  private formatMarketExplanation(snapshot: UsdIdrRateSnapshot): string {
    const rate = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 2,
    }).format(snapshot.rate);

    return `Di kisaran ${rate}/${snapshot.baseCode}, dolar biasanya menguat saat pasar lebih cari aset aman, data AS kuat, atau suku bunga AS terasa menarik. Rupiah ikut tertekan kalau arus modal keluar dan kebutuhan dolar impor lagi besar.`;
  }
}
