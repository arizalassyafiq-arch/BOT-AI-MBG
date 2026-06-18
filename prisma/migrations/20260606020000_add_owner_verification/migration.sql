ALTER TABLE "User" ADD COLUMN "isVerifiedOwner" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "VerifiedOwner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "whatsappId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'verify_code',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "OwnerVerificationClaim" (
    "codeHash" TEXT NOT NULL PRIMARY KEY,
    "claimedByWhatsappId" TEXT NOT NULL,
    "claimedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "VerifiedOwner_whatsappId_key" ON "VerifiedOwner"("whatsappId");
