import { ScenarioType } from "./AgenticPromptRouter";
import { FollowUpMemoryCandidate } from "./MemoryManager";

export interface FollowUpMemoryContext {
  candidates: FollowUpMemoryCandidate[];
  userMessage: string;
  scenario: ScenarioType;
  isOwner: boolean;
}

export class FollowUpMemoryService {
  constructor(private readonly probability: number) {}

  resolve(context: FollowUpMemoryContext): string | undefined {
    if (!context.isOwner || context.candidates.length === 0) {
      return undefined;
    }

    if (!this.isLightConversation(context.userMessage, context.scenario)) {
      return undefined;
    }

    if (Math.random() > this.normalizedProbability()) {
      return undefined;
    }

    const candidate = this.pickCandidate(context.candidates);
    return candidate ? this.buildDirective(candidate) : undefined;
  }

  private isLightConversation(userMessage: string, scenario: ScenarioType): boolean {
    if (scenario === "SUPPORTIVE" || scenario === "DEEPTALK") {
      return false;
    }

    const lowerMessage = userMessage.toLowerCase().trim();
    const lightPatterns = [
      "hai",
      "halo",
      "p",
      "malam",
      "pagi",
      "siang",
      "sore",
      "lagi apa",
      "ngobrol",
      "kabar",
      "aku baik",
      "baik",
    ];

    return lowerMessage.length <= 80 || lightPatterns.some((pattern) => lowerMessage.includes(pattern));
  }

  private pickCandidate(candidates: FollowUpMemoryCandidate[]): FollowUpMemoryCandidate | undefined {
    const priority = ["health_pattern", "current_focus", "work_habit", "sleep_habit", "routine", "communication_preference"];

    return [...candidates].sort((first, second) => {
      const firstPriority = priority.indexOf(first.type);
      const secondPriority = priority.indexOf(second.type);
      return this.normalizePriority(firstPriority) - this.normalizePriority(secondPriority);
    })[0];
  }

  private buildDirective(candidate: FollowUpMemoryCandidate): string {
    switch (candidate.type) {
      case "health_pattern":
        return `Jika natural, tanyakan follow-up singkat soal kondisi user: "${candidate.value}". Contoh rasa: "Pusingmu udah mendingan?" Jangan terdengar seperti laporan memory.`;
      case "current_focus":
        return `Jika natural, tanyakan singkat perkembangan hal yang sedang user kerjakan: "${candidate.value}". Cukup satu kalimat santai.`;
      case "work_habit":
        return `Jika natural, sentuh kebiasaan kerja user: "${candidate.value}". Jangan menggurui; cukup terasa perhatian.`;
      case "sleep_habit":
        return `Jika natural, follow-up singkat soal tidur/istirahat user: "${candidate.value}". Jangan cerewet.`;
      case "routine":
        return `Jika natural, kaitkan respons dengan rutinitas user: "${candidate.value}" secara halus.`;
      case "communication_preference":
        return `Ingat preferensi user: "${candidate.value}". Ikuti tanpa menyebut bahwa kamu mengingatnya.`;
      default:
        return `Jika natural, gunakan memory ini sebagai follow-up ringan: "${candidate.value}".`;
    }
  }

  private normalizePriority(index: number): number {
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  }

  private normalizedProbability(): number {
    if (!Number.isFinite(this.probability)) {
      return 0;
    }

    return Math.max(0, Math.min(1, this.probability));
  }
}
