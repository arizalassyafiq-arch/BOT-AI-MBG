import { ScenarioType } from "./AgenticPromptRouter";
import { HotNewsService } from "./HotNewsService";

export interface HotNewsConversationStarterOptions {
  enabled: boolean;
  probability: number;
  minIntervalHours: number;
}

export interface HotNewsConversationStarterContext {
  userMessage: string;
  scenario: ScenarioType;
  isOwner: boolean;
  recentChatHistory: { sender: string; content: string }[];
  now?: Date;
}

export class HotNewsConversationStarter {
  private lastSuggestedAt?: Date;

  constructor(
    private readonly hotNewsService: HotNewsService,
    private readonly options: HotNewsConversationStarterOptions
  ) {}

  async resolve(context: HotNewsConversationStarterContext): Promise<string | undefined> {
    if (!this.shouldConsider(context)) {
      return undefined;
    }

    try {
      const items = await this.hotNewsService.getHotItems();
      const headline = items[0];
      if (!headline) {
        return undefined;
      }

      this.lastSuggestedAt = context.now ?? new Date();
      return [
        `Jika natural, selipkan satu pertanyaan pendek ke Rizal tentang berita yang sedang panas ini: "${headline.title}".`,
        "Nada harus santai seperti chat pasangan, bukan laporan berita.",
        "Jangan sebut sumber, jangan membuat ringkasan panjang, dan jangan memaksa kalau respons utama user butuh dijawab dulu."
      ].join(" ");
    } catch (error) {
      console.warn("[HotNewsStarter] Gagal mengambil headline untuk pertanyaan ringan:", error);
      return undefined;
    }
  }

  private shouldConsider(context: HotNewsConversationStarterContext): boolean {
    if (!this.options.enabled || !context.isOwner || !this.isLightConversation(context)) {
      return false;
    }

    if (this.hasRecentBotQuestion(context.recentChatHistory) || this.hasRecentNewsMention(context.recentChatHistory)) {
      return false;
    }

    if (!this.cooldownElapsed(context.now ?? new Date())) {
      return false;
    }

    return Math.random() <= this.normalizedProbability();
  }

  private isLightConversation(context: HotNewsConversationStarterContext): boolean {
    if (context.scenario === "SUPPORTIVE" || context.scenario === "DEEPTALK") {
      return false;
    }

    const lowerMessage = context.userMessage.toLowerCase().trim();
    return lowerMessage.length <= 90 || /\b(hai|halo|pagi|siang|sore|malam|lagi apa|gabut|bosan|ngobrol|kabar)\b/i.test(lowerMessage);
  }

  private hasRecentBotQuestion(chatHistory: { sender: string; content: string }[]): boolean {
    return chatHistory
      .filter((history) => history.sender === "bot")
      .slice(-3)
      .some((history) => history.content.includes("?"));
  }

  private hasRecentNewsMention(chatHistory: { sender: string; content: string }[]): boolean {
    return chatHistory
      .slice(-8)
      .some((history) => /\b(berita|viral|panas|trending|headline|heboh)\b/i.test(history.content));
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
      return 10;
    }

    return this.options.minIntervalHours;
  }

  private normalizedProbability(): number {
    if (!Number.isFinite(this.options.probability)) {
      return 0;
    }

    return Math.max(0, Math.min(1, this.options.probability));
  }
}
