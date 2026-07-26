-- KVCET Smart Hostel Management & Analytics System
-- Additive Schema Migration for Digital Outpass & Outing Permission System

-- 1. Short Outing Requests Table
CREATE TABLE IF NOT EXISTS public.hms_outing_requests (
  id TEXT PRIMARY KEY,
  student_reg TEXT NOT NULL,
  outing_date TEXT NOT NULL,
  requested_exit_time TEXT NOT NULL,
  expected_return_time TEXT NOT NULL,
  destination TEXT NOT NULL,
  reason TEXT NOT NULL,
  emergency_contact TEXT,
  status TEXT DEFAULT 'Pending Parent', -- 'Pending Parent', 'Pending Warden', 'Approved', 'Rejected', 'Cancelled'
  parent_approval_status TEXT DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
  parent_token TEXT UNIQUE,
  parent_token_expires_at TEXT,
  parent_decision_at TEXT,
  warden_approval_status TEXT DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
  warden_approved_by TEXT,
  warden_decision_at TEXT,
  warden_remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Digital Outpasses Table
CREATE TABLE IF NOT EXISTS public.hms_outpasses (
  id TEXT PRIMARY KEY, -- OP-XXXXXX
  pass_type TEXT NOT NULL, -- 'HOME_LEAVE', 'SHORT_OUTING'
  source_leave_id TEXT,
  source_outing_id TEXT,
  student_reg TEXT NOT NULL,
  valid_from TEXT NOT NULL,
  valid_until TEXT NOT NULL,
  secure_token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'VALID', -- 'NOT_YET_VALID', 'VALID', 'EXIT_RECORDED', 'RETURNED', 'EXPIRED', 'REVOKED'
  actual_exit_time TEXT,
  actual_return_time TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TEXT,
  revoked_by TEXT,
  revocation_reason TEXT
);

-- Disable RLS or set public access for PostgREST client compatibility
ALTER TABLE public.hms_outing_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.hms_outpasses DISABLE ROW LEVEL SECURITY;

GRANT ALL ON public.hms_outing_requests TO anon, authenticated, service_role;
GRANT ALL ON public.hms_outpasses TO anon, authenticated, service_role;
