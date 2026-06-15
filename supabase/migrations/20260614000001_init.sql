-- Migration: 001_init
-- Description: Create base tables for Sheetsnap MVP
-- Tables: users, parse_records, payments, feedback

-- ============================================================
-- Table: users
-- Managed by NextAuth.js Supabase Adapter
-- Extended with profile fields and role
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Table: parse_records
-- Tracks every file parsing attempt (logged-in or guest)
-- ============================================================
CREATE TABLE IF NOT EXISTS parse_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  guest_id TEXT,                              -- anonymous identifier from localStorage
  guest_email TEXT,                           -- collected email for download
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('xlsx', 'xls', 'csv', 'pdf')),
  file_size_bytes INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed')),
  parsed_data JSONB,                          -- structured parse result (5 standard columns)
  raw_text TEXT,                              -- original parse output for debugging
  credit_cost INTEGER NOT NULL DEFAULT 1,
  error_message TEXT,                         -- failure reason if status = 'failed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_parse_records_user_id ON parse_records(user_id);
CREATE INDEX idx_parse_records_guest_id ON parse_records(guest_id);
CREATE INDEX idx_parse_records_guest_email ON parse_records(guest_email);
CREATE INDEX idx_parse_records_created_at ON parse_records(created_at DESC);

-- ============================================================
-- Table: payments
-- Tracks Stripe payment transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  guest_email TEXT,                            -- for unregistered buyers
  stripe_session_id TEXT UNIQUE,
  amount INTEGER NOT NULL,                     -- in cents
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  credits_added INTEGER NOT NULL DEFAULT 0,
  metadata JSONB,                              -- extra Stripe session info
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_stripe_session_id ON payments(stripe_session_id);

-- ============================================================
-- Table: feedback
-- Collects user feedback and ratings
-- ============================================================
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email TEXT,
  message TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  page_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_feedback_user_id ON feedback(user_id);

-- ============================================================
-- Row Level Security
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE parse_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Users: only self or admin
CREATE POLICY users_self_select ON users
  FOR SELECT USING (id = auth.uid() OR role = 'admin');
CREATE POLICY users_self_update ON users
  FOR UPDATE USING (id = auth.uid());

-- Parse records: owner by user_id, or by guest_email, or admin
CREATE POLICY parse_records_self_select ON parse_records
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR guest_email = current_setting('request.guest_email', TRUE)
    OR auth.role() = 'admin'
  );
CREATE POLICY parse_records_insert ON parse_records
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR guest_email IS NOT NULL
  );

-- Payments: owner or admin
CREATE POLICY payments_self_select ON payments
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR auth.role() = 'admin'
  );
CREATE POLICY payments_insert ON payments
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR guest_email IS NOT NULL
  );

-- Feedback: anyone can insert, only admin can read
CREATE POLICY feedback_insert ON feedback
  FOR INSERT
  WITH CHECK (true);
CREATE POLICY feedback_admin_select ON feedback
  FOR SELECT
  USING (auth.role() = 'admin');
