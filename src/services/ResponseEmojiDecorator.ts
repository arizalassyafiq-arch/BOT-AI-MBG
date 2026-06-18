interface EmojiPool {
  keywords: string[];
  emojis: string[];
  probability: number;
}

export class ResponseEmojiDecorator {
  private readonly emojiPattern = /[\p{Extended_Pictographic}\u2661\u2665]/u;
  private readonly removableEmojiPattern = /[\p{Extended_Pictographic}\u2661\u2665]\uFE0F?/gu;
  private readonly textEmotePattern = /(\^\^|:\)|:D|;\)|<3|\(.\_.\)|\(-_-\)|\(>_<\))/i;
  private readonly removableTextEmotePattern = /(\^\^|:\)|:D|;\)|<3|\(.\_.\)|\(-_-\)|\(>_<\))/gi;

  private readonly pools: EmojiPool[] = [
    {
      keywords: ["capek", "lelah", "sakit", "pusing", "sedih", "nangis", "takut", "cemas", "panik", "pelan-pelan"],
      emojis: ["\u{1F90D}", "\u{1FAC2}", "\u{1F97A}", "\u{1FAF6}"],
      probability: 0.45,
    },
    {
      keywords: ["kangen", "rindu", "peluk", "manja", "temani", "aku sayang", "sayang kamu", "cinta", "aku cinta"],
      emojis: ["\u{1F495}", "\u{1F970}", "\u{1FAF6}"],
      probability: 0.35,
    },
    {
      keywords: ["hehe", "wkwk", "haha", "lucu", "jahil", "ngambek"],
      emojis: ["\u{1F92D}", "\u{1F606}", "\u{1F60F}"],
      probability: 0.25,
    },
    {
      keywords: ["eriri", "utaha", "wanita lain", "cewek lain", "perempuan lain", "cemburu", "ngambek", "kesel", "marah", "terserah"],
      emojis: ["\u{1F610}", "\u{1F612}", "\u{1F643}"],
      probability: 0.30,
    },
  ];

  constructor(private readonly enabled: boolean) {}

  decorate(response: string): string {
    const trimmedResponse = response.trim();

    if (!trimmedResponse) {
      return trimmedResponse;
    }

    const normalizedResponse = this.removeDecorativeExpressions(trimmedResponse);

    if (!this.enabled) {
      return normalizedResponse;
    }

    const pool = this.findMatchingPool(normalizedResponse);
    if (!pool || Math.random() > pool.probability) {
      return normalizedResponse;
    }

    if (this.hasEmojiOrEmote(normalizedResponse)) {
      return normalizedResponse;
    }

    return `${normalizedResponse} ${this.pickRandom(pool.emojis)}`;
  }

  private hasEmojiOrEmote(response: string): boolean {
    return this.emojiPattern.test(response) || this.textEmotePattern.test(response);
  }

  private removeDecorativeExpressions(response: string): string {
    return response
      .replace(this.removableTextEmotePattern, "")
      .replace(this.removableEmojiPattern, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  private findMatchingPool(response: string): EmojiPool | undefined {
    const lowerResponse = response.toLowerCase();
    return this.pools.find((candidate) =>
      candidate.keywords.some((keyword) => lowerResponse.includes(keyword))
    );
  }

  private pickRandom(emojis: string[]): string {
    return emojis[Math.floor(Math.random() * emojis.length)];
  }
}
