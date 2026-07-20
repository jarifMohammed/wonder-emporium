-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('USER', 'ADMIN', 'MODERATOR', 'SUPERADMIN', 'READER', 'AUTHOR');

-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "public"."MfaMethod" AS ENUM ('totp', 'sms', 'email', 'webauthn');

-- CreateEnum
CREATE TYPE "public"."LoginAction" AS ENUM ('login', 'logout');

-- CreateEnum
CREATE TYPE "public"."EmailType" AS ENUM ('verification', 'password_reset', 'notification');

-- CreateEnum
CREATE TYPE "public"."EmailProvider" AS ENUM ('sendgrid', 'mailgun', 'ses', 'stmp');

-- CreateEnum
CREATE TYPE "public"."EmailStatus" AS ENUM ('sent', 'failed', 'pending', 'bounced', 'delivered', 'opened', 'clicked');

-- CreateEnum
CREATE TYPE "public"."EventType" AS ENUM ('create', 'update', 'delete', 'login', 'logout', 'password_change', 'profile_update');

-- CreateEnum
CREATE TYPE "public"."ActionType" AS ENUM ('create', 'update', 'delete');

-- CreateEnum
CREATE TYPE "public"."SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'TRIALING', 'INCOMPLETE', 'INCOMPLETE_EXPIRED', 'UNPAID');

-- CreateEnum
CREATE TYPE "public"."BillingInterval" AS ENUM ('DAY', 'WEEK', 'MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "public"."InvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PAID', 'VOID', 'UNCOLLECTIBLE');

