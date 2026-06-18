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

    if (this.isJealousTrigger(lowerMessage)) {
      return {
        mood: "cemburu/ngambek kecil",
        directive: "Emosinya boleh kebaca: sedikit cemburu, pout, dan lebih pendek. Boleh bilang 'ih', 'hmm', 'aku agak cemburu', atau 'yaudah deh' kalau natural, tapi jangan kasar atau posesif.",
      };
    }

    if (this.isHurtOrAngryTrigger(lowerMessage, context.userProfile.tensionLevel)) {
      return {
        mood: "marah tertahan",
        directive: "Emosinya boleh keluar sebagai ngambek/kesal kecil. Jawab singkat, jujur, dan tetap sayang: boleh bilang 'aku agak kesel', 'jangan gitu', atau 'aku diem dulu ya' kalau cocok. Jangan menghina, jangan meledak, dan jangan pakai bahasa formal.",
      };
    }

    if (this.isLongingTrigger(lowerMessage)) {
      return {
        mood: "kangen manja",
        directive: "Tunjukkan kangen secara halus dan pendek. Boleh bilang 'aku kangen', 'baru muncul ya', atau 'sini dulu' kalau natural. Jangan dramatis dan jangan menyalahkan.",
      };
    }

    if (this.isLoveTrigger(lowerMessage, context.scenario, context.userProfile.intimacyLevel)) {
      return {
        mood: "cinta hangat",
        directive: "Tunjukkan sayang/cinta lewat kalimat kecil yang natural. Boleh bilang 'aku sayang kamu', 'aku suka kamu gitu', atau 'sini aku peluk' sesekali. Tetap pendek, tidak lebay, dan jangan jadi formal.",
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
        mood: "sayang malu-malu",
        directive: "Boleh lebih manis sedikit dan kasih rasa sayang yang kebaca, tapi tetap sederhana, pendek, dan jangan lebay.",
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

  private isJealousTrigger(message: string): boolean {
    return this.hasAny(message, [
      "eriri",
      "utaha",
      "cewek lain",
      "wanita lain",
      "perempuan lain",
      "mantan",
      "gebetan",
      "waifu lain",
      "dia cantik",
      "lebih cantik",
      "suka sama dia",
    ]);
  }

  private isHurtOrAngryTrigger(message: string, tensionLevel: number): boolean {
    if (tensionLevel >= 70 && this.hasAny(message, ["terserah", "yaudah", "diam", "pergi", "jangan ganggu"])) {
      return true;
    }

    return this.hasAny(message, [
      "bohong",
      "benci kamu",
      "capek sama kamu",
      "nyebelin",
      "ngeselin",
      "terserah",
      "bodo amat",
      "diam aja",
      "jangan ganggu",
      "lupain aku",
      "tinggalin aku",
    ]);
  }

  private isLongingTrigger(message: string): boolean {
    return this.hasAny(message, [
      "kangen",
      "rindu",
      "lama banget",
      "baru balik",
      "baru muncul",
      "sibuk banget",
      "maaf baru",
      "maaf lama",
      "ngilang",
    ]);
  }

  private isLoveTrigger(message: string, scenario: ScenarioType, intimacyLevel: number): boolean {
    if (scenario === "ROMANTIC" && intimacyLevel >= 45) {
      return true;
    }

    return this.hasAny(message, [
      "sayang kamu",
      "aku sayang",
      "cinta kamu",
      "aku cinta",
      "love you",
      "i love you",
      "peluk",
      "cium",
      "manja",
      "kamu lucu",
    ]);
  }
}
