import { User } from "@prisma/client";
import { OpenAI } from "openai";
import { AppConfig } from "../../config/AppConfig";
import { IResponseStrategy } from "../interfaces/IResponseStrategy";
import { PersonaPromptBuilder, ScenarioPrompt } from "../prompts/PersonaPromptBuilder";
import { MemorySnapshot } from "../../services/MemoryManager";

export abstract class BaseResponseStrategy implements IResponseStrategy {
  protected abstract readonly scenarioPrompt: ScenarioPrompt;

  constructor(private readonly openai: OpenAI) {}

  async execute(
    userMessage: string,
    chatHistory: { sender: string; content: string }[],
    userProfile: User,
    memorySnapshot?: MemorySnapshot,
    pacingInstruction?: string,
    megumiMoodInstruction?: string
  ): Promise<string> {
    const config = AppConfig.load();
    const promptBuilder = new PersonaPromptBuilder(config);
    const systemPrompt = promptBuilder.build(
      userProfile,
      this.scenarioPrompt,
      memorySnapshot,
      pacingInstruction,
      megumiMoodInstruction
    );

    const messages = [
      { role: "system", content: systemPrompt },
      ...chatHistory.map((history) => ({
        role: history.sender === "user" ? "user" : "assistant",
        content: history.content,
      })),
    ];

    const response = await this.openai.chat.completions.create({
      model: config.responseModel,
      messages: messages as any,
      temperature: config.responseTemperature,
      max_tokens: config.maxResponseTokens,
    });

    return response.choices[0].message.content || "";
  }
}
