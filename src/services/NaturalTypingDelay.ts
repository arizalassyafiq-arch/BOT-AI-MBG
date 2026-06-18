export class NaturalTypingDelay {
  constructor(
    private readonly minDelayMs: number,
    private readonly maxDelayMs: number
  ) {}

  calculate(message: string): number {
    const baseDelay = 700;
    const perCharacterDelay = 18;
    const punctuationPause = (message.match(/[,.!?]/g)?.length ?? 0) * 120;
    const calculatedDelay = baseDelay + message.length * perCharacterDelay + punctuationPause;

    return Math.max(this.minDelayMs, Math.min(this.maxDelayMs, calculatedDelay));
  }
}
