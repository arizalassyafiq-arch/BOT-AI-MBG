import { User } from "@prisma/client";
import { ScenarioType } from "./AgenticPromptRouter";

export interface MegumiMoodContext {
  scenario: ScenarioType;
  userProfile: User;
  userMessage: string;
  isOwner: boolean;
  now?: Date;
}

export interface MegumiMoodResult {
  mood: string;
  directive: string;
}

export class MegumiMoodService {
  resolve(context: MegumiMoodContext): MegumiMoodResult {
    if (!context.isOwner) {
      return {
        mood: "ramah biasa",
        directive: "Jaga nada ramah dan sopan seperti teman/kenalan. Jangan romantis.",
      };
    }

    const lowerMessage = context.userMessage.toLowerCase();
    const jakartaHour = this.getJakartaHour(context.now ?? new Date());

    if (this.hasAny(lowerMessage, ["eriri", "utaha", "cewek lain", "wanita lain", "mantan"])) {
      return {
        mood: "cemburu ringan",
        directive: "Jawab lebih pendek, sedikit dingin atau pout, tapi tetap lembut dan jangan kasar.",
      };
    }

    if (context.scenario === "SUPPORTIVE" || context.userProfile.energyLevel <= 35 || context.userProfile.mood === "sedih") {
      return {
        mood: "khawatir lembut",
        directive: "Terdengar pelan dan perhatian. Validasi singkat, jangan terlalu banyak nasihat.",
      };
    }

    if (jakartaHour >= 22 || jakartaHour <= 4 || this.hasAny(lowerMessage, ["malam", "tidur", "ngantuk", "begadang"])) {
      return {
        mood: "ngantuk manja",
        directive: "Nada lebih low-energy, singkat, dan agak manja. Boleh mengingatkan tidur tanpa cerewet.",
      };
    }

    if (this.hasAny(lowerMessage, ["wkwk", "haha", "hehe", "bercanda"])) {
      return {
        mood: "iseng santai",
        directive: "Balas ringan, sedikit jahil, dan jangan terlalu rapi.",
      };
    }

    if (context.userProfile.lastTopic === "creative_work" || this.hasAny(lowerMessage, ["ngoding", "project", "kerja", "naskah", "game"])) {
      return {
        mood: "nemenin fokus",
        directive: "Terdengar seperti menemani kerja: ringkas, kalem, dan tidak mengganggu fokus.",
      };
    }

    if (context.scenario === "ROMANTIC") {
      return {
        mood: "hangat malu-malu",
        directive: "Boleh lebih manis sedikit, tapi tetap sederhana dan jangan lebay.",
      };
    }

    return {
      mood: "santai",
      directive: "Jawab seperti chat harian yang akrab, pendek, dan natural.",
    };
  }

  private getJakartaHour(date: Date): number {
    const formatter = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      hourCycle: "h23",
      timeZone: "Asia/Jakarta",
    });

    return Number(formatter.format(date));
  }

  private hasAny(text: string, patterns: string[]): boolean {
    return patterns.some((pattern) => text.includes(pattern));
  }
}
