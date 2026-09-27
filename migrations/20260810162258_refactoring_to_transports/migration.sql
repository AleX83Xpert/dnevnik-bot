-- Rename table TelegramUser → MessengerUser (preserves all data)
ALTER TABLE "TelegramUser" RENAME TO "MessengerUser";

-- Add platform column (default 'telegram' for existing rows)
ALTER TABLE "MessengerUser" ADD COLUMN "platform" TEXT NOT NULL DEFAULT 'telegram';

-- Rename telegramId column to platformUserId
ALTER TABLE "MessengerUser" RENAME COLUMN "telegramId" TO "platformUserId";

-- Drop old unique index on telegramId
DROP INDEX IF EXISTS "TelegramUser_telegramId_key";

-- Add indexes for new columns
CREATE INDEX "MessengerUser_platform_idx" ON "MessengerUser"("platform");
CREATE INDEX "MessengerUser_platformUserId_idx" ON "MessengerUser"("platformUserId");

-- Rename existing indexes to match new table name
ALTER INDEX IF EXISTS "TelegramUser_dnevnikAccessTokenExpirationDate_idx" RENAME TO "MessengerUser_dnevnikAccessTokenExpirationDate_idx";
ALTER INDEX IF EXISTS "TelegramUser_dnevnikTokensUpdatedAt_idx" RENAME TO "MessengerUser_dnevnikTokensUpdatedAt_idx";

-- Rename primary key constraint
ALTER INDEX IF EXISTS "TelegramUser_pkey" RENAME TO "MessengerUser_pkey";
