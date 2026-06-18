interface RepetitionRule {
  patterns: RegExp[];
  alternatives: string[];
}

export interface ResponseRepetitionConfig {
  enabled: boolean;
  recentLimit: number;
}

export class ResponseRepetitionPolicy {
  private readonly rules: RepetitionRule[] = [
    {
      patterns: [/\bpelan-pelan\b/gi, /\bpelan pelan\b/gi],
      alternatives: ["santai dulu", "nggak usah buru-buru"],
    },
    {
      patterns: [/\bcerita aja\b/gi],
      alternatives: ["aku dengerin", "tumpahin sedikit-sedikit aja"],
    },
    {
      patterns: [/\bbelum tidur\b/gi],
      alternatives: ["masih melek", "kok belum tidur"],
    },
    {
      patterns: [/\blagi apa\b/gi],
      alternatives: ["sekarang ngapain", "lagi sibuk"],
    },
    {
      patterns: [/\bhari ini berat\b/gi],
      alternatives: ["capek banget ya hari ini", "kayaknya harimu lumayan penuh"],
    },
    {
      patterns: [/\brebahan dulu\b/gi],
      alternatives: ["istirahat sebentar", "tiduran dulu sebentar"],
    },
    {
      patterns: [/\baku dengerin\b/gi],
      alternatives: ["aku baca kok", "aku temenin"],
    },
    {
      patterns: [/\bjangan lupa\b/gi],
      alternatives: ["inget ya", "nanti coba"],
    },
    {
      patterns: [/\bbaru muncul\b/gi],
      alternatives: ["akhirnya muncul juga", "eh, muncul juga"],
    },
  ];

  constructor(private readonly config: ResponseRepetitionConfig) {}

  apply(reply: string, chatHistory: { sender: string; content: string }[]): string {
    if (!this.config.enabled) {
      return reply;
    }

    const recentBotReplies = this.getRecentBotReplies(chatHistory);
    if (recentBotReplies.length === 0) {
      return reply;
    }

    const variedReply = this.replaceRepeatedPhrases(reply, recentBotReplies);
    if (!this.isTooSimilar(variedReply, recentBotReplies)) {
      return variedReply;
    }

    return this.resolveFallback(variedReply, recentBotReplies);
  }

  private replaceRepeatedPhrases(reply: string, recentBotReplies: string[]): string {
    return this.rules.reduce((currentReply, rule) => {
      if (!this.ruleAppearsInReply(rule, currentReply) || !this.ruleAppearsInRecentHistory(rule, recentBotReplies)) {
        return currentReply;
      }

      const replacement = this.pickUnusedAlternative(rule.alternatives, recentBotReplies);
      if (!replacement) {
        return currentReply;
      }

      return rule.patterns.reduce(
        (updatedReply, pattern) => updatedReply.replace(pattern, (match) => this.matchCapitalization(match, replacement)),
        currentReply
      );
    }, reply);
  }

  private ruleAppearsInReply(rule: RepetitionRule, reply: string): boolean {
    return rule.patterns.some((pattern) => this.testPattern(pattern, reply));
  }

  private ruleAppearsInRecentHistory(rule: RepetitionRule, recentBotReplies: string[]): boolean {
    return recentBotReplies.some((recentReply) =>
      rule.patterns.some((pattern) => this.testPattern(pattern, recentReply))
    );
  }

  private pickUnusedAlternative(alternatives: string[], recentBotReplies: string[]): string | undefined {
    const normalizedRecentReplies = recentBotReplies.map((reply) => this.normalize(reply));
    return alternatives.find((alternative) =>
      normalizedRecentReplies.every((recentReply) => !recentReply.includes(this.normalize(alternative)))
    );
  }

  private isTooSimilar(reply: string, recentBotReplies: string[]): boolean {
    const normalizedReply = this.normalize(reply);
    if (!normalizedReply) {
      return false;
    }

    return recentBotReplies.some((recentReply) => {
      const normalizedRecentReply = this.normalize(recentReply);
      return normalizedReply === normalizedRecentReply || this.wordSimilarity(normalizedReply, normalizedRecentReply) >= 0.82;
    });
  }

  private resolveFallback(reply: string, recentBotReplies: string[]): string {
    const candidates = [
      "Aku baca kok.",
      "Hmm, aku temenin.",
      "Iya, aku di sini.",
      "Santai dulu sebentar.",
      "Aku ngerti.",
    ];
    const normalizedRecentReplies = recentBotReplies.map((recentReply) => this.normalize(recentReply));
    const normalizedReply = this.normalize(reply);

    return candidates.find((candidate) =>
      this.normalize(candidate) !== normalizedReply &&
      normalizedRecentReplies.every((recentReply) => recentReply !== this.normalize(candidate))
    ) || reply;
  }

  private getRecentBotReplies(chatHistory: { sender: string; content: string }[]): string[] {
    const limit = this.resolveRecentLimit();
    return chatHistory
      .filter((history) => history.sender === "bot")
      .slice(-limit)
      .map((history) => history.content);
  }

  private testPattern(pattern: RegExp, value: string): boolean {
    pattern.lastIndex = 0;
    return pattern.test(value);
  }

  private wordSimilarity(first: string, second: string): number {
    const firstWords = new Set(first.split(" ").filter(Boolean));
    const secondWords = new Set(second.split(" ").filter(Boolean));
    if (firstWords.size === 0 || secondWords.size === 0) {
      return 0;
    }

    const intersectionSize = [...firstWords].filter((word) => secondWords.has(word)).length;
    const unionSize = new Set([...firstWords, ...secondWords]).size;
    return intersectionSize / unionSize;
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  private matchCapitalization(source: string, replacement: string): string {
    if (!source || source[0] !== source[0].toUpperCase()) {
      return replacement;
    }

    return `${replacement.charAt(0).toUpperCase()}${replacement.slice(1)}`;
  }

  private resolveRecentLimit(): number {
    if (!Number.isFinite(this.config.recentLimit) || this.config.recentLimit < 1) {
      return 6;
    }

    return Math.floor(this.config.recentLimit);
  }
}
