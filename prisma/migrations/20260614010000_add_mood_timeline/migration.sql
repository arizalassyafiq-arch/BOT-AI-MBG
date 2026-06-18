CREATE TABLE "MoodTimelineEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "mood" TEXT NOT NULL,
    "scenario" TEXT,
    "energyLevel" INTEGER NOT NULL,
    "trustLevel" INTEGER NOT NULL,
    "tensionLevel" INTEGER NOT NULL,
    "intimacyLevel" INTEGER NOT NULL,
    "userMessagePreview" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MoodTimelineEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "MoodTimelineEntry_userId_createdAt_idx" ON "MoodTimelineEntry"("userId", "createdAt");
CREATE INDEX "MoodTimelineEntry_userId_mood_idx" ON "MoodTimelineEntry"("userId", "mood");
