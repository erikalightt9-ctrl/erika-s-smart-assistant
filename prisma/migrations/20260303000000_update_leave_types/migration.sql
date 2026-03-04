-- Migration: update_leave_types
-- Replaces the old LeaveType enum with the full statutory + company-provided leave categories.

-- Step 1: Drop the default on leaveType column (if any), then change column to text temporarily
ALTER TABLE "leave_requests" ALTER COLUMN "leaveType" DROP DEFAULT;
ALTER TABLE "leave_requests" ALTER COLUMN "leaveType" TYPE TEXT;

-- Step 2: Migrate any existing records using old enum values to sensible new values
UPDATE "leave_requests" SET "leaveType" = 'SICK'     WHERE "leaveType" = 'SICK';
UPDATE "leave_requests" SET "leaveType" = 'VACATION'  WHERE "leaveType" = 'VACATION';
UPDATE "leave_requests" SET "leaveType" = 'EMERGENCY' WHERE "leaveType" = 'EMERGENCY';
UPDATE "leave_requests" SET "leaveType" = 'SIL'       WHERE "leaveType" = 'UNPAID';

-- Step 3: Drop the old enum type
DROP TYPE IF EXISTS "LeaveType";

-- Step 4: Create the new enum with all 14 leave categories
CREATE TYPE "LeaveType" AS ENUM (
  -- Statutory Leaves (Philippines)
  'SIL',
  'MATERNITY',
  'PATERNITY',
  'SOLO_PARENT',
  'SPECIAL_LEAVE_FOR_WOMEN',
  'VAWC',
  'REHABILITATION',
  -- Company-Provided Leaves
  'SICK',
  'VACATION',
  'BEREAVEMENT',
  'EMERGENCY',
  'STUDY',
  'BIRTHDAY',
  'CTO'
);

-- Step 5: Cast the text column back to the new enum
ALTER TABLE "leave_requests" ALTER COLUMN "leaveType" TYPE "LeaveType" USING "leaveType"::"LeaveType";
