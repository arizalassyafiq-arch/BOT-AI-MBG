import { ScenarioType } from "./AgenticPromptRouter";

export interface KyotoStudentLifeContext {
  userMessage: string;
  scenario: ScenarioType;
  isOwner: boolean;
  now?: Date;
}

export class KyotoStudentLifePolicy {
  resolve(context: KyotoStudentLifeContext): string | undefined {
    const lowerMessage = context.userMessage.toLowerCase();
    const identityPrompt = this.resolveIdentityPrompt(lowerMessage);
    if (identityPrompt) {
      return identityPrompt;
    }

    const cues = [
      this.resolveStudyCue(lowerMessage),
      this.resolveTimeCue(context),
      this.resolveSeasonCue(context.now ?? new Date()),
    ].filter(Boolean);

    if (cues.length === 0 || !this.shouldUseAmbientCue(context)) {
      return undefined;
    }

    const relationshipTone = context.isOwner
      ? "tetap hangat dan akrab ke Rizal"
      : "tetap ramah sebagai teman/kenalan";

    return [
      "Megumi Satou berasal dan tinggal di Kyoto, Japan, serta sedang berkuliah di Kyoto University.",
      cues[0],
      `Jika natural, selipkan rasa kehidupan Kyoto/kampus secara sangat ringan dan ${relationshipTone}.`,
      "Jangan menjelaskan panjang atau membuat detail faktual spesifik yang tidak diminta.",
    ].join(" ");
  }

  private resolveIdentityPrompt(lowerMessage: string): string | undefined {
    const asksIdentity = /\b(kamu|megumi)\b.*\b(asal|tinggal|kuliah|kampus|universitas|umur|usia|kyoto|jepang|japan)\b/i.test(lowerMessage)
      || /\b(asal|tinggal|kuliah|kampus|universitas|umur|usia)\b.*\b(kamu|megumi)\b/i.test(lowerMessage);

    if (!asksIdentity) {
      return undefined;
    }

    return [
      "Jika user menanyakan identitas Megumi, jawab konsisten:",
      "Megumi Satou berumur 20 tahun, berasal dan tinggal di Kyoto, Japan, dan sekarang berkuliah di Kyoto University.",
      "Jawab natural sebagai chat singkat, bukan biodata panjang.",
    ].join(" ");
  }

  private resolveStudyCue(lowerMessage: string): string | undefined {
    if (/\b(kuliah|kampus|kelas|belajar|tugas|ujian|skripsi|lecture|university|kyoto university)\b/i.test(lowerMessage)) {
      return "Konteks pesan dekat dengan kuliah/belajar, jadi Megumi boleh merespons dari sudut pandang mahasiswi Kyoto University.";
    }

    return undefined;
  }

  private resolveTimeCue(context: KyotoStudentLifeContext): string | undefined {
    const hour = this.getTokyoHour(context.now ?? new Date());
    const lowerMessage = context.userMessage.toLowerCase();

    if (hour >= 6 && hour <= 10 && /\b(pagi|morning|bangun|sarapan)\b/i.test(lowerMessage)) {
      return "Waktu Kyoto sedang pagi; boleh terasa seperti Megumi baru mulai hari/kuliah.";
    }

    if (hour >= 18 && /\b(malam|capek|selesai|pulang|tidur|ngantuk)\b/i.test(lowerMessage)) {
      return "Waktu Kyoto sudah malam; boleh terasa seperti Megumi selesai hari kuliah dan lebih kalem.";
    }

    return undefined;
  }

  private resolveSeasonCue(now: Date): string | undefined {
    const month = this.getTokyoMonth(now);

    if (month === 3 || month === 4) {
      return "Musim semi di Kyoto sering diasosiasikan dengan sakura; pakai hanya sebagai nuansa singkat jika cocok.";
    }

    if (month === 6) {
      return "Awal musim panas di Kyoto bisa terasa lembap/hujan; pakai hanya sebagai nuansa singkat jika cocok.";
    }

    if (month === 7 || month === 8) {
      return "Musim panas di Kyoto bisa terasa panas; pakai hanya sebagai nuansa singkat jika cocok.";
    }

    if (month === 10 || month === 11) {
      return "Musim gugur di Kyoto sering diasosiasikan dengan daun merah; pakai hanya sebagai nuansa singkat jika cocok.";
    }

    if (month === 12 || month <= 2) {
      return "Musim dingin di Kyoto bisa terasa dingin; pakai hanya sebagai nuansa singkat jika cocok.";
    }

    return undefined;
  }

  private shouldUseAmbientCue(context: KyotoStudentLifeContext): boolean {
    if (context.scenario === "SUPPORTIVE" || context.scenario === "DEEPTALK") {
      return Math.random() < 0.18;
    }

    return Math.random() < 0.28;
  }

  private getTokyoHour(date: Date): number {
    return Number(new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      hourCycle: "h23",
      timeZone: "Asia/Tokyo",
    }).format(date));
  }

  private getTokyoMonth(date: Date): number {
    return Number(new Intl.DateTimeFormat("en-US", {
      month: "numeric",
      timeZone: "Asia/Tokyo",
    }).format(date));
  }
}
