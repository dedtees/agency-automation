-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "profile" JSONB;

-- CreateTable
CREATE TABLE "SiteAudit" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "phpVersion" TEXT,
    "wpVersion" TEXT,
    "critical" INTEGER NOT NULL DEFAULT 0,
    "high" INTEGER NOT NULL DEFAULT 0,
    "report" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SiteAudit_clientId_createdAt_idx" ON "SiteAudit"("clientId", "createdAt");

-- AddForeignKey
ALTER TABLE "SiteAudit" ADD CONSTRAINT "SiteAudit_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

