-- Migration: 003_counselor_messages.sql
-- Supports 1-on-1 real-time messaging between students and approved counselors, including shared wellness reports and meeting arrangements.

create table if not exists public.counselor_messages (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references auth.users(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  sender_role text not null check (sender_role in ('child', 'counselor')),
  message text not null,
  message_type text not null default 'text' check (message_type in ('text', 'report_share', 'meeting_invite')),
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- Indexing for fast query lookups by participant pair
create index if not exists idx_counselor_messages_pair on public.counselor_messages(counselor_id, child_id, created_at);

-- RLS Security
alter table public.counselor_messages enable row level security;

drop policy if exists "Participants can view their own messages" on public.counselor_messages;
create policy "Participants can view their own messages" on public.counselor_messages
for select to authenticated
using (auth.uid() = counselor_id or auth.uid() = child_id or auth.uid() = sender_id);

drop policy if exists "Participants can insert messages" on public.counselor_messages;
create policy "Participants can insert messages" on public.counselor_messages
for insert to authenticated
with check (auth.uid() = counselor_id or auth.uid() = child_id or auth.uid() = sender_id);