-- CreateEnum
CREATE TYPE "public"."JobStatus" AS ENUM ('APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'REJECTED', 'ACCEPTED', 'DECLINED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "public"."ResponseStatus" AS ENUM ('NO_RESPONSE', 'RESPONSE_RECEIVED', 'AWAITING_RESPONSE');

-- CreateEnum
CREATE TYPE "public"."JobLocationType" AS ENUM ('REMOTE', 'HYBRID', 'ONSITE');

-- CreateEnum
CREATE TYPE "public"."AppliedVia" AS ENUM ('LINKEDIN', 'INDEED', 'COMPANY_WEBSITE', 'REFERRAL', 'RECRUITER', 'JOB_BOARD', 'CAREER_FAIR', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."InterviewType" AS ENUM ('PHONE_SCREEN', 'TECHNICAL', 'BEHAVIORAL', 'SYSTEM_DESIGN', 'ONSITE', 'PANEL', 'FINAL', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."JobPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."FollowUpStatus" AS ENUM ('PENDING', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "public"."FollowUpType" AS ENUM ('EMAIL', 'PHONE', 'LINKEDIN', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."JobTimelineEventType" AS ENUM ('APPLIED', 'RESPONSE_RECEIVED', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED', 'OFFER_RECEIVED', 'OFFER_ACCEPTED', 'OFFER_DECLINED', 'REJECTED', 'WITHDRAWN', 'FOLLOW_UP_SENT', 'NOTE_ADDED', 'STATUS_CHANGED', 'DOCUMENT_ADDED', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."JobDocumentType" AS ENUM ('RESUME', 'COVER_LETTER', 'PORTFOLIO', 'OFFER_LETTER', 'CONTRACT', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."JobSourceType" AS ENUM ('MANUAL', 'AI_URL_PARSED', 'AI_DESCRIPTION_PARSED', 'IMPORTED', 'EXTENSION');

-- CreateEnum
CREATE TYPE "public"."JobReminderType" AS ENUM ('FOLLOW_UP_DUE', 'INTERVIEW_REMINDER', 'OFFER_DEADLINE', 'APPLICATION_DEADLINE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."ReminderStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."BookStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."BookFileType" AS ENUM ('COVER', 'AUDIOBOOK', 'EBOOK', 'HARDCOVER', 'PAPERBACK', 'INTERIOR_PDF', 'COVER_PDF');

-- CreateEnum
CREATE TYPE "public"."OrderStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "public"."OutboxStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."PayoutStatus" AS ENUM ('PENDING_REQUEST', 'REQUESTED', 'APPROVED', 'PAID', 'REJECTED');

-- CreateTable
CREATE TABLE "public"."ActivityLogEvent" (
    "id" UUID NOT NULL,
    "tableName" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "action" "public"."ActionType" NOT NULL,
    "actionedBy" UUID,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "device" TEXT,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventType" "public"."EventType",

    CONSTRAINT "ActivityLogEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ActivityLogEventDetail" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "fieldName" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,

    CONSTRAINT "ActivityLogEventDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuthUser" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL DEFAULT 'USER',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "status" "public"."UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "isFoundingAuthor" BOOLEAN NOT NULL DEFAULT false,
    "tokenVersion" INTEGER NOT NULL DEFAULT 1,
    "deletedAt" TIMESTAMP(3),
    "provider" TEXT NOT NULL DEFAULT 'local',
    "providerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuthSecurity" (
    "id" UUID NOT NULL,
    "authId" UUID NOT NULL,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastFailedAt" TIMESTAMP(3),
    "lockExpiresAt" TIMESTAMP(3),
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaMethod" "public"."MfaMethod",
    "mfaSecret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastPasswordChange" TIMESTAMP(3),

    CONSTRAINT "AuthSecurity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StripeConnectedAccount" (
    "id" UUID NOT NULL,
    "authId" UUID NOT NULL,
    "stripeAccountId" TEXT NOT NULL,
    "chargesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "pendingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StripeConnectedAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Book" (
    "id" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "bookCover" TEXT,
    "isbn" TEXT,
    "category" TEXT,
    "tags" TEXT[],
    "language" TEXT,
    "ageGroup" TEXT,
    "authorEarnings" DOUBLE PRECISION,
    "publicationDetails" TEXT,
    "status" "public"."BookStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "printEdition" JSONB,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BookFile" (
    "id" UUID NOT NULL,
    "bookId" UUID NOT NULL,
    "type" "public"."BookFileType" NOT NULL,
    "url" TEXT,
    "fileKey" TEXT,
    "mimeType" TEXT,
    "size" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BookFormatPricing" (
    "id" UUID NOT NULL,
    "bookId" UUID NOT NULL,
    "formatType" TEXT NOT NULL,
    "listPrice" DOUBLE PRECISION NOT NULL,
    "sku" TEXT,
    "pageCount" INTEGER,
    "trimSize" TEXT,
    "coverUrl" TEXT,
    "interiorUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookFormatPricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LoginHistory" (
    "id" UUID NOT NULL,
    "authId" UUID NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "device_id" TEXT,
    "geo_country" TEXT,
    "geo_city" TEXT,
    "action" "public"."LoginAction" NOT NULL,
    "success" BOOLEAN NOT NULL,
    "failureReason" TEXT,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "isSuspicious" BOOLEAN NOT NULL DEFAULT false,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmailHistory" (
    "id" UUID NOT NULL,
    "authId" UUID NOT NULL,
    "emailTo" TEXT NOT NULL,
    "emailType" "public"."EmailType" NOT NULL,
    "subject" TEXT NOT NULL,
    "emailProvider" "public"."EmailProvider",
    "messageId" TEXT NOT NULL,
    "emailStatus" "public"."EmailStatus" NOT NULL,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Job" (
    "id" UUID NOT NULL,
    "authId" UUID NOT NULL,
    "company" TEXT NOT NULL,
    "companyUrl" TEXT,
    "companyLinkedin" TEXT,
    "companyFacebook" TEXT,
    "companyTwitter" TEXT,
    "companyLogo" TEXT,
    "role" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "locationType" "public"."JobLocationType" NOT NULL DEFAULT 'REMOTE',
    "salaryDisplay" TEXT,
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "salaryCurrency" TEXT NOT NULL DEFAULT 'USD',
    "contactPerson" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "appliedDate" TIMESTAMP(3) NOT NULL,
    "appliedVia" "public"."AppliedVia" NOT NULL,
    "jobPostingUrl" TEXT,
    "status" "public"."JobStatus" NOT NULL DEFAULT 'APPLIED',
    "responseStatus" "public"."ResponseStatus" NOT NULL DEFAULT 'NO_RESPONSE',
    "responseDate" TIMESTAMP(3),
    "techStack" TEXT[],
    "jobDescription" TEXT,
    "requirements" TEXT,
    "responsibilities" TEXT,
    "benefits" TEXT,
    "interviewScheduled" BOOLEAN NOT NULL DEFAULT false,
    "interviewDate" TIMESTAMP(3),
    "interviewType" "public"."InterviewType",
    "interviewRound" INTEGER,
    "interviewLocation" TEXT,
    "interviewNotes" TEXT,
    "priority" "public"."JobPriority" NOT NULL DEFAULT 'MEDIUM',
    "tags" TEXT[],
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "offerAmount" DOUBLE PRECISION,
    "offerDate" TIMESTAMP(3),
    "offerDeadline" TIMESTAMP(3),
    "offerNotes" TEXT,
    "rejectionReason" TEXT,
    "rejectionDate" TIMESTAMP(3),
    "notes" TEXT,
    "aiParsedData" JSONB,
    "aiConfidenceScore" DOUBLE PRECISION,
    "sourceType" "public"."JobSourceType" NOT NULL DEFAULT 'MANUAL',
    "rawJobPosting" TEXT,
    "nextFollowUpDate" TIMESTAMP(3),
    "followUpCount" INTEGER NOT NULL DEFAULT 0,
    "lastFollowUpDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."JobFollowUp" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "completedDate" TIMESTAMP(3),
    "status" "public"."FollowUpStatus" NOT NULL DEFAULT 'PENDING',
    "type" "public"."FollowUpType" NOT NULL,
    "subject" TEXT,
    "message" TEXT,
    "response" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobFollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."JobNote" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."JobTimelineEvent" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "eventType" "public"."JobTimelineEventType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobTimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."JobDocument" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."JobDocumentType" NOT NULL,
    "url" TEXT,
    "fileKey" TEXT,
    "mimeType" TEXT,
    "size" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."JobReminder" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "reminderType" "public"."JobReminderType" NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" "public"."ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT,
    "message" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'email',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Order" (
    "id" UUID NOT NULL,
    "buyerId" UUID NOT NULL,
    "stripeSessionId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT,
    "status" "public"."OrderStatus" NOT NULL DEFAULT 'PENDING',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "printCost" DOUBLE PRECISION,
    "printJob" JSONB,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrderItem" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "bookId" UUID NOT NULL,
    "formatId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuthorOrderPayout" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "platformFee" DOUBLE PRECISION NOT NULL,
    "status" "public"."PayoutStatus" NOT NULL DEFAULT 'PENDING_REQUEST',
    "stripeTransferId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthorOrderPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OutboxEvent" (
    "id" UUID NOT NULL,
    "aggregateId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "public"."OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserProfile" (
    "id" UUID NOT NULL,
    "authId" UUID NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Subscription" (
    "id" UUID NOT NULL,
    "authId" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "status" "public"."SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "trialStart" TIMESTAMP(3),
    "trialEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SubscriptionPlan" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "interval" "public"."BillingInterval" NOT NULL,
    "intervalCount" INTEGER NOT NULL DEFAULT 1,
    "trialPeriodDays" INTEGER,
    "features" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Payment" (
    "id" UUID NOT NULL,
    "subscriptionId" UUID NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "public"."PaymentStatus" NOT NULL,
    "provider" TEXT NOT NULL,
    "providerPaymentId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Invoice" (
    "id" UUID NOT NULL,
    "subscriptionId" UUID NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "public"."InvoiceStatus" NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "invoiceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityLogEvent_tableName_recordId_createdAt_idx" ON "public"."ActivityLogEvent"("tableName", "recordId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLogEvent_actionedBy_createdAt_idx" ON "public"."ActivityLogEvent"("actionedBy", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLogEventDetail_eventId_idx" ON "public"."ActivityLogEventDetail"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthUser_email_key" ON "public"."AuthUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AuthUser_username_key" ON "public"."AuthUser"("username");

-- CreateIndex
CREATE INDEX "AuthUser_email_providerId_idx" ON "public"."AuthUser"("email", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSecurity_authId_key" ON "public"."AuthSecurity"("authId");

-- CreateIndex
CREATE UNIQUE INDEX "StripeConnectedAccount_authId_key" ON "public"."StripeConnectedAccount"("authId");

-- CreateIndex
CREATE UNIQUE INDEX "StripeConnectedAccount_stripeAccountId_key" ON "public"."StripeConnectedAccount"("stripeAccountId");

-- CreateIndex
CREATE INDEX "Book_authorId_idx" ON "public"."Book"("authorId");

-- CreateIndex
CREATE INDEX "Book_status_idx" ON "public"."Book"("status");

-- CreateIndex
CREATE INDEX "Book_title_idx" ON "public"."Book"("title");

-- CreateIndex
CREATE INDEX "BookFile_bookId_idx" ON "public"."BookFile"("bookId");

-- CreateIndex
CREATE INDEX "BookFormatPricing_bookId_idx" ON "public"."BookFormatPricing"("bookId");

-- CreateIndex
CREATE INDEX "LoginHistory_authId_createdAt_idx" ON "public"."LoginHistory"("authId", "createdAt");

-- CreateIndex
CREATE INDEX "EmailHistory_authId_idx" ON "public"."EmailHistory"("authId");

-- CreateIndex
CREATE INDEX "EmailHistory_emailTo_idx" ON "public"."EmailHistory"("emailTo");

-- CreateIndex
CREATE INDEX "EmailHistory_sentAt_idx" ON "public"."EmailHistory"("sentAt");

-- CreateIndex
CREATE INDEX "EmailHistory_messageId_idx" ON "public"."EmailHistory"("messageId");

-- CreateIndex
CREATE INDEX "Job_authId_idx" ON "public"."Job"("authId");

-- CreateIndex
CREATE INDEX "Job_authId_status_idx" ON "public"."Job"("authId", "status");

-- CreateIndex
CREATE INDEX "Job_authId_appliedDate_idx" ON "public"."Job"("authId", "appliedDate");

-- CreateIndex
CREATE INDEX "Job_authId_isArchived_idx" ON "public"."Job"("authId", "isArchived");

-- CreateIndex
CREATE INDEX "Job_authId_isFavorite_idx" ON "public"."Job"("authId", "isFavorite");

-- CreateIndex
CREATE INDEX "Job_authId_deletedAt_idx" ON "public"."Job"("authId", "deletedAt");

-- CreateIndex
CREATE INDEX "Job_authId_priority_idx" ON "public"."Job"("authId", "priority");

-- CreateIndex
CREATE INDEX "Job_authId_responseStatus_idx" ON "public"."Job"("authId", "responseStatus");

-- CreateIndex
CREATE INDEX "Job_company_idx" ON "public"."Job"("company");

-- CreateIndex
CREATE INDEX "Job_createdAt_idx" ON "public"."Job"("createdAt");

-- CreateIndex
CREATE INDEX "JobFollowUp_jobId_idx" ON "public"."JobFollowUp"("jobId");

-- CreateIndex
CREATE INDEX "JobFollowUp_scheduledDate_status_idx" ON "public"."JobFollowUp"("scheduledDate", "status");

-- CreateIndex
CREATE INDEX "JobFollowUp_jobId_status_idx" ON "public"."JobFollowUp"("jobId", "status");

-- CreateIndex
CREATE INDEX "JobNote_jobId_idx" ON "public"."JobNote"("jobId");

-- CreateIndex
CREATE INDEX "JobNote_jobId_isPinned_idx" ON "public"."JobNote"("jobId", "isPinned");

-- CreateIndex
CREATE INDEX "JobNote_jobId_createdAt_idx" ON "public"."JobNote"("jobId", "createdAt");

-- CreateIndex
CREATE INDEX "JobTimelineEvent_jobId_createdAt_idx" ON "public"."JobTimelineEvent"("jobId", "createdAt");

-- CreateIndex
CREATE INDEX "JobTimelineEvent_jobId_eventType_idx" ON "public"."JobTimelineEvent"("jobId", "eventType");

-- CreateIndex
CREATE INDEX "JobDocument_jobId_idx" ON "public"."JobDocument"("jobId");

-- CreateIndex
CREATE INDEX "JobDocument_jobId_type_idx" ON "public"."JobDocument"("jobId", "type");

-- CreateIndex
CREATE INDEX "JobDocument_jobId_isDefault_idx" ON "public"."JobDocument"("jobId", "isDefault");

-- CreateIndex
CREATE INDEX "JobReminder_jobId_idx" ON "public"."JobReminder"("jobId");

-- CreateIndex
CREATE INDEX "JobReminder_scheduledAt_status_idx" ON "public"."JobReminder"("scheduledAt", "status");

-- CreateIndex
CREATE INDEX "JobReminder_status_idx" ON "public"."JobReminder"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Order_stripeSessionId_key" ON "public"."Order"("stripeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_stripePaymentIntentId_key" ON "public"."Order"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "Order_buyerId_idx" ON "public"."Order"("buyerId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "public"."Order"("status");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "public"."OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_authorId_idx" ON "public"."OrderItem"("authorId");

-- CreateIndex
CREATE INDEX "AuthorOrderPayout_authorId_idx" ON "public"."AuthorOrderPayout"("authorId");

-- CreateIndex
CREATE INDEX "AuthorOrderPayout_status_idx" ON "public"."AuthorOrderPayout"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AuthorOrderPayout_orderId_authorId_key" ON "public"."AuthorOrderPayout"("orderId", "authorId");

-- CreateIndex
CREATE INDEX "OutboxEvent_status_idx" ON "public"."OutboxEvent"("status");

-- CreateIndex
CREATE INDEX "OutboxEvent_type_idx" ON "public"."OutboxEvent"("type");

-- CreateIndex
CREATE UNIQUE INDEX "OutboxEvent_aggregateId_type_key" ON "public"."OutboxEvent"("aggregateId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_authId_key" ON "public"."UserProfile"("authId");

-- CreateIndex
CREATE INDEX "Subscription_authId_idx" ON "public"."Subscription"("authId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "public"."Subscription"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_name_key" ON "public"."SubscriptionPlan"("name");

-- CreateIndex
CREATE INDEX "SubscriptionPlan_isActive_idx" ON "public"."SubscriptionPlan"("isActive");

-- CreateIndex
CREATE INDEX "Payment_subscriptionId_idx" ON "public"."Payment"("subscriptionId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "public"."Payment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "public"."Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_subscriptionId_idx" ON "public"."Invoice"("subscriptionId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "public"."Invoice"("status");

-- AddForeignKey
ALTER TABLE "public"."ActivityLogEvent" ADD CONSTRAINT "ActivityLogEvent_actionedBy_fkey" FOREIGN KEY ("actionedBy") REFERENCES "public"."AuthUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ActivityLogEventDetail" ADD CONSTRAINT "ActivityLogEventDetail_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."ActivityLogEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuthSecurity" ADD CONSTRAINT "AuthSecurity_authId_fkey" FOREIGN KEY ("authId") REFERENCES "public"."AuthUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StripeConnectedAccount" ADD CONSTRAINT "StripeConnectedAccount_authId_fkey" FOREIGN KEY ("authId") REFERENCES "public"."AuthUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Book" ADD CONSTRAINT "Book_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."AuthUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BookFile" ADD CONSTRAINT "BookFile_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "public"."Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BookFormatPricing" ADD CONSTRAINT "BookFormatPricing_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "public"."Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LoginHistory" ADD CONSTRAINT "LoginHistory_authId_fkey" FOREIGN KEY ("authId") REFERENCES "public"."AuthUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailHistory" ADD CONSTRAINT "EmailHistory_authId_fkey" FOREIGN KEY ("authId") REFERENCES "public"."AuthUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Job" ADD CONSTRAINT "Job_authId_fkey" FOREIGN KEY ("authId") REFERENCES "public"."AuthUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."JobFollowUp" ADD CONSTRAINT "JobFollowUp_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."JobNote" ADD CONSTRAINT "JobNote_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."JobTimelineEvent" ADD CONSTRAINT "JobTimelineEvent_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."JobDocument" ADD CONSTRAINT "JobDocument_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."JobReminder" ADD CONSTRAINT "JobReminder_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "public"."AuthUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderItem" ADD CONSTRAINT "OrderItem_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "public"."Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderItem" ADD CONSTRAINT "OrderItem_formatId_fkey" FOREIGN KEY ("formatId") REFERENCES "public"."BookFormatPricing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuthorOrderPayout" ADD CONSTRAINT "AuthorOrderPayout_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuthorOrderPayout" ADD CONSTRAINT "AuthorOrderPayout_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."AuthUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserProfile" ADD CONSTRAINT "UserProfile_authId_fkey" FOREIGN KEY ("authId") REFERENCES "public"."AuthUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Subscription" ADD CONSTRAINT "Subscription_authId_fkey" FOREIGN KEY ("authId") REFERENCES "public"."AuthUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "public"."Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "public"."Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
