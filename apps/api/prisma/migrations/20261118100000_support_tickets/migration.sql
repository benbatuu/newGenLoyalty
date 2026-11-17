-- Destek talepleri (additive — mevcut tablolara dokunmaz)
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "tenantId" TEXT,
    "requesterName" TEXT NOT NULL,
    "requesterEmail" TEXT NOT NULL,
    "cafe" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorType" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportAttachment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportAttachment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupportTicket_code_key" ON "SupportTicket"("code");
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");
CREATE INDEX "SupportTicket_requesterEmail_idx" ON "SupportTicket"("requesterEmail");
CREATE INDEX "SupportTicket_tenantId_idx" ON "SupportTicket"("tenantId");
CREATE INDEX "SupportTicket_createdAt_idx" ON "SupportTicket"("createdAt");
CREATE INDEX "SupportMessage_ticketId_createdAt_idx" ON "SupportMessage"("ticketId", "createdAt");
CREATE INDEX "SupportAttachment_messageId_idx" ON "SupportAttachment"("messageId");

ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportAttachment" ADD CONSTRAINT "SupportAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "SupportMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
