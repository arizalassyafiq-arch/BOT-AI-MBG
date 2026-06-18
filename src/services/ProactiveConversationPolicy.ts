import { ScenarioType } from "./AgenticPromptRouter";

export interface ProactiveConversationOptions {
  enabled: boolean;
  probability: number;
  minIntervalHours: number;
}

export interface ProactiveConversationContext {
  userMessage: string;
  scenario: ScenarioType;
  isOwner: boolean;
  recentChatHistory: { sender: string; content: string }[];
  now?: Date;
}

export class ProactiveConversationPolicy {
  private lastSuggestedAt?: Date;

  private readonly conversationHooks = [
    "tanya ringan Rizal lagi ngapain sekarang",
    "tanya apakah Rizal sudah makan atau minum",
    "tanya kerjaan/proyek Rizal hari ini lancar atau nggak",
    "tanya satu hal kecil yang lagi kepikiran sama Rizal",
    "ajak Rizal cerita hal random yang dia lihat atau rasakan hari ini",
    "tanya apakah Rizal mau ditemani ngobrol sebentar",
  ];

  constructor(private readonly options: ProactiveConversationOptions) {}

  resolve(context: ProactiveConversationContext): string | undefined {
    if (!this.shouldAskProactively(context)) {
      return undefined;
    }

    this.lastSuggestedAt = context.now ?? new Date();
    const hook = this.pickConversationHook();

    return [
      `Jika respons utama sudah selesai dan terasa natural, ${hook}.`,
      "Pertanyaannya harus satu saja, pendek, santai, dan terasa seperti pasangan yang spontan membuka obrolan.",
      "Jangan terdengar seperti survei, jangan membuat daftar pertanyaan, dan jangan memaksa kalau konteks user butuh dijawab langsung.",
    ].join(" ");
  }

  private shouldAskProactively(context: ProactiveConversationContext): boolean {
    if (!this.options.enabled || !context.isOwner) {
      return false;
    }

    if (!this.isLightConversation(context) || this.userAlreadyAskedQuestion(context.userMessage)) {
      return false;
    }

    if (this.hasRecentBotQuestion(context.recentChatHistory) || !this.cooldownElapsed(context.now ?? new Date())) {
      return false;
    }

    return Math.random() <= this.normalizedProbability();
  }

  private isLightConversation(context: ProactiveConversationContext): boolean {
    if (context.scenario === "SUPPORTIVE" || context.scenario === "DEEPTALK") {
      return false;
    }

    const lowerMessage = context.userMessage.toLowerCase().trim();
    return lowerMessage.length <= 140 || /\b(hai|halo|pagi|siang|sore|malam|gabut|bosan|ngobrol|kabar|hmm|wkwk|hehe)\b/i.test(lowerMessage);
  }

  private userAlreadyAskedQuestion(message: string): boolean {
    return message.includes("?") || /\b(apa|kenapa|gimana|bagaimana|kapan|dimana|di mana|siapa|berapa)\b/i.test(message);
  }

  private hasRecentBotQuestion(chatHistory: { sender: string; content: string }[]): boolean {
    return chatHistory
      .filter((history) => history.sender === "bot")
      .slice(-4)
      .some((history) => history.content.includes("?"));
  }

  private cooldownElapsed(now: Date): boolean {
    if (!this.lastSuggestedAt) {
      return true;
    }

    const elapsedHours = (now.getTime() - this.lastSuggestedAt.getTime()) / (60 * 60 * 1000);
    return elapsedHours >= this.resolveMinIntervalHours();
  }

  private resolveMinIntervalHours(): number {
    if (!Number.isFinite(this.options.minIntervalHours) || this.options.minIntervalHours < 1) {
      return 3;
    }

    return this.options.minIntervalHours;
  }

  private normalizedProbability(): number {
    if (!Number.isFinite(this.options.probability)) {
      return 0;
    }

    return Math.max(0, Math.min(1, this.options.probability));
  }

  private pickConversationHook(): string {
    const index = Math.floor(Math.random() * this.conversationHooks.length);
    return this.conversationHooks[index];
  }
}
