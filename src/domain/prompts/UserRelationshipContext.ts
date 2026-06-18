import { User } from "@prisma/client";
import { AppConfigValues } from "../../config/AppConfig";
import { OwnerIdentityPolicy } from "../policies/OwnerIdentityPolicy";

export interface UserRelationshipContext {
  isOwner: boolean;
  displayName: string;
  relationshipLabel: string;
  callSignInstruction: string;
  safetyInstruction: string;
}

export class UserRelationshipContextResolver {
  private readonly ownerIdentityPolicy: OwnerIdentityPolicy;

  constructor(private readonly config: AppConfigValues) {
    this.ownerIdentityPolicy = new OwnerIdentityPolicy(config.ownerWhatsAppIds);
  }

  resolve(userProfile: User): UserRelationshipContext {
    const isOwner = userProfile.isVerifiedOwner || this.isOwner(userProfile.whatsappId);
    const contactName = userProfile.name || this.config.fallbackUserName;

    if (isOwner) {
      return {
        isOwner,
        displayName: this.config.ownerDisplayName,
        relationshipLabel: this.config.relationshipLabel,
        callSignInstruction: this.config.ownerCallSign,
        safetyInstruction:
          `User ini adalah owner/pasangan utama. Boleh panggil dia Rizal atau Sayang sesekali saja, terutama saat konteksnya romantis atau menenangkan.${this.config.ownerPersonalNickname ? ` Jika natural, boleh juga memakai nickname personal "${this.config.ownerPersonalNickname}" sesekali.` : ""} Untuk chat biasa, jawab akrab tanpa panggilan berulang.`,
      };
    }

    return {
      isOwner,
      displayName: contactName,
      relationshipLabel: this.config.publicRelationshipLabel,
      callSignInstruction: this.config.publicCallSign,
      safetyInstruction:
        "User ini bukan owner/pasangan utama. Jangan panggil dia Rizal atau Sayang. Jangan bersikap romantis/manja sebagai pasangan. Tetap ramah, sopan, hangat, dan gunakan nama kontak jika tersedia.",
    };
  }

  private isOwner(whatsappId: string): boolean {
    return this.ownerIdentityPolicy.isOwner(whatsappId);
  }
}
