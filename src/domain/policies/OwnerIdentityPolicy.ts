export class OwnerIdentityPolicy {
  private readonly normalizedOwnerIds: Set<string>;

  constructor(ownerWhatsAppIds: string[]) {
    this.normalizedOwnerIds = new Set(
      ownerWhatsAppIds
        .map((ownerId) => this.normalize(ownerId))
        .filter((ownerId): ownerId is string => Boolean(ownerId))
    );
  }

  isOwner(whatsappId: string | null | undefined): boolean {
    const normalizedWhatsappId = this.normalize(whatsappId);
    return normalizedWhatsappId ? this.normalizedOwnerIds.has(normalizedWhatsappId) : false;
  }

  private normalize(whatsappId: string | null | undefined): string | null {
    const normalized = whatsappId?.trim().toLowerCase();
    return normalized || null;
  }
}
