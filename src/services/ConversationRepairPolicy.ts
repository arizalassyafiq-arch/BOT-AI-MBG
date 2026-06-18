export interface ConversationRepairContext {
  userMessage: string;
  isOwner: boolean;
}

export interface ConversationRepairResult {
  directReply?: string;
  promptDirective?: string;
}

export class ConversationRepairPolicy {
  resolve(context: ConversationRepairContext): ConversationRepairResult {
    const lowerMessage = context.userMessage.toLowerCase();

    if (!this.isUserCorrectingBot(lowerMessage)) {
      return {};
    }

    const directReply = this.resolveDirectReply(lowerMessage, context.isOwner);
    if (directReply) {
      return { directReply };
    }

    return {
      promptDirective: [
        "User sedang mengoreksi karena kamu belum menjawab inti pertanyaannya.",
        "Akui singkat dengan nada natural, lalu jawab pertanyaan yang dimaksud.",
        "Jangan defensif, jangan tertawa template, dan jangan langsung melempar pertanyaan balik.",
      ].join(" "),
    };
  }

  private isUserCorrectingBot(lowerMessage: string): boolean {
    return [
      "kan saya yang nanya",
      "kan aku yang nanya",
      "aku yang nanya",
      "saya yang nanya",
      "jawab dulu",
      "kok malah nanya balik",
      "kenapa nanya balik",
      "bukan itu maksudku",
      "maksudku",
    ].some((pattern) => lowerMessage.includes(pattern));
  }

  private resolveDirectReply(lowerMessage: string, isOwner: boolean): string | undefined {
    if (/\b(belum tidur|tidur malam|kenapa belum tidur|nggak tidur|gak tidur)\b/i.test(lowerMessage)) {
      return isOwner
        ? "Iya, maaf. Aku belum tidur karena masih pengen ngobrol sama kamu sebentar."
        : "Iya, maaf. Aku belum tidur karena masih pengen ngobrol sebentar.";
    }

    return undefined;
  }
}
