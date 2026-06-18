import { ScenarioType } from "../../services/AgenticPromptRouter";

export class RelationshipBoundaryPolicy {
  enforceScenario(scenario: ScenarioType, isOwner: boolean): ScenarioType {
    if (isOwner || scenario !== "ROMANTIC") {
      return scenario;
    }

    return "PLAYFUL";
  }

  enforceIntimacyAdjustment(intimacyAdjustment: number, isOwner: boolean): number {
    if (isOwner) {
      return intimacyAdjustment;
    }

    return Math.min(intimacyAdjustment, 0);
  }

  fallbackReply(isOwner: boolean): string {
    if (isOwner) {
      return "Maaf sayang, kepalaku lagi agak pusing sebentar... Nanti chat aku lagi ya?";
    }

    return "Maaf, kepalaku lagi agak pusing sebentar... Nanti chat aku lagi ya?";
  }
}
