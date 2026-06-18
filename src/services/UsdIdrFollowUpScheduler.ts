import { UsdIdrExchangeRateService, UsdIdrRateSnapshot } from "./UsdIdrExchangeRateService";

export interface UsdIdrFollowUpSchedulerOptions {
  enabled: boolean;
  intervalMinutes: number;
  notifyOnStartup: boolean;
  recipients: string[];
  rateService: UsdIdrExchangeRateService;
  sendMessage: (to: string, content: string) => Promise<void>;
}

export class UsdIdrFollowUpScheduler {
  private timer?: NodeJS.Timeout;

  constructor(private readonly options: UsdIdrFollowUpSchedulerOptions) {}

  start(): void {
    if (!this.options.enabled) {
      console.log("[UsdIdrFollowUp] Scheduler nonaktif.");
      return;
    }

    if (this.options.recipients.length === 0) {
      console.warn("[UsdIdrFollowUp] Tidak ada penerima. Isi BOT_OWNER_WHATSAPP_IDS atau BOT_USD_IDR_FOLLOW_UP_RECIPIENTS.");
      return;
    }

    if (this.timer) {
      return;
    }

    if (this.options.notifyOnStartup) {
      void this.sendUpdate();
    }

    this.timer = setInterval(
      () => void this.sendUpdate(),
      this.resolveIntervalMs()
    );
    console.log(`[UsdIdrFollowUp] Aktif tiap ${this.resolveIntervalMinutes()} menit.`);
  }

  stop(): void {
    if (!this.timer) {
      return;
    }

    clearInterval(this.timer);
    this.timer = undefined;
  }

  private async sendUpdate(): Promise<void> {
    try {
      const snapshot = await this.options.rateService.getCurrentRate();
      const message = this.formatMessage(snapshot);

      await Promise.all(
        this.options.recipients.map((recipient) => this.options.sendMessage(recipient, message))
      );
      console.log(`[UsdIdrFollowUp] Update terkirim ke ${this.options.recipients.length} penerima.`);
    } catch (error) {
      console.warn("[UsdIdrFollowUp] Gagal mengambil/mengirim update kurs:", error);
    }
  }

  private formatMessage(snapshot: UsdIdrRateSnapshot): string {
    const rate = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 2,
    }).format(snapshot.rate);
    const fetchedAt = new Intl.DateTimeFormat("id-ID", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "Asia/Jakarta",
    }).format(snapshot.fetchedAt);
    const nextUpdate = snapshot.timeNextUpdateUtc
      ? `\nUpdate data berikutnya: ${snapshot.timeNextUpdateUtc}`
      : "";

    return [
      `Update kurs USD/IDR: 1 ${snapshot.baseCode} sekitar ${rate}.`,
      `Dicek: ${fetchedAt} WIB.${nextUpdate}`,
      `Sumber: ${snapshot.provider}`,
    ].join("\n");
  }

  private resolveIntervalMs(): number {
    return this.resolveIntervalMinutes() * 60 * 1000;
  }

  private resolveIntervalMinutes(): number {
    if (!Number.isFinite(this.options.intervalMinutes) || this.options.intervalMinutes < 1) {
      return 60;
    }

    return this.options.intervalMinutes;
  }
}
