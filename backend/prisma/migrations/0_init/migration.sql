-- CreateTable
CREATE TABLE "Teacher" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "schoolId" TEXT,
    "tier" TEXT NOT NULL DEFAULT 'starter',
    "aiCallsUsed" INTEGER NOT NULL DEFAULT 0,
    "aiCallsReset" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "passwordHash" TEXT,

    CONSTRAINT "Teacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "taskCode" TEXT NOT NULL,
    "universalExpectations" BOOLEAN NOT NULL DEFAULT true,
    "successCriteria" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'active',
    "folderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskSession" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "isLive" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "dataPersisted" BOOLEAN NOT NULL DEFAULT false,
    "dataExpiresAt" TIMESTAMP(3),
    "totalStudents" INTEGER NOT NULL DEFAULT 0,
    "submissions" INTEGER NOT NULL DEFAULT 0,
    "feedbackSent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "feedbacksGenerated" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TaskSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentSubmission" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "previousContent" TEXT,
    "timeElapsed" INTEGER,
    "revisionCount" INTEGER NOT NULL DEFAULT 0,
    "isRevision" BOOLEAN NOT NULL DEFAULT false,
    "feedbackStatus" TEXT NOT NULL DEFAULT 'pending',
    "validationWarnings" TEXT[],
    "selectedNextStepId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionFeedback" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "masteryAchieved" BOOLEAN NOT NULL DEFAULT false,
    "strengths" JSONB NOT NULL,
    "growthAreas" JSONB NOT NULL,
    "nextSteps" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubmissionFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsageLog" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "taskId" TEXT,
    "sessionId" TEXT,
    "operation" TEXT NOT NULL,
    "studentCount" INTEGER NOT NULL DEFAULT 1,
    "tokensUsed" INTEGER,
    "model" TEXT NOT NULL,
    "validationWarnings" TEXT[],
    "hardBlockReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_email_key" ON "Teacher"("email");

-- CreateIndex
CREATE INDEX "Teacher_email_idx" ON "Teacher"("email");

-- CreateIndex
CREATE INDEX "Folder_teacherId_idx" ON "Folder"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "Task_taskCode_key" ON "Task"("taskCode");

-- CreateIndex
CREATE INDEX "Task_teacherId_idx" ON "Task"("teacherId");

-- CreateIndex
CREATE INDEX "Task_folderId_idx" ON "Task"("folderId");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Task_taskCode_idx" ON "Task"("taskCode");

-- CreateIndex
CREATE INDEX "TaskSession_taskId_idx" ON "TaskSession"("taskId");

-- CreateIndex
CREATE INDEX "TaskSession_teacherId_idx" ON "TaskSession"("teacherId");

-- CreateIndex
CREATE INDEX "TaskSession_isLive_idx" ON "TaskSession"("isLive");

-- CreateIndex
CREATE INDEX "Student_sessionId_idx" ON "Student"("sessionId");

-- CreateIndex
CREATE INDEX "Student_status_idx" ON "Student"("status");

-- CreateIndex
CREATE INDEX "StudentSubmission_studentId_idx" ON "StudentSubmission"("studentId");

-- CreateIndex
CREATE INDEX "StudentSubmission_sessionId_idx" ON "StudentSubmission"("sessionId");

-- CreateIndex
CREATE INDEX "StudentSubmission_feedbackStatus_idx" ON "StudentSubmission"("feedbackStatus");

-- CreateIndex
CREATE UNIQUE INDEX "SubmissionFeedback_submissionId_key" ON "SubmissionFeedback"("submissionId");

-- CreateIndex
CREATE INDEX "AiUsageLog_teacherId_idx" ON "AiUsageLog"("teacherId");

-- CreateIndex
CREATE INDEX "AiUsageLog_createdAt_idx" ON "AiUsageLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSession" ADD CONSTRAINT "TaskSession_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSession" ADD CONSTRAINT "TaskSession_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TaskSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSubmission" ADD CONSTRAINT "StudentSubmission_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TaskSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSubmission" ADD CONSTRAINT "StudentSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionFeedback" ADD CONSTRAINT "SubmissionFeedback_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "StudentSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsageLog" ADD CONSTRAINT "AiUsageLog_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

