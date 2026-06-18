export class MemoryPrivacyPolicy {
  private readonly publicMemoryTypes = new Set([
    "preferred_name",
    "likes",
    "dislikes",
    "hobby",
    "current_focus",
    "routine",
    "sleep_habit",
    "work_habit",
    "communication_preference",
  ]);
  private readonly privateContextPatterns = [
    "sayang",
    "kangen",
    "peluk",
    "cinta",
    "pacar",
    "pasangan",
    "suami",
    "istri",
    "romantis",
    "bermesraan",
    "manja",
  ];

  canRecord(type: string, sourceText: string, isOwner: boolean): boolean {
    if (isOwner) {
      return true;
    }

    return this.publicMemoryTypes.has(type) && !this.hasPrivateContext(sourceText);
  }

  readableTypes(isOwner: boolean): string[] | undefined {
    return isOwner ? undefined : [...this.publicMemoryTypes];
  }

  private hasPrivateContext(sourceText: string): boolean {
    const lower = sourceText.toLowerCase();
    return this.privateContextPatterns.some((pattern) => lower.includes(pattern));
  }
}
