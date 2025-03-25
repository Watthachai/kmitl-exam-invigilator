-- CreateTable
CREATE TABLE "accounts" (
    "AccountID" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "oauth_token_secret" TEXT,
    "oauth_token" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("AccountID")
);

-- CreateTable
CREATE TABLE "sessions" (
    "SessionID" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("SessionID")
);

-- CreateTable
CREATE TABLE "users" (
    "UserID" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',

    CONSTRAINT "users_pkey" PRIMARY KEY ("UserID")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "id" SERIAL NOT NULL,
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "SubjectID" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "isGenEd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("SubjectID")
);

-- CreateTable
CREATE TABLE "SubjectGroup" (
    "id" TEXT NOT NULL,
    "groupNumber" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "studentCount" INTEGER NOT NULL,
    "subjectId" TEXT NOT NULL,
    "professorId" TEXT NOT NULL,

    CONSTRAINT "SubjectGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invigilator" (
    "InvigilatorID" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'บุคลากร',
    "departmentId" TEXT NOT NULL,
    "professorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "quota" INTEGER NOT NULL DEFAULT 4,
    "assignedQuota" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Invigilator_pkey" PRIMARY KEY ("InvigilatorID")
);

-- CreateTable
CREATE TABLE "Professor" (
    "ProfessorID" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,

    CONSTRAINT "Professor_pkey" PRIMARY KEY ("ProfessorID")
);

-- CreateTable
CREATE TABLE "SubjectGroupProfessor" (
    "id" TEXT NOT NULL,
    "subjectGroupId" TEXT NOT NULL,
    "professorId" TEXT NOT NULL,

    CONSTRAINT "SubjectGroupProfessor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Schedule" (
    "ScheduleID" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "scheduleDateOption" TEXT NOT NULL,
    "examType" TEXT NOT NULL,
    "academicYear" INTEGER NOT NULL,
    "semester" INTEGER NOT NULL,
    "invigilatorPosition" INTEGER,
    "roomId" TEXT NOT NULL,
    "subjectGroupId" TEXT NOT NULL,
    "invigilatorId" TEXT,
    "priority" BOOLEAN NOT NULL DEFAULT false,
    "isGenEd" BOOLEAN NOT NULL DEFAULT false,
    "quotaFilled" BOOLEAN NOT NULL DEFAULT false,
    "departmentQuota" INTEGER NOT NULL DEFAULT 0,
    "staffPreferred" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("ScheduleID")
);

-- CreateTable
CREATE TABLE "Department" (
    "DepartmentID" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "metadata" JSONB,
    "quota" INTEGER NOT NULL DEFAULT 0,
    "usedQuota" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("DepartmentID")
);

-- CreateTable
CREATE TABLE "Appeal" (
    "AppealID" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "preferredDates" TIMESTAMP(3)[],
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "additionalNotes" TEXT,
    "adminResponse" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appeal_pkey" PRIMARY KEY ("AppealID")
);

-- CreateTable
CREATE TABLE "Room" (
    "RoomID" TEXT NOT NULL,
    "building" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("RoomID")
);

-- CreateTable
CREATE TABLE "Activity" (
    "ActivityID" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("ActivityID")
);

-- CreateTable
CREATE TABLE "_ScheduleToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ScheduleToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_code_key" ON "Subject"("code");

-- CreateIndex
CREATE INDEX "SubjectGroup_subjectId_idx" ON "SubjectGroup"("subjectId");

-- CreateIndex
CREATE INDEX "SubjectGroup_professorId_idx" ON "SubjectGroup"("professorId");

-- CreateIndex
CREATE UNIQUE INDEX "SubjectGroup_subjectId_groupNumber_year_key" ON "SubjectGroup"("subjectId", "groupNumber", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Invigilator_professorId_key" ON "Invigilator"("professorId");

-- CreateIndex
CREATE UNIQUE INDEX "Invigilator_userId_key" ON "Invigilator"("userId");

-- CreateIndex
CREATE INDEX "Invigilator_departmentId_idx" ON "Invigilator"("departmentId");

-- CreateIndex
CREATE INDEX "Invigilator_professorId_idx" ON "Invigilator"("professorId");

-- CreateIndex
CREATE UNIQUE INDEX "Professor_name_key" ON "Professor"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Professor_userId_key" ON "Professor"("userId");

-- CreateIndex
CREATE INDEX "Professor_departmentId_idx" ON "Professor"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "SubjectGroupProfessor_subjectGroupId_professorId_key" ON "SubjectGroupProfessor"("subjectGroupId", "professorId");

-- CreateIndex
CREATE INDEX "Schedule_roomId_idx" ON "Schedule"("roomId");

-- CreateIndex
CREATE INDEX "Schedule_subjectGroupId_idx" ON "Schedule"("subjectGroupId");

-- CreateIndex
CREATE INDEX "Schedule_invigilatorId_idx" ON "Schedule"("invigilatorId");

-- CreateIndex
CREATE UNIQUE INDEX "Schedule_date_roomId_startTime_endTime_invigilatorPosition_key" ON "Schedule"("date", "roomId", "startTime", "endTime", "invigilatorPosition");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE INDEX "Appeal_userId_idx" ON "Appeal"("userId");

-- CreateIndex
CREATE INDEX "Appeal_scheduleId_idx" ON "Appeal"("scheduleId");

-- CreateIndex
CREATE UNIQUE INDEX "Room_building_roomNumber_key" ON "Room"("building", "roomNumber");

-- CreateIndex
CREATE INDEX "Activity_createdAt_idx" ON "Activity"("createdAt");

-- CreateIndex
CREATE INDEX "_ScheduleToUser_B_index" ON "_ScheduleToUser"("B");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("UserID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("UserID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("DepartmentID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectGroup" ADD CONSTRAINT "SubjectGroup_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("SubjectID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectGroup" ADD CONSTRAINT "SubjectGroup_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "Professor"("ProfessorID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invigilator" ADD CONSTRAINT "Invigilator_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("DepartmentID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invigilator" ADD CONSTRAINT "Invigilator_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "Professor"("ProfessorID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invigilator" ADD CONSTRAINT "Invigilator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("UserID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Professor" ADD CONSTRAINT "Professor_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("DepartmentID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Professor" ADD CONSTRAINT "Professor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("UserID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectGroupProfessor" ADD CONSTRAINT "SubjectGroupProfessor_subjectGroupId_fkey" FOREIGN KEY ("subjectGroupId") REFERENCES "SubjectGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectGroupProfessor" ADD CONSTRAINT "SubjectGroupProfessor_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "Professor"("ProfessorID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("RoomID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_subjectGroupId_fkey" FOREIGN KEY ("subjectGroupId") REFERENCES "SubjectGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_invigilatorId_fkey" FOREIGN KEY ("invigilatorId") REFERENCES "Invigilator"("InvigilatorID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appeal" ADD CONSTRAINT "Appeal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("UserID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appeal" ADD CONSTRAINT "Appeal_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("ScheduleID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("UserID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ScheduleToUser" ADD CONSTRAINT "_ScheduleToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Schedule"("ScheduleID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ScheduleToUser" ADD CONSTRAINT "_ScheduleToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("UserID") ON DELETE CASCADE ON UPDATE CASCADE;

