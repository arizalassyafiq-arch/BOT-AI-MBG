import { ScenarioType } from "./AgenticPromptRouter";

export type PacingStyle = "SHORT_COMMENT" | "ASK_BACK" | "CASUAL_REACTION" | "DETAILED_SUPPORT";

export interface PacingResult {
  style: PacingStyle;
  promptDirective: string;
}

export class NaturalResponsePacing {
  select(scenario: ScenarioType): PacingResult {
    if (scenario === "SUPPORTIVE" || scenario === "DEEPTALK") {
      return {
        style: "DETAILED_SUPPORT",
        promptDirective: "Balas hangat tapi tetap pendek: 1-2 kalimat saja. Pakai bahasa chat biasa, jangan terlalu rapi, dan jangan mengulang nasihat yang sama.",
      };
    }

    const rand = Math.random();

    if (rand < 0.50) {
      return {
        style: "SHORT_COMMENT",
        promptDirective: "Balas sangat singkat, maksimal 10 kata, seperti chat spontan.",
      };
    } else if (rand < 0.85) {
      return {
        style: "CASUAL_REACTION",
        promptDirective: "Balas santai dalam 1 kalimat pendek. Jangan terdengar seperti template atau ceramah.",
      };
    } else if (rand < 0.97) {
      return {
        style: "ASK_BACK",
        promptDirective: "Balas 1 kalimat pendek. Kalau user bertanya, jawab dulu baru boleh tanya balik satu hal yang natural.",
      };
    } else {
      return {
        style: "DETAILED_SUPPORT",
        promptDirective: "Balas agak hangat, tapi tetap maksimal 2 kalimat pendek.",
      };
    }
  }
}
