import { createHash, timingSafeEqual } from "crypto";

export class OwnerVerificationPolicy {
  constructor(private readonly configuredCode?: string) {}

  isConfigured(): boolean {
    return Boolean(this.configuredCode);
  }

  isValid(providedCode: string | undefined): boolean {
    if (!this.configuredCode || !providedCode) {
      return false;
    }

    const expected = Buffer.from(this.configuredCode);
    const provided = Buffer.from(providedCode);

    return expected.length === provided.length && timingSafeEqual(expected, provided);
  }

  codeHash(): string {
    if (!this.configuredCode) {
      throw new Error("Owner verification code is not configured");
    }

    return createHash("sha256").update(this.configuredCode).digest("hex");
  }
}
