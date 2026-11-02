-- Migration: 005_notifications_m10.sql
-- M10: Complete in-app notifications and real-time alert system

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('stress_alert', 'meeting_invite', 'meeting_update', 'meeting_cancel', 'counselor_message', 'child_message', 'wellness_recommendation', 'report_ready', 'system_alert')),
  title text not null,
  message text not null,
  related_entity_id text,
  related_route text,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- Performance Indexes
create index if not exists idx_notifications_recipient on public.notifications(recipient_id, is_read, created_at desc);
create index if not exists idx_notifications_type on public.notifications(type, created_at desc);

-- Row Level Security
alter table public.notifications enable row level security;

-- Recipient can view only their own notifications
drop policy if exists "Recipients view their own notifications" on public.notifications;
create policy "Recipients view their own notifications" on public.notifications
for select to authenticated
using (auth.uid() = recipient_id);

-- Recipient can update only their own notifications (mark read)
drop policy if exists "Recipients update their own notifications" on public.notifications;
create policy "Recipients update their own notifications" on public.notifications
for update to authenticated
using (auth.uid() = recipient_id)
with check (auth.uid() = recipient_id);

-- System or authenticated participants can insert notifications
drop policy if exists "Authenticated users can create notifications" on public.notifications;
create policy "Authenticated users can create notifications" on public.notifications
for insert to authenticated
with check (true);
