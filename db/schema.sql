-- Modo42 website signups (Cloudflare D1).
-- Apply with: npx wrangler d1 execute modo42-signups --remote --file=db/schema.sql

CREATE TABLE IF NOT EXISTS waitlist (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  email       TEXT NOT NULL UNIQUE,          -- stored lower-case
  page        TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS coach_interest (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  email       TEXT NOT NULL UNIQUE,          -- stored lower-case
  name        TEXT NOT NULL,
  focus       TEXT NOT NULL,
  experience  TEXT,
  consent_at  TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'new',   -- new | contacted | onboarded | declined
  page        TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
