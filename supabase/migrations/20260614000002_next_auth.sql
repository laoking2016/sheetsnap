-- Migration: 002_next_auth_schema
-- Description: Create next_auth schema with camelCase columns matching @auth/supabase-adapter
-- The adapter uses camelCase column names (emailVerified, sessionToken, etc.)
-- PostgREST will preserve camelCase as-is when stored in the database.

CREATE SCHEMA IF NOT EXISTS next_auth;

SET search_path TO next_auth;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT NOT NULL UNIQUE,
  "emailVerified" TIMESTAMPTZ,
  image TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Accounts
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" BIGINT,
  "token_type" TEXT,
  scope TEXT,
  "id_token" TEXT,
  "session_state" TEXT,
  UNIQUE (provider, "providerAccountId")
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sessionToken" TEXT NOT NULL UNIQUE,
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMPTZ NOT NULL
);

-- Verification tokens
CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires TIMESTAMPTZ NOT NULL,
  UNIQUE (identifier, token)
);

-- Indexes
CREATE INDEX IF NOT EXISTS accounts_user_id_idx ON accounts("userId");
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions("userId");

-- Create a view in public schema for easy access
CREATE OR REPLACE VIEW public.auth_users AS
SELECT id, name, email, "emailVerified" AS email_verified, image, "createdAt" AS created_at
FROM next_auth.users;

RESET search_path;
