import { IResponseStrategy } from "../interfaces/IResponseStrategy";
import { ScenarioType } from "../../services/AgenticPromptRouter";
import { RomanticStrategy } from "./RomanticStrategy";
import { SupportiveStrategy } from "./SupportiveStrategy";
import { DeepTalkStrategy } from "./DeepTalkStrategy";
import { PlayfulStrategy } from "./PlayfulStrategy";
import { OpenAI } from "openai";

export class ResponseStrategyFactory {
  static create(scenario: ScenarioType, openai: OpenAI): IResponseStrategy {
    switch (scenario) {
      case "ROMANTIC":
        return new RomanticStrategy(openai);
      case "SUPPORTIVE":
        return new SupportiveStrategy(openai);
      case "DEEPTALK":
        return new DeepTalkStrategy(openai);
      case "PLAYFUL":
      default:
        return new PlayfulStrategy(openai);
    }
  }
}
