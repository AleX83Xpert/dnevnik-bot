-- AlterTable
ALTER TABLE "TelegramUser" ALTER COLUMN "dnevnikAccessToken" DROP NOT NULL,
ALTER COLUMN "dnevnikAccessToken" DROP DEFAULT,
ALTER COLUMN "dnevnikRefreshToken" DROP NOT NULL,
ALTER COLUMN "dnevnikRefreshToken" DROP DEFAULT;
