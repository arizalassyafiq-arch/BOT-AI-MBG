export interface PartnerBehaviorConfig {
  timeGreetingEnabled: boolean;
  longAbsenceEnabled: boolean;
  longAbsenceHours: number;
  questionRestraintEnabled: boolean;
  maxRecentQuestions: number;
  contextReactionEnabled: boolean;
  personalNickname?: string;
}

export interface PartnerBehaviorContext {
  userMessage: string;
  isOwner: boolean;
  previousUserMessageAt?: Date | null;
  recentChatHistory: { sender: string; content: string }[];
  now?: Date;
}

export interface PartnerBehaviorResult {
  directReply?: string;
  promptDirective?: string;
}

export class PartnerBehaviorPolicy {
  constructor(private readonly config: PartnerBehaviorConfig) {}

  resolve(context: PartnerBehaviorContext): PartnerBehaviorResult {
    if (!context.isOwner) {
      return {};
    }

    const longAbsenceReply = this.resolveLongAbsenceReply(context);
    if (longAbsenceReply) {
      return {
        directReply: longAbsenceReply,
        promptDirective: this.resolvePromptDirective(context),
      };
    }

    const contextualReply = this.resolveContextualReply(context);
    if (contextualReply) {
      return {
        directReply: contextualReply,
        promptDirective: this.resolvePromptDirective(context),
      };
    }

    const timeGreetingReply = this.resolveTimeGreetingReply(context);
    if (timeGreetingReply) {
      return {
        directReply: timeGreetingReply,
        promptDirective: this.resolvePromptDirective(context),
      };
    }

    return {
      promptDirective: this.resolvePromptDirective(context),
    };
  }

  polish(reply: string, context: PartnerBehaviorContext): string {
    if (!this.config.questionRestraintEnabled || this.countRecentBotQuestions(context.recentChatHistory) < this.config.maxRecentQuestions) {
      return reply;
    }

    const sentences = reply.match(/[^.!?]+[.!?]*/g)?.map((sentence) => sentence.trim()).filter(Boolean);
    if (!sentences || sentences.length === 0) {
      return reply;
    }

    const firstNonQuestion = sentences.find((sentence) => !sentence.endsWith("?"));
    return firstNonQuestion || sentences[0].replace(/\?+$/, ".");
  }

  private resolvePromptDirective(context: PartnerBehaviorContext): string | undefined {
    const directives: string[] = [];
    const nickname = this.config.personalNickname?.trim();

    if (nickname) {
      directives.push(`Personal nickname user: ${nickname}. Pakai sesekali saja saat terasa dekat, jangan di setiap respons.`);
    }

    if (this.config.questionRestraintEnabled && this.countRecentBotQuestions(context.recentChatHistory) >= this.config.maxRecentQuestions) {
      directives.push("Beberapa balasan terakhir sudah banyak bertanya. Kali ini utamakan respons/reaksi pendek tanpa pertanyaan baru.");
    }

    if (this.config.contextReactionEnabled && this.isTiredOrUnwellMessage(context.userMessage)) {
      directives.push("User sedang capek/sakit/pusing. Jangan langsung memberi banyak solusi; validasi dulu dengan kalimat pendek yang terasa menemani.");
    }

    if (this.config.timeGreetingEnabled && this.isTimeGreeting(context.userMessage)) {
      directives.push("User menyapa sesuai waktu. Balas singkat dan natural, seperti pasangan yang sudah akrab.");
    }

    if (this.config.longAbsenceEnabled && this.getAbsenceHours(context) >= this.resolveLongAbsenceHours()) {
      directives.push("User baru muncul setelah cukup lama. Boleh terdengar sedikit kangen/manja, tapi jangan menyalahkan.");
    }

    return directives.length ? directives.join(" ") : undefined;
  }

  private resolveLongAbsenceReply(context: PartnerBehaviorContext): string | undefined {
    if (!this.config.longAbsenceEnabled || !this.isLightGreeting(context.userMessage)) {
      return undefined;
    }

    const absenceHours = this.getAbsenceHours(context);
    if (absenceHours < this.resolveLongAbsenceHours()) {
      return undefined;
    }

    const nickname = this.config.personalNickname?.trim();
    return nickname
      ? `Baru muncul, ${nickname}. Aku kira kamu sibuk.`
      : "Baru muncul. Aku kira kamu sibuk.";
  }

  private resolveContextualReply(context: PartnerBehaviorContext): string | undefined {
    if (!this.config.contextReactionEnabled) {
      return undefined;
    }

    const lowerMessage = context.userMessage.toLowerCase().trim();

    if (/^(aku|gue|saya)?\s*(capek|lelah|cape|ngantuk)\.?$/i.test(lowerMessage)) {
      return "Sini dulu. Hari ini berat ya?";
    }

    if (/^(aku|gue|saya)?\s*(pusing|sakit)\.?$/i.test(lowerMessage)) {
      return "Aduh. Rebahan dulu sebentar, ya?";
    }

    if (/^(aku|gue|saya)?\s*(bingung|stres|stress)\.?$/i.test(lowerMessage)) {
      return "Sini, pelan-pelan. Bingung bagian mana?";
    }

    return undefined;
  }

  private resolveTimeGreetingReply(context: PartnerBehaviorContext): string | undefined {
    if (!this.config.timeGreetingEnabled) {
      return undefined;
    }

    const lowerMessage = context.userMessage.toLowerCase().trim();

    if (/^(pagi|selamat pagi)\b/.test(lowerMessage)) {
      return "Pagi. Tidurnya cukup?";
    }

    if (/^(malam|selamat malam|met malam)\b/.test(lowerMessage)) {
      return "Malam. Belum tidur?";
    }

    if (/^(siang|selamat siang)\b/.test(lowerMessage)) {
      return "Siang. Lagi istirahat?";
    }

    if (/^(sore|selamat sore)\b/.test(lowerMessage)) {
      return "Sore. Hari ini aman?";
    }

    return undefined;
  }

  private countRecentBotQuestions(chatHistory: { sender: string; content: string }[]): number {
    return chatHistory
      .filter((history) => history.sender === "bot")
      .slice(-4)
      .filter((history) => history.content.includes("?"))
      .length;
  }

  private isLightGreeting(message: string): boolean {
    return /^(hai|halo|p|pagi|siang|sore|malam|selamat pagi|selamat siang|selamat sore|selamat malam)\b/i.test(message.trim());
  }

  private isTimeGreeting(message: string): boolean {
    return /^(pagi|siang|sore|malam|selamat pagi|selamat siang|selamat sore|selamat malam|met malam)\b/i.test(message.trim());
  }

  private isTiredOrUnwellMessage(message: string): boolean {
    return /\b(capek|cape|lelah|ngantuk|pusing|sakit|stres|stress|bingung)\b/i.test(message);
  }

  private getAbsenceHours(context: PartnerBehaviorContext): number {
    if (!context.previousUserMessageAt) {
      return 0;
    }

    const now = context.now ?? new Date();
    return (now.getTime() - context.previousUserMessageAt.getTime()) / (60 * 60 * 1000);
  }

  private resolveLongAbsenceHours(): number {
    return Number.isFinite(this.config.longAbsenceHours) && this.config.longAbsenceHours > 0
      ? this.config.longAbsenceHours
      : 8;
  }
}
