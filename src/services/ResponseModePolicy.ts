import { ScenarioType } from "./AgenticPromptRouter";

export type ResponseMode = "auto" | "romantic" | "comfort" | "daily" | "jealous" | "silent";

export class ResponseModePolicy {
  private readonly supportedModes: ResponseMode[] = ["auto", "romantic", "comfort", "daily", "jealous", "silent"];

  isSupported(mode: string): mode is ResponseMode {
    return this.supportedModes.includes(mode as ResponseMode);
  }

  listSupportedModes(): ResponseMode[] {
    return [...this.supportedModes];
  }

  resolveScenario(mode: string, routedScenario: ScenarioType): ScenarioType {
    switch (mode) {
      case "romantic":
        return "ROMANTIC";
      case "comfort":
        return "SUPPORTIVE";
      case "daily":
      case "jealous":
      case "silent":
        return "PLAYFUL";
      case "auto":
      default:
        return routedScenario;
    }
  }
}
