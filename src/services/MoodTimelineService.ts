import { User } from "@prisma/client";
import { prisma } from "../infrastructure/database/prisma.client";
import { ScenarioType } from "./AgenticPromptRouter";

export interface MoodTimelineRecordInput {
  user: User;
  scenario: ScenarioType;
  userMessage: string;
}

export interface MoodTimelineSnapshot {
  mood: string;
  scenario: string | null;
  energyLevel: number;
  trustLevel: number;
  tensionLevel: number;
  intimacyLevel: number;
  userMessagePreview: string | null;
  createdAt: Date;
}

export class MoodTimelineService {
  async record(input: MoodTimelineRecordInput): Promise<void> {
    await prisma.moodTimelineEntry.create({
      data: {
        userId: input.user.id,
        mood: input.user.mood,
        scenario: input.scenario,
        energyLevel: input.user.energyLevel,
        trustLevel: input.user.trustLevel,
        tensionLevel: input.user.tensionLevel,
        intimacyLevel: input.user.intimacyLevel,
        userMessagePreview: this.toPreview(input.userMessage),
      },
    });
  }

  async getRecentEntries(userId: string, limit: number = 7): Promise<MoodTimelineSnapshot[]> {
    const entries = await prisma.moodTimelineEntry.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: this.normalizeLimit(limit),
    });

    return entries.map((entry) => ({
      mood: entry.mood,
      scenario: entry.scenario,
      energyLevel: entry.energyLevel,
      trustLevel: entry.trustLevel,
      tensionLevel: entry.tensionLevel,
      intimacyLevel: entry.intimacyLevel,
      userMessagePreview: entry.userMessagePreview,
      createdAt: entry.createdAt,
    }));
  }

  async buildPromptDirective(userId: string, isOwner: boolean): Promise<string | undefined> {
    if (!isOwner) {
      return undefined;
    }

    const entries = await this.getRecentEntries(userId, 8);
    if (entries.length < 3) {
      return undefined;
    }

    const dominantMood = this.resolveDominantMood(entries);
    const latest = entries[0];
    const older = entries[entries.length - 1];
    const energyTrend = this.describeTrend(latest.energyLevel - older.energyLevel, "energi");
    const tensionTrend = this.describeTrend(latest.tensionLevel - older.tensionLevel, "tension");

    return [
      `Mood timeline owner belakangan dominan "${dominantMood}".`,
      energyTrend,
      tensionTrend,
      "Gunakan sebagai konteks halus saja; jangan menyebut angka, timeline, atau terlihat seperti membaca database.",
    ].filter(Boolean).join(" ");
  }

  formatEntriesForOwner(entries: MoodTimelineSnapshot[]): string {
    if (entries.length === 0) {
      return "Belum ada timeline mood yang tersimpan.";
    }

    return entries
      .map((entry) => {
        const timestamp = new Intl.DateTimeFormat("id-ID", {
          dateStyle: "short",
          timeStyle: "short",
          timeZone: "Asia/Jakarta",
        }).format(entry.createdAt);
        const scenario = entry.scenario ? `/${entry.scenario.toLowerCase()}` : "";
        const preview = entry.userMessagePreview ? ` - "${entry.userMessagePreview}"` : "";

        return `${timestamp}: ${entry.mood}${scenario} | energy ${entry.energyLevel}, tension ${entry.tensionLevel}${preview}`;
      })
      .join("\n");
  }

  private resolveDominantMood(entries: MoodTimelineSnapshot[]): string {
    const counts = new Map<string, number>();
    for (const entry of entries) {
      counts.set(entry.mood, (counts.get(entry.mood) ?? 0) + 1);
    }

    return [...counts.entries()].sort((first, second) => second[1] - first[1])[0]?.[0] ?? "netral";
  }

  private describeTrend(delta: number, label: string): string | undefined {
    if (Math.abs(delta) < 8) {
      return undefined;
    }

    return delta > 0
      ? `${label} terlihat naik dibanding beberapa chat lalu.`
      : `${label} terlihat turun dibanding beberapa chat lalu.`;
  }

  private toPreview(message: string): string | undefined {
    const normalized = message.replace(/\s+/g, " ").trim();
    if (!normalized) {
      return undefined;
    }

    return normalized.length <= 120 ? normalized : `${normalized.slice(0, 117).trimEnd()}...`;
  }

  private normalizeLimit(limit: number): number {
    if (!Number.isFinite(limit) || limit < 1) {
      return 7;
    }

    return Math.min(30, Math.floor(limit));
  }
}
