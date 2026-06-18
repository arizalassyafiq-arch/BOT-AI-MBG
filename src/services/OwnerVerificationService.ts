import { Prisma } from "@prisma/client";
import { AppConfigValues } from "../config/AppConfig";
import { OwnerIdentityPolicy } from "../domain/policies/OwnerIdentityPolicy";
import { OwnerVerificationPolicy } from "../domain/policies/OwnerVerificationPolicy";
import { prisma } from "../infrastructure/database/prisma.client";

export type OwnerVerificationStatus = "verified" | "already_owner" | "not_configured" | "invalid_code" | "already_used";

export interface OwnerVerificationResult {
  status: OwnerVerificationStatus;
}

export class OwnerVerificationService {
  async listVerifiedOwnerIds(): Promise<string[]> {
    const owners = await prisma.verifiedOwner.findMany({
      select: { whatsappId: true },
    });

    return owners.map((owner) => owner.whatsappId);
  }

  async isOwner(whatsappId: string, config: AppConfigValues): Promise<boolean> {
    const configuredOwnerPolicy = new OwnerIdentityPolicy(config.ownerWhatsAppIds);
    if (configuredOwnerPolicy.isOwner(whatsappId)) {
      return true;
    }

    const user = await prisma.user.findUnique({
      where: { whatsappId },
      select: { isVerifiedOwner: true },
    });

    if (user?.isVerifiedOwner) {
      return true;
    }

    const verifiedOwner = await prisma.verifiedOwner.findUnique({
      where: { whatsappId },
      select: { whatsappId: true },
    });

    return Boolean(verifiedOwner);
  }

  async claimOwner(config: AppConfigValues, whatsappId: string, providedCode: string | undefined): Promise<OwnerVerificationResult> {
    if (await this.isOwner(whatsappId, config)) {
      return { status: "already_owner" };
    }

    const verificationPolicy = new OwnerVerificationPolicy(config.ownerVerifyCode);
    if (!verificationPolicy.isConfigured()) {
      return { status: "not_configured" };
    }

    if (!verificationPolicy.isValid(providedCode)) {
      return { status: "invalid_code" };
    }

    const codeHash = verificationPolicy.codeHash();
    const existingClaim = await prisma.ownerVerificationClaim.findUnique({
      where: { codeHash },
      select: { codeHash: true },
    });

    if (existingClaim) {
      return { status: "already_used" };
    }

    try {
      await prisma.$transaction([
        prisma.ownerVerificationClaim.create({
          data: {
            codeHash,
            claimedByWhatsappId: whatsappId,
          },
        }),
        prisma.verifiedOwner.upsert({
          where: { whatsappId },
          create: {
            whatsappId,
            source: "verify_code",
          },
          update: {
            source: "verify_code",
          },
        }),
        prisma.user.update({
          where: { whatsappId },
          data: { isVerifiedOwner: true },
        }),
      ]);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        return { status: "already_used" };
      }

      throw error;
    }

    return { status: "verified" };
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
  }
}
