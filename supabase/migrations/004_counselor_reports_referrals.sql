-- Persist counselor-generated reports and specialist referral recommendations.
create table if not exists public.counselor_reports (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references auth.users(id) on delete cascade,
  report_type text not null default 'clinical_summary',
  report_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.counselor_referrals (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  risk_level text,
  status text not null default 'recommended' check (status in ('recommended', 'in_review', 'referred', 'closed')),
  created_at timestamptz not null default now()
);

alter table public.counselor_reports enable row level security;
alter table public.counselor_referrals enable row level security;

drop policy if exists "Assigned counselors manage reports" on public.counselor_reports;
create policy "Assigned counselors manage reports" on public.counselor_reports
for all to authenticated using (
  auth.uid() = counselor_id and exists (
    select 1 from public.counselor_child_assignments a
    where a.counselor_id = auth.uid() and a.child_id = counselor_reports.child_id and a.status = 'active'
  )
) with check (
  auth.uid() = counselor_id and exists (
    select 1 from public.counselor_child_assignments a
    where a.counselor_id = auth.uid() and a.child_id = counselor_reports.child_id and a.status = 'active'
  )
);

drop policy if exists "Assigned counselors manage referrals" on public.counselor_referrals;
create policy "Assigned counselors manage referrals" on public.counselor_referrals
for all to authenticated using (
  auth.uid() = counselor_id and exists (
    select 1 from public.counselor_child_assignments a
    where a.counselor_id = auth.uid() and a.child_id = counselor_referrals.child_id and a.status = 'active'
  )
) with check (
  auth.uid() = counselor_id and exists (
    select 1 from public.counselor_child_assignments a
    where a.counselor_id = auth.uid() and a.child_id = counselor_referrals.child_id and a.status = 'active'
  )
);

create index if not exists counselor_reports_child_date_idx on public.counselor_reports (child_id, created_at desc);
create index if not exists counselor_referrals_child_date_idx on public.counselor_referrals (child_id, created_at desc);