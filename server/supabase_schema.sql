-- ============================================================
-- SecureChain — Supabase SQL Schema (Comprehensive)
-- ============================================================
-- Run this in your Supabase project's SQL Editor (Dashboard -> SQL)
-- to create/update all tables and storage bucket permissions required by the backend.

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
  sender text,
  password text,
  "hasBlob" boolean default false,
  "filePath" text,
  "storagePath" text
);

-- Ensure all transfers columns exist if table already existed
alter table if exists public.transfers add column if not exists sender text;
alter table if exists public.transfers add column if not exists "filePath" text;
alter table if exists public.transfers add column if not exists "storagePath" text;
alter table if exists public.transfers add column if not exists "hasBlob" boolean default false;
alter table if exists public.transfers add column if not exists password text;

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
  size bigint,
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

-- Ensure all cloud_files columns exist if table already existed
alter table if exists public.cloud_files add column if not exists "filePath" text;
alter table if exists public.cloud_files add column if not exists hash text;
alter table if exists public.cloud_files add column if not exists encrypted boolean default true;
alter table if exists public.cloud_files add column if not exists owner text;
alter table if exists public.cloud_files add column if not exists cid text;
alter table if exists public.cloud_files add column if not exists "txHash" text;
alter table if exists public.cloud_files add column if not exists "ivHex" text;
alter table if exists public.cloud_files add column if not exists "encryptionSeed" text;
alter table if exists public.cloud_files add column if not exists deleted boolean default false;
alter table if exists public.cloud_files add column if not exists verified boolean default false;
alter table if exists public.cloud_files add column if not exists "shareToken" text;
alter table if exists public.cloud_files add column if not exists "shareExpiry" text;
alter table if exists public.cloud_files add column if not exists "sharePermission" text;
alter table if exists public.cloud_files add column if not exists "sharedWith" text;
alter table if exists public.cloud_files add column if not exists "sharedAt" text;
alter table if exists public.cloud_files add column if not exists "userId" text;
alter table if exists public.cloud_files add column if not exists "metadataStatus" text;
alter table if exists public.cloud_files add column if not exists "blockchainStatus" text;
alter table if exists public.cloud_files add column if not exists "storagePath" text;

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
create index if not exists idx_cloud_files_sharetoken on public.cloud_files("shareToken");
create index if not exists idx_messages_sender_recipient on public.messages(sender, recipient);

-- ------------------------------------------------------------------
-- Row Level Security (RLS) Permissions
-- ------------------------------------------------------------------
-- Authentication and authorization are enforced by the Node.js Express
-- API using cryptographically verified MetaMask signatures. To prevent
-- silent query rejections by Supabase RLS:
alter table if exists public.messages disable row level security;
alter table if exists public.transfers disable row level security;
alter table if exists public.activities disable row level security;
alter table if exists public.contacts disable row level security;
alter table if exists public.cloud_files disable row level security;
alter table if exists public.user_profiles disable row level security;

-- ------------------------------------------------------------------
-- Storage Bucket: files
-- ------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('files', 'files', false)
on conflict (id) do update set public = false;

-- Storage policies allowing both service_role and anon backend clients
-- to store, download, and delete encrypted buffers in the 'files' bucket
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'SecureChain Storage Service Policy' and tablename = 'objects') then
    create policy "SecureChain Storage Service Policy"
    on storage.objects for all
    using (bucket_id = 'files')
    with check (bucket_id = 'files');
  end if;
end $$;
