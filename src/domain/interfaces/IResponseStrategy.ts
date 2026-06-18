import { User } from "@prisma/client";
import { MemorySnapshot } from "../../services/MemoryManager";

export interface IResponseStrategy {
  execute(
    userMessage: string,
    chatHistory: { sender: string; content: string }[],
    userProfile: User,
    memorySnapshot?: MemorySnapshot,
    pacingInstruction?: string,
    megumiMoodInstruction?: string
  ): Promise<string>;
}
