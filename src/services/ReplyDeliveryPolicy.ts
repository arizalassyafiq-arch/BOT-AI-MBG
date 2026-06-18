export class ReplyDeliveryPolicy {
  constructor(private readonly quoteReplyProbability: number) {}

  shouldQuoteReply(hasQuotedMessage: boolean): boolean {
    if (!hasQuotedMessage) {
      return false;
    }

    return Math.random() < this.normalizedProbability();
  }

  private normalizedProbability(): number {
    if (!Number.isFinite(this.quoteReplyProbability)) {
      return 0;
    }

    return Math.max(0, Math.min(1, this.quoteReplyProbability));
  }
}
