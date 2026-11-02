-- Migration: 006_consent_privacy_security_m11.sql
-- M11 — Consent, Privacy & Data Security

create table if not exists public.consents (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references auth.users(id) on delete cascade,
  consent_type text not null default 'wellness_monitoring' check (consent_type in ('wellness_monitoring', 'counseling_support', 'ai_assistance', 'all')),
  status text not null default 'GRANTED' check (status in ('PENDING', 'GRANTED', 'WITHDRAWN', 'EXPIRED')),
  granted_at timestamptz default now(),
  withdrawn_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexing for rapid queries
create index if not exists idx_consents_child_id on public.consents(child_id);
create index if not exists idx_consents_parent_id on public.consents(parent_id);
create index if not exists idx_consents_status on public.consents(status);

-- Minimal Security Audit Log Table
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  role text,
  action text not null,
  resource text not null,
  status text not null default 'SUCCESS' check (status in ('SUCCESS', 'FORBIDDEN', 'UNAUTHORIZED', 'ERROR')),
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_user on public.audit_logs(user_id, created_at);
create index if not exists idx_audit_logs_action on public.audit_logs(action);

-- Enable RLS
alter table public.consents enable row level security;
alter table public.audit_logs enable row level security;

-- Policies for Consents
drop policy if exists "Users can view their own consents" on public.consents;
create policy "Users can view their own consents" on public.consents
for select to authenticated
using (auth.uid() = child_id or auth.uid() = parent_id);

drop policy if exists "Parents can modify consent for their children" on public.consents;
create policy "Parents can modify consent for their children" on public.consents
for all to authenticated
using (auth.uid() = parent_id or auth.uid() = child_id);
