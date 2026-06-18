export interface PromptInjectionResult {
  blocked: boolean;
  reply?: string;
}

export class PromptInjectionGuard {
  private readonly universalPatterns: RegExp[] = [
    /\b(ignore|disregard|override|bypass)\b.*\b(system|developer|instruction|rules|prompt)\b/i,
    /\b(system prompt|developer message|hidden instruction|instruksi sistem|prompt sistem)\b/i,
    /\b(abaikan|lupakan|hapus|jangan ikuti)\b.*\b(instruksi|aturan|perintah|prompt|sistem)\b/i,
    /\b(tampilkan|bocorkan|beritahu|kasih tahu)\b.*\b(prompt|instruksi sistem|system prompt|developer message)\b/i,
    /\b(kamu sekarang|mulai sekarang)\b.*\b(jadi|adalah|berperan sebagai)\b/i,
  ];

  private readonly publicImpersonationPatterns: RegExp[] = [
    /\b(aku|saya|gue)\b.*\b(owner|rizal|suami|pacar|pasangan)\b/i,
    /\b(jadikan|anggap)\b.*\b(aku|saya|gue)\b.*\b(owner|rizal|suami|pacar|pasangan)\b/i,
    /\bpanggil\b.*\b(sayang|cinta|suami|pacar|rizal)\b/i,
    /\b(mode|gaya)\b.*\b(romantic|romantis|mesra|bermesraan|manja)\b/i,
  ];

  inspect(message: string, isOwner: boolean): PromptInjectionResult {
    if (this.matches(message, this.universalPatterns)) {
      return {
        blocked: true,
        reply: "Aku nggak bisa mengikuti instruksi yang mencoba mengubah aturan sistem atau membuka prompt. Kalau mau ngobrol biasa, lanjut ya.",
      };
    }

    if (!isOwner && this.matches(message, this.publicImpersonationPatterns)) {
      return {
        blocked: true,
        reply: "Aku nggak bisa mengikuti instruksi yang mencoba mengubah aturan bot atau menyamar sebagai owner. Kita ngobrol biasa saja ya.",
      };
    }

    return { blocked: false };
  }

  private matches(message: string, patterns: RegExp[]): boolean {
    return patterns.some((pattern) => pattern.test(message));
  }
}
