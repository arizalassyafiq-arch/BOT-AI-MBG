export interface UsdIdrRateSnapshot {
  baseCode: string;
  quoteCode: string;
  rate: number;
  provider: string;
  documentationUrl: string;
  timeLastUpdateUtc?: string;
  timeNextUpdateUtc?: string;
  fetchedAt: Date;
}

interface ExchangeRateApiResponse {
  result: string;
  provider?: string;
  documentation?: string;
  time_last_update_utc?: string;
  time_next_update_utc?: string;
  base_code?: string;
  rates?: Record<string, number>;
}

export class UsdIdrExchangeRateService {
  constructor(private readonly apiUrl: string) {}

  async getCurrentRate(): Promise<UsdIdrRateSnapshot> {
    const response = await fetch(this.apiUrl, {
      headers: {
        accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Exchange rate request failed with HTTP ${response.status}`);
    }

    const payload = (await response.json()) as ExchangeRateApiResponse;
    if (payload.result !== "success" || !payload.rates?.IDR) {
      throw new Error("Exchange rate response did not contain a valid USD/IDR rate");
    }

    return {
      baseCode: payload.base_code || "USD",
      quoteCode: "IDR",
      rate: payload.rates.IDR,
      provider: payload.provider || "ExchangeRate-API",
      documentationUrl: payload.documentation || "https://www.exchangerate-api.com/docs/free",
      timeLastUpdateUtc: payload.time_last_update_utc,
      timeNextUpdateUtc: payload.time_next_update_utc,
      fetchedAt: new Date(),
    };
  }
}
