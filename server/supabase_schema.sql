-- ============================================================
-- SecureChain — Supabase SQL Schema
-- ============================================================
-- Run this in your Supabase project's SQL Editor (Dashboard -> SQL)
-- to create all tables required by the backend.
--
-- IMPORTANT: The backend uses a server-side Supabase secret key (or legacy
-- service_role key). Never expose that key in the frontend. The backend
-- performs wallet-signature authentication before protected operations.

-- ------------------------------------------------------------------
-- messages
-- ------------------------------------------------------------------
create table if not exists public.messages (
  id serial primary key,
  recipient text,
  sender text,
  text text,
  "fileName" text,
  "fileSize" text,
  "isFile" boolean default false,
  time text,
  type text
);

-- ------------------------------------------------------------------
-- transfers
-- ------------------------------------------------------------------
create table if not exists public.transfers (
  id text primary key,
  name text,
  size text,
  date text,
  status text,
  type text,
  color text,
  recipient text,
  password text,
  "hasBlob" boolean default false,
  "filePath" text,
  "storagePath" text
);

-- ------------------------------------------------------------------
-- activities
-- ------------------------------------------------------------------
create table if not exists public.activities (
  id serial primary key,
  type text,
  file text,
  target text,
  time text,
  date text
);

-- ------------------------------------------------------------------
-- contacts
-- ------------------------------------------------------------------
create table if not exists public.contacts (
  id text primary key,
  name text,
  status text
);

-- ------------------------------------------------------------------
-- cloud_files
-- ------------------------------------------------------------------
create table if not exists public.cloud_files (
  id text primary key,
  name text,
  size integer,
  type text,
  date text,
  timestamp bigint,
  "filePath" text,
  hash text,
  encrypted boolean default true,
  owner text,
  cid text,
  "txHash" text,
  "ivHex" text,
  "encryptionSeed" text,
  deleted boolean default false,
  verified boolean default false,
  "shareToken" text,
  "shareExpiry" text,
  "sharePermission" text,
  "sharedWith" text,
  "sharedAt" text,
  "userId" text,
  "metadataStatus" text,
  "blockchainStatus" text,
  "storagePath" text
);


-- ------------------------------------------------------------------
-- user_profiles (wallet <-> Supabase settings/profile)
-- ------------------------------------------------------------------
create table if not exists public.user_profiles (
  wallet_address text primary key,
  display_name text default 'BlockUser_1',
  notifications jsonb default '{"transferCompleted":true,"newFileReceived":true,"messageAlerts":true,"securityAlerts":true}'::jsonb,
  network text default 'Ethereum Mainnet',
  ipfs_gateway text default 'https://ipfs.io/ipfs/',
  theme text default '#10b981',
  subscription text default 'Free',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_cloud_files_owner on public.cloud_files(owner);
create index if not exists idx_messages_sender_recipient on public.messages(sender, recipient);

-- ============================================================
-- Storage bucket
-- ============================================================
-- Create a PRIVATE storage bucket for encrypted files.
-- The backend auto-creates it if missing, but you can create it
-- here too for clarity. Go to Dashboard -> Storage -> New bucket,
-- name it "files", and keep visibility Private.

insert into storage.buckets (id, name, public)
values ('files', 'files', false)
on conflict (id) do nothing;
