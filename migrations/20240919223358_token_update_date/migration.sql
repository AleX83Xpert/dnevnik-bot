-- AlterTable
ALTER TABLE "TelegramUser" ADD COLUMN     "dnevnikTokensUpdatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "TelegramUser_dnevnikTokensUpdatedAt_idx" ON "TelegramUser"("dnevnikTokensUpdatedAt");

