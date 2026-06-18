import { prisma } from "../infrastructure/database/prisma.client";
import { User, Message, UserMemory } from "@prisma/client";
import { AppConfig } from "../config/AppConfig";
import { MemoryPrivacyPolicy } from "../domain/policies/MemoryPrivacyPolicy";

export interface MemorySnapshot {
  facts: string[];
}

export interface FollowUpMemoryCandidate {
  type: string;
  value: string;
  updatedAt: Date;
  confidence: number;
}

interface MemoryCandidate {
  type: string;
  value: string;
  confidence: number;
}

export class MemoryManager {
  private readonly memoryPrivacyPolicy = new MemoryPrivacyPolicy();

  async getOrCreateUser(whatsappId: string, name?: string): Promise<User> {
    const config = AppConfig.load();
    let user = await prisma.user.findUnique({
      where: { whatsappId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          whatsappId,
          name: name || config.fallbackUserName,
          mood: "netral",
          intimacyLevel: config.defaultIntimacyLevel,
          trustLevel: 50,
          tensionLevel: 0,
          energyLevel: 50,
          familiarityLevel: 0,
          relationshipPhase: "stranger",
          responseMode: "auto",
        },
      });
    }

    return user;
  }

  async getChatHistory(userId: string, limit: number = 10): Promise<{ sender: string; content: string }[]> {
    const messages = await prisma.message.findMany({
      where: { userId },
      orderBy: { timestamp: "desc" },
      take: limit,
    });

    // Balik urutan agar berurutan dari pesan terlama ke terbaru
    return messages.reverse().map(msg => ({
      sender: msg.sender,
      content: msg.content,
    }));
  }

  async getLatestMessage(
    userId: string,
    sender?: string
  ): Promise<{ sender: string; content: string; timestamp: Date } | null> {
    const message = await prisma.message.findFirst({
      where: {
        userId,
        ...(sender ? { sender } : {}),
      },
      orderBy: { timestamp: "desc" },
    });

    if (!message) {
      return null;
    }

    return {
      sender: message.sender,
      content: message.content,
      timestamp: message.timestamp,
    };
  }

  async getMemorySnapshot(userId: string, limit: number, isOwner: boolean): Promise<MemorySnapshot> {
    const readableTypes = this.memoryPrivacyPolicy.readableTypes(isOwner);
    const memories = await prisma.userMemory.findMany({
      where: {
        userId,
        ...(readableTypes ? { type: { in: readableTypes } } : {}),
      },
      orderBy: [{ confidence: "desc" }, { updatedAt: "desc" }],
      take: limit,
    });

    return {
      facts: memories.map((memory) => `${memory.type}: ${memory.value}`),
    };
  }

  async getFollowUpMemoryCandidates(
    userId: string,
    isOwner: boolean,
    minAgeHours: number,
    limit: number = 8
  ): Promise<FollowUpMemoryCandidate[]> {
    const readableTypes = this.memoryPrivacyPolicy.readableTypes(isOwner);
    const followUpTypes = [
      "health_pattern",
      "current_focus",
      "work_habit",
      "sleep_habit",
      "routine",
      "communication_preference",
    ];
    const allowedTypes = readableTypes
      ? followUpTypes.filter((type) => readableTypes.includes(type))
      : followUpTypes;
    const cutoff = new Date(Date.now() - minAgeHours * 60 * 60 * 1000);

    if (allowedTypes.length === 0) {
      return [];
    }

    const memories = await prisma.userMemory.findMany({
      where: {
        userId,
        type: { in: allowedTypes },
        updatedAt: { lte: cutoff },
      },
      orderBy: [{ updatedAt: "desc" }, { confidence: "desc" }],
      take: limit,
    });

    return memories.map((memory) => ({
      type: memory.type,
      value: memory.value,
      updatedAt: memory.updatedAt,
      confidence: memory.confidence,
    }));
  }

  async addMessage(userId: string, sender: string, content: string): Promise<Message> {
    return prisma.message.create({
      data: {
        userId,
        sender,
        content,
      },
    });
  }

  async updateResponseMode(userId: string, responseMode: string): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { responseMode },
    });
  }

  async recordLongTermMemory(userId: string, text: string, isOwner: boolean): Promise<void> {
    const candidates = this.extractMemoryCandidates(text).filter((candidate) =>
      this.memoryPrivacyPolicy.canRecord(candidate.type, text, isOwner)
    );

    await Promise.all(
      candidates.map((candidate) =>
        prisma.userMemory.upsert({
          where: {
            userId_type_value: {
              userId,
              type: candidate.type,
              value: candidate.value,
            },
          },
          create: {
            userId,
            type: candidate.type,
            value: candidate.value,
            confidence: candidate.confidence,
          },
          update: {
            confidence: Math.min(100, candidate.confidence + 10),
          },
        })
      )
    );
  }

  async updateUserStats(
    userId: string,
    mood: string,
    intimacyAdjustment: number,
    latestUserMessage: string = "",
    isOwner: boolean = false
  ): Promise<User> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    let newIntimacy = user.intimacyLevel + intimacyAdjustment;
    
    // Batasi tingkat keintiman antara 1 hingga 100
    if (newIntimacy < 1) newIntimacy = 1;
    if (newIntimacy > 100) newIntimacy = 100;

    const familiarityLevel = this.clamp(
      user.familiarityLevel + 1 + (intimacyAdjustment > 0 ? 2 : 0) + (intimacyAdjustment < 0 ? -2 : 0)
    );
    const trustLevel = this.resolveTrustLevel(user.trustLevel, mood, intimacyAdjustment, latestUserMessage);
    const tensionLevel = this.resolveTensionLevel(user.tensionLevel, mood, intimacyAdjustment, latestUserMessage);
    const energyLevel = this.resolveEnergyLevel(user.energyLevel, mood, latestUserMessage);

    return prisma.user.update({
      where: { id: userId },
      data: {
        mood,
        intimacyLevel: newIntimacy,
        trustLevel,
        tensionLevel,
        energyLevel,
        familiarityLevel,
        relationshipPhase: this.resolveAllowedRelationshipPhase(
          this.resolveRelationshipPhase(familiarityLevel, newIntimacy, trustLevel, tensionLevel, mood),
          isOwner
        ),
        lastTopic: this.detectTopic(latestUserMessage, user.lastTopic),
        openLoop: this.detectOpenLoop(latestUserMessage),
        userPreferredTone: this.detectPreferredTone(latestUserMessage, user.userPreferredTone, isOwner),
      },
    });
  }

  private resolveAllowedRelationshipPhase(phase: string, isOwner: boolean): string {
    if (isOwner || !["familiar", "close"].includes(phase)) {
      return phase;
    }

    return "acquaintance";
  }

  private resolveRelationshipPhase(
    familiarityLevel: number,
    intimacyLevel: number,
    trustLevel: number,
    tensionLevel: number,
    mood: string
  ): string {
    if (mood === "marah" || intimacyLevel <= 20 || trustLevel <= 25 || tensionLevel >= 75) {
      return "strained";
    }

    if (familiarityLevel >= 75 && intimacyLevel >= 70 && trustLevel >= 70 && tensionLevel <= 30) {
      return "close";
    }

    if (familiarityLevel >= 40 && intimacyLevel >= 45) {
      return "familiar";
    }

    if (familiarityLevel >= 12) {
      return "acquaintance";
    }

    return "stranger";
  }

  private resolveTrustLevel(currentTrust: number, mood: string, intimacyAdjustment: number, text: string): number {
    const lower = text.toLowerCase();
    let adjustment = intimacyAdjustment > 0 ? 2 : 0;

    if (["jujur", "percaya", "makasih", "terima kasih", "nyaman", "cerita"].some((pattern) => lower.includes(pattern))) {
      adjustment += 2;
    }

    if (mood === "marah" || ["bohong", "benci", "diam aja", "pergi"].some((pattern) => lower.includes(pattern))) {
      adjustment -= 4;
    }

    return this.clamp(currentTrust + adjustment);
  }

  private resolveTensionLevel(currentTension: number, mood: string, intimacyAdjustment: number, text: string): number {
    const lower = text.toLowerCase();
    let adjustment = -1;

    if (mood === "marah" || intimacyAdjustment < 0) {
      adjustment += 7;
    }

    if (["kesal", "marah", "capek sama kamu", "diam", "terserah", "bodo amat"].some((pattern) => lower.includes(pattern))) {
      adjustment += 8;
    }

    if (["maaf", "makasih", "terima kasih", "aku ngerti", "gapapa"].some((pattern) => lower.includes(pattern))) {
      adjustment -= 5;
    }

    return this.clamp(currentTension + adjustment);
  }

  private resolveEnergyLevel(currentEnergy: number, mood: string, text: string): number {
    const lower = text.toLowerCase();
    let adjustment = 0;

    if (["lelah", "capek", "ngantuk", "sakit", "pusing", "stres", "stress"].some((pattern) => lower.includes(pattern))) {
      adjustment -= 12;
    }

    if (["semangat", "senang", "happy", "wkwk", "haha", "asyik"].some((pattern) => lower.includes(pattern))) {
      adjustment += 8;
    }

    if (mood === "sedih" || mood === "lelah") {
      adjustment -= 6;
    }

    return this.clamp(currentEnergy + adjustment);
  }

  private detectTopic(text: string, previousTopic: string | null): string | null {
    const lower = text.toLowerCase();
    const topicRules: Array<[string, string[]]> = [
      ["food_health", ["makan", "sarapan", "lapar", "sakit", "tidur", "istirahat", "capek"]],
      ["creative_work", ["project", "proyek", "naskah", "game", "anime", "ngoding", "kerja", "deadline"]],
      ["domestic", ["kamar", "berantakan", "rumah", "uang", "keuangan", "belanja", "tugas"]],
      ["jealousy", ["eriri", "utaha", "cewek", "wanita lain", "mantan", "karakter 2d"]],
      ["identity", ["nama", "panggil", "siapa", "tomoya"]],
      ["emotion", ["sedih", "panik", "cemas", "marah", "kesal", "takut"]],
    ];

    for (const [topic, patterns] of topicRules) {
      if (patterns.some((pattern) => lower.includes(pattern))) {
        return topic;
      }
    }

    return previousTopic;
  }

  private detectOpenLoop(text: string): string | null {
    const lower = text.toLowerCase();

    if (text.includes("?")) {
      return "user_asked_question";
    }

    if (["nanti", "besok", "ingetin", "jangan lupa", "bahas nanti"].some((pattern) => lower.includes(pattern))) {
      return "future_callback";
    }

    if (["panik", "cemas", "takut", "masalah"].some((pattern) => lower.includes(pattern))) {
      return "needs_follow_up_care";
    }

    return null;
  }

  private detectPreferredTone(text: string, previousTone: string | null, isOwner: boolean): string | null {
    const lower = text.toLowerCase();

    if (["serius", "tolong", "mohon"].some((pattern) => lower.includes(pattern))) {
      return "serious_direct";
    }

    if (["wkwk", "haha", "bercanda", "anjay"].some((pattern) => lower.includes(pattern))) {
      return "dry_playful";
    }

    if (isOwner && ["sayang", "kangen", "peluk"].some((pattern) => lower.includes(pattern))) {
      return "quiet_affectionate";
    }

    return previousTone;
  }

  private extractMemoryCandidates(text: string): MemoryCandidate[] {
    const normalized = text.trim().replace(/\s+/g, " ");
    const lower = normalized.toLowerCase();
    const candidates: MemoryCandidate[] = [];

    this.addRegexMemory(candidates, normalized, "preferred_name", /(?:panggil aku|nama aku|namaku)\s+([a-zA-Z0-9_.\- ]{2,30})/i, 90);
    this.addRegexMemory(candidates, normalized, "likes", /(?:aku|gue|saya)\s+suka\s+(.{2,80})/i, 75);
    this.addRegexMemory(candidates, normalized, "dislikes", /(?:aku|gue|saya)\s+(?:gak|nggak|tidak)\s+suka\s+(.{2,80})/i, 75);
    this.addRegexMemory(candidates, normalized, "hobby", /(?:hobi aku|hobiku|hobi saya)\s+(.{2,80})/i, 80);
    this.addRegexMemory(candidates, normalized, "current_focus", /(?:lagi|sedang)\s+(?:ngerjain|mengerjakan|garap|ngoding)\s+(.{2,80})/i, 70);
    this.addRegexMemory(candidates, normalized, "routine", /(?:biasanya|sering|tiap|setiap)\s+(.{2,80})/i, 70);
    this.addRegexMemory(candidates, normalized, "sleep_habit", /(?:aku|gue|saya)\s+(?:sering|biasanya)?\s*(?:tidur|begadang|ngantuk)\s+(.{2,80})/i, 75);
    this.addRegexMemory(candidates, normalized, "work_habit", /(?:aku|gue|saya)\s+(?:sering|biasanya)?\s*(?:ngoding|kerja|nulis|garap project|ngerjain project)\s+(.{2,80})/i, 75);
    this.addRegexMemory(candidates, normalized, "communication_preference", /(?:aku|gue|saya)\s+(?:lebih suka|sukanya)\s+(?:kalau kamu|kamu)\s+(.{2,80})/i, 80);

    if (this.hasAny(lower, ["sering pusing", "sering sakit", "sering capek", "gampang capek", "mudah capek"])) {
      candidates.push({ type: "health_pattern", value: this.resolveHealthPattern(lower), confidence: 75 });
    }

    if (this.hasAny(lower, ["ngoding malam", "coding malam", "kerja malam", "sering begadang"])) {
      candidates.push({ type: "work_habit", value: "sering aktif/kerja malam", confidence: 80 });
    }

    if (this.hasAny(lower, ["jangan terlalu panjang", "balas pendek", "jawab pendek", "jangan kaku"])) {
      candidates.push({ type: "communication_preference", value: "suka balasan pendek dan natural", confidence: 85 });
    }

    const unique = new Map<string, MemoryCandidate>();
    for (const candidate of candidates) {
      unique.set(`${candidate.type}:${candidate.value.toLowerCase()}`, candidate);
    }

    return [...unique.values()];
  }

  private addRegexMemory(
    candidates: MemoryCandidate[],
    text: string,
    type: string,
    pattern: RegExp,
    confidence: number
  ): void {
    const match = text.match(pattern);
    if (!match?.[1]) {
      return;
    }

    const value = this.cleanMemoryValue(match[1]);
    if (value) {
      candidates.push({ type, value, confidence });
    }
  }

  private cleanMemoryValue(value: string): string | null {
    const cleaned = value
      .split(/[,.!?]/)[0]
      .replace(/\b(?:banget|sih|dong|ya|kok|nih|deh)\b/gi, "")
      .trim();

    if (cleaned.length < 2 || cleaned.length > 80) {
      return null;
    }

    return cleaned;
  }

  private hasAny(text: string, patterns: string[]): boolean {
    return patterns.some((pattern) => text.includes(pattern));
  }

  private resolveHealthPattern(text: string): string {
    if (text.includes("pusing")) {
      return "sering pusing";
    }

    if (text.includes("sakit")) {
      return "sering merasa kurang sehat";
    }

    return "sering merasa capek";
  }

  private clamp(value: number): number {
    return Math.max(0, Math.min(100, value));
  }

  async getDiaryEntries(userId: string): Promise<UserMemory[]> {
    return prisma.userMemory.findMany({
      where: {
        userId,
        type: "diary",
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async addDiaryEntry(userId: string, value: string): Promise<UserMemory> {
    return prisma.userMemory.create({
      data: {
        userId,
        type: "diary",
        value,
        confidence: 100,
      },
    });
  }

  async deleteDiaryEntry(userId: string, id: number): Promise<boolean> {
    const memory = await prisma.userMemory.findFirst({
      where: {
        id,
        userId,
        type: "diary",
      },
    });

    if (!memory) {
      return false;
    }

    await prisma.userMemory.delete({
      where: { id },
    });

    return true;
  }

  async clearDiaryEntries(userId: string): Promise<void> {
    await prisma.userMemory.deleteMany({
      where: {
        userId,
        type: "diary",
      },
    });
  }
}
