interface QueueState<TMessage> {
  messages: TMessage[];
  timer?: NodeJS.Timeout;
  chain: Promise<void>;
}

export class ChatMessageQueue<TMessage extends { from: string; body?: string }> {
  private readonly queues = new Map<string, QueueState<TMessage>>();

  constructor(private readonly debounceMs: number) {}

  enqueue(message: TMessage, handler: (messages: TMessage[]) => Promise<void>): void {
    const state = this.getOrCreateState(message.from);
    state.messages.push(message);

    if (state.timer) {
      clearTimeout(state.timer);
    }

    state.timer = setTimeout(() => {
      this.flush(message.from, handler);
    }, this.debounceMs);
  }

  private flush(senderId: string, handler: (messages: TMessage[]) => Promise<void>): void {
    const state = this.queues.get(senderId);
    if (!state || state.messages.length === 0) {
      return;
    }

    const batch = [...state.messages];
    state.messages = [];
    state.timer = undefined;

    const nextTask = state.chain
      .catch((error) => {
        console.error(`[ChatMessageQueue] Proses sebelumnya gagal untuk ${senderId}:`, error);
      })
      .then(async () => {
        await handler(batch);
      })
      .catch((error) => {
        console.error(`[ChatMessageQueue] Gagal memproses batch untuk ${senderId}:`, error);
      })
      .finally(() => {
        const latestState = this.queues.get(senderId);
        if (latestState && latestState.messages.length === 0 && !latestState.timer) {
          this.queues.delete(senderId);
        }
      });

    state.chain = nextTask;
  }

  private getOrCreateState(senderId: string): QueueState<TMessage> {
    const existing = this.queues.get(senderId);
    if (existing) {
      return existing;
    }

    const state: QueueState<TMessage> = {
      messages: [],
      chain: Promise.resolve(),
    };

    this.queues.set(senderId, state);
    return state;
  }
}
