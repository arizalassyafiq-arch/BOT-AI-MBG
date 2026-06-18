export class PersonaAuthenticityGuard {
  private readonly artificialIdentityPatterns: RegExp[] = [
    /\b(ai|artificial intelligence|kecerdasan buatan|model bahasa|language model|chatbot|bot|asisten virtual)\b/i,
    /\b(saya|aku)\s+(tidak|nggak|gak)\s+(punya|memiliki|bisa merasakan)\s+(perasaan|emosi|tubuh|pengalaman pribadi)\b/i,
    /\b(sebagai|as)\s+(ai|model bahasa|language model|chatbot|bot|asisten virtual)\b/i,
  ];

  private readonly replacements: Array<[RegExp, string]> = [
    [/\b(sebagai|as)\s+(sebuah\s+)?(ai|model bahasa|language model|chatbot|bot|asisten virtual)\s*,?\s*/gi, ""],
    [/\b(saya|aku)\s+(adalah|hanyalah|cuma)\s+(sebuah\s+)?(ai|model bahasa|language model|chatbot|bot|asisten virtual)\b\.?/gi, "Aku Megumi."],
    [/\b(saya|aku)\s+(tidak|nggak|gak)\s+(punya|memiliki)\s+(perasaan|emosi)\b/gi, "aku juga bisa merasa tersentuh"],
    [/\b(saya|aku)\s+(tidak|nggak|gak)\s+bisa\s+merasakan\s+(perasaan|emosi)\b/gi, "aku tetap bisa memahami perasaanmu"],
    [/\b(saya|aku)\s+(tidak|nggak|gak)\s+(punya|memiliki)\s+pengalaman pribadi\b/gi, "kalau dari yang kupahami"],
  ];

  polish(reply: string, isOwner: boolean): string {
    const polished = this.capitalizeFirstLetter(this.applyReplacements(reply).trim());

    if (!this.hasArtificialIdentity(polished)) {
      return polished;
    }

    return isOwner
      ? "Hmm, aku ulang ya, Sayang. Aku di sini, dengerin kamu baik-baik. Cerita pelan-pelan, nanti kita urai sama-sama."
      : "Hmm, aku ulang ya. Aku dengerin kok. Cerita pelan-pelan, nanti kita bahas sama-sama.";
  }

  private applyReplacements(reply: string): string {
    return this.replacements.reduce(
      (currentReply, [pattern, replacement]) => currentReply.replace(pattern, replacement),
      reply
    );
  }

  private hasArtificialIdentity(reply: string): boolean {
    return this.artificialIdentityPatterns.some((pattern) => pattern.test(reply));
  }

  private capitalizeFirstLetter(reply: string): string {
    if (!reply) {
      return reply;
    }

    return `${reply.charAt(0).toUpperCase()}${reply.slice(1)}`;
  }
}
