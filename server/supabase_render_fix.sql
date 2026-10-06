-- SecureChain Render/Supabase compatibility migration
-- Safe to run multiple times in Supabase SQL Editor.

-- Ensure all current transfer columns exist.
alter table if exists public.transfers add column if not exists sender text;
alter table if exists public.transfers add column if not exists "filePath" text;
alter table if exists public.transfers add column if not exists "storagePath" text;
alter table if exists public.transfers add column if not exists "hasBlob" boolean default false;
alter table if exists public.transfers add column if not exists password text;

-- Ensure all current cloud_files columns exist.
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

create index if not exists idx_cloud_files_owner on public.cloud_files(owner);
create index if not exists idx_cloud_files_sharetoken on public.cloud_files("shareToken");
create index if not exists idx_messages_sender_recipient on public.messages(sender, recipient);

-- Prevent RLS from blocking backend queries
alter table if exists public.messages disable row level security;
alter table if exists public.transfers disable row level security;
alter table if exists public.activities disable row level security;
alter table if exists public.contacts disable row level security;
alter table if exists public.cloud_files disable row level security;
alter table if exists public.user_profiles disable row level security;

-- Ensure the private bucket exists.
insert into storage.buckets (id, name, public)
values ('files', 'files', false)
on conflict (id) do update set public = false;

-- Add policy to storage objects for files bucket
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'SecureChain Storage Policy' and tablename = 'objects') then
    create policy "SecureChain Storage Policy"
    on storage.objects for all
    using (bucket_id = 'files')
    with check (bucket_id = 'files');
  end if;
end $$;
