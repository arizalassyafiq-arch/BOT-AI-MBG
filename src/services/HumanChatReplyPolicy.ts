export class HumanChatReplyPolicy {
  private readonly decorativeEmojiPattern = /[\p{Extended_Pictographic}\u2661\u2665]\uFE0F?/gu;
  private readonly decorativeTextEmotePattern = /(\^\^|:\)|:D|;\)|<3|\(.\_.\)|\(-_-\)|\(>_<\))/gi;
  private readonly directAddressPattern = /\b(Sayang|Rizal)\b/gi;
  private readonly exactPhraseReplacements: Array<[RegExp, string]> = [
    [/^Ada apa,?\s*(Sayang|Rizal)\??$/i, "Iya?"],
    [/^Hai,\s*(Sayang|Rizal)!?\s*Gimana harimu hari ini\??$/i, "Hai, lagi apa?"],
    [/^Aku baik-baik aja,\s*(Sayang|Rizal)\.\s*Senang dengar kabar baik darimu\.?$/i, "Aku baik kok. Kamu lagi apa?"],
    [/^Malam,\s*(Sayang|Rizal)\.\s*Udah siap-siap mau istirahat,\s*ya\?$/i, "Malam. Belum tidur?"],
    [/^Tentu,\s*aku senang kalau ngobrol sama kamu\.\s*Mau cerita apa nih\?$/i, "Boleh. Mau bahas apa?"],
    [/^Kenapa,\s*(Sayang|Rizal)\?\s*Kalau mau cerita,\s*aku siap dengerin dan bantu sebisa mungkin\.?$/i, "Bingung soal apa? Cerita aja pelan-pelan."],
    [/^Hehe,\s*aku senang ngobrol sama kamu\.?$/i, "Hehe, aku masih pengen ngobrol aja."],
    [/^Dengan senang hati,?\s*(Sayang|Rizal)?\.?$/i, "Boleh."],
    [/^Baiklah,?\s*(Sayang|Rizal)?\.?$/i, "Oke."],
    [/^Aku di sini untuk membantumu\.?$/i, "Aku temenin."],
    [/^Apakah ada hal lain yang ingin kamu ceritakan\??$/i, "Ada lagi?"],
  ];

  private readonly stiffPhraseReplacements: Array<[RegExp, string]> = [
    [/\bTentu,\s*/gi, "Boleh, "],
    [/\bTentu saja\b/gi, "Boleh"],
    [/\bDengan senang hati,?\s*/gi, "Boleh, "],
    [/\bBaiklah,?\s*/gi, "Oke, "],
    [/\bBaik,\s*/g, "Oke, "],
    [/\bbaik,\s*/g, "oke, "],
    [/\bSaya memahami\b/g, "Aku paham"],
    [/\bsaya memahami\b/g, "aku paham"],
    [/\bSaya mengerti\b/g, "Aku ngerti"],
    [/\bsaya mengerti\b/g, "aku ngerti"],
    [/\bTerima kasih sudah berbagi\b/gi, "Makasih udah cerita"],
    [/\bAku di sini untuk membantumu\b/gi, "aku temenin"],
    [/\bApakah ada hal lain yang ingin kamu ceritakan\??/gi, "Ada lagi?"],
    [/\bmembantumu\b/gi, "bantu kamu"],
    [/\bmembantu kamu\b/gi, "bantu kamu"],
    [/\bmembantu Anda\b/gi, "bantu kamu"],
    [/\baku senang kalau ngobrol sama kamu\b/gi, "aku mau nemenin"],
    [/\baku senang ngobrol sama kamu\b/gi, "aku masih pengen ngobrol aja"],
    [/\bSenang dengar kabar baik darimu\.?/gi, "Bagus deh."],
    [/\bGimana harimu hari ini\?/gi, "Lagi apa?"],
    [/\bKalau mau cerita,\s*aku siap dengerin dan bantu sebisa mungkin\.?/gi, "Cerita aja pelan-pelan."],
    [/\baku siap dengerin\b/gi, "aku dengerin"],
    [/\bsebisa mungkin\b/gi, "pelan-pelan"],
    [/\bUdah siap-siap mau istirahat,\s*ya\?/gi, "Belum tidur?"],
    [/\bApakah\b/g, "Apa"],
    [/\bapakah\b/g, "apa"],
    [/\bBagaimana\b/g, "Gimana"],
    [/\bbagaimana\b/g, "gimana"],
    [/\bMengapa\b/g, "Kenapa"],
    [/\bmengapa\b/g, "kenapa"],
    [/\bNamun\b/g, "Tapi"],
    [/\bnamun\b/g, "tapi"],
    [/\bTidak\b/g, "Nggak"],
    [/\btidak\b/g, "nggak"],
    [/\bSilakan\b/g, "Coba"],
    [/\bsilakan\b/g, "coba"],
    [/\bDapat\b/g, "Bisa"],
    [/\bdapat\b/g, "bisa"],
    [/\bSudah\b/g, "Udah"],
    [/\bsudah\b/g, "udah"],
    [/\bSaya\b/g, "Aku"],
    [/\bsaya\b/g, "aku"],
    [/\bAnda\b/g, "Kamu"],
    [/\banda\b/g, "kamu"],
    [/\bKamu sendiri udah mau tidur belum\?/gi, "Kamu kok belum tidur?"],
    [/\bKamu sendiri sudah mau tidur belum\?/gi, "Kamu kok belum tidur?"],
    [/\bAda apa,?\s*(Sayang|Rizal)\??/gi, "Iya?"],
  ];

  constructor(
    private readonly maxSentences = 2,
    private readonly maxCharacters = 220
  ) {}

  apply(reply: string): string {
    const normalizedReply = this.makeConversational(this.normalizeWhitespace(reply));
    if (!normalizedReply) {
      return normalizedReply;
    }

    const sentenceLimitedReply = this.limitSentences(normalizedReply);
    return this.limitCharacters(sentenceLimitedReply);
  }

  private normalizeWhitespace(reply: string): string {
    return reply
      .replace(this.decorativeTextEmotePattern, "")
      .replace(this.decorativeEmojiPattern, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  private makeConversational(reply: string): string {
    const exactReplacement = this.exactPhraseReplacements.find(([pattern]) => pattern.test(reply));
    if (exactReplacement) {
      return exactReplacement[1];
    }

    const softenedReply = this.stiffPhraseReplacements.reduce(
      (currentReply, [pattern, replacement]) => currentReply.replace(pattern, replacement),
      reply
    );

    return this.trimOverusedDirectAddress(softenedReply);
  }

  private trimOverusedDirectAddress(reply: string): string {
    const directAddresses = reply.match(this.directAddressPattern) ?? [];
    const startsWithDirectAddress = /^(Hai|Halo|Malam|Pagi|Siang|Sore|Kenapa),?\s+(Sayang|Rizal)\b/i.test(reply);

    if (directAddresses.length === 0 || (!startsWithDirectAddress && directAddresses.length === 1)) {
      return reply;
    }

    return reply
      .replace(/^(Hai|Halo|Malam|Pagi|Siang|Sore|Kenapa),?\s+(Sayang|Rizal)([.!?])?/i, "$1$3")
      .replace(/,\s*(Sayang|Rizal)\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .replace(/\s+([.!?])/g, "$1")
      .trim();
  }

  private limitSentences(reply: string): string {
    const sentences = this.splitSentences(reply);
    if (sentences.length <= this.maxSentences) {
      return reply;
    }

    return sentences.slice(0, this.maxSentences).join(" ");
  }

  private splitSentences(reply: string): string[] {
    const sentences: string[] = [];
    let sentenceStartIndex = 0;

    for (let index = 0; index < reply.length; index++) {
      const character = reply[index];
      if (!/[.!?]/.test(character) || this.isNumericSeparator(reply, index)) {
        continue;
      }

      const sentence = reply.slice(sentenceStartIndex, index + 1).trim();
      if (sentence) {
        sentences.push(sentence);
      }
      sentenceStartIndex = index + 1;
    }

    const trailingSentence = reply.slice(sentenceStartIndex).trim();
    if (trailingSentence) {
      sentences.push(trailingSentence);
    }

    return sentences;
  }

  private isNumericSeparator(value: string, index: number): boolean {
    return value[index] === "." && /\d/.test(value[index - 1] || "") && /\d/.test(value[index + 1] || "");
  }

  private limitCharacters(reply: string): string {
    if (reply.length <= this.maxCharacters) {
      return reply;
    }

    const cutIndex = this.findNaturalCutIndex(reply);
    const shortenedReply = reply.slice(0, cutIndex).trim().replace(/[,:;]+$/, "");
    return /[.!?]$/.test(shortenedReply) ? shortenedReply : `${shortenedReply}.`;
  }

  private findNaturalCutIndex(reply: string): number {
    const commaIndex = reply.lastIndexOf(",", this.maxCharacters);
    if (commaIndex >= this.maxCharacters * 0.6) {
      return commaIndex;
    }

    const spaceIndex = reply.lastIndexOf(" ", this.maxCharacters);
    if (spaceIndex >= this.maxCharacters * 0.6) {
      return spaceIndex;
    }

    return this.maxCharacters;
  }
}
