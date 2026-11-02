create table if not exists public.parent_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.counselor_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  qualification text,
  specialization text,
  experience text,
  application_status text not null default 'pending' check (application_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.counselor_child_assignments (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references auth.users(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  unique (counselor_id, child_id)
);

create table if not exists public.counseling_session_notes (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references auth.users(id) on delete cascade,
  session_date timestamptz not null default now(),
  session_type text not null default 'check-in',
  notes text not null,
  follow_up_date timestamptz,
  recommendations text,
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references auth.users(id) on delete set null,
  counselor_id uuid references auth.users(id) on delete set null,
  scheduled_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'confirmed', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references auth.users(id) on delete cascade,
  counselor_id uuid references auth.users(id) on delete set null,
  title text not null,
  body text not null,
  category text not null default 'wellness',
  created_at timestamptz not null default now()
);

-- The parent/counselor policies below need this shared child relationship table.
-- Keep it compatible with the existing child_id/parent_id queries in the app.
create table if not exists public.child_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  parent_id uuid references auth.users(id) on delete set null,
  name text not null default 'Child',
  age integer,
  created_at timestamptz not null default now()
);

create or replace function public.handle_role_profile_created()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.raw_user_meta_data ->> 'role' = 'parent' then
    insert into public.parent_profiles (user_id, full_name, phone)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'name', 'Parent'), new.raw_user_meta_data ->> 'phone')
    on conflict (user_id) do update set full_name = excluded.full_name, phone = excluded.phone;
  elsif new.raw_user_meta_data ->> 'role' = 'counselor' then
    insert into public.counselor_profiles (user_id, full_name, phone, qualification, specialization, experience, application_status)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'name', 'Counselor'),
      new.raw_user_meta_data ->> 'phone',
      new.raw_user_meta_data ->> 'qualification',
      new.raw_user_meta_data ->> 'specialization',
      new.raw_user_meta_data ->> 'experience',
      coalesce(new.raw_user_meta_data ->> 'application_status', 'pending')
    )
    on conflict (user_id) do update set
      full_name = excluded.full_name,
      application_status = excluded.application_status;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_role_profile_created on auth.users;
create trigger on_auth_user_role_profile_created
after insert on auth.users
for each row execute function public.handle_role_profile_created();

insert into public.parent_profiles (user_id, full_name, phone)
select id, coalesce(raw_user_meta_data ->> 'name', 'Parent'), raw_user_meta_data ->> 'phone'
from auth.users
where raw_user_meta_data ->> 'role' = 'parent'
on conflict (user_id) do nothing;

insert into public.counselor_profiles (user_id, full_name, phone, qualification, specialization, experience, application_status)
select
  id,
  coalesce(raw_user_meta_data ->> 'name', 'Counselor'),
  raw_user_meta_data ->> 'phone',
  raw_user_meta_data ->> 'qualification',
  raw_user_meta_data ->> 'specialization',
  raw_user_meta_data ->> 'experience',
  coalesce(raw_user_meta_data ->> 'application_status', 'pending')
from auth.users
where raw_user_meta_data ->> 'role' = 'counselor'
on conflict (user_id) do nothing;

alter table public.parent_profiles enable row level security;
alter table public.counselor_profiles enable row level security;
alter table public.counselor_child_assignments enable row level security;
alter table public.counseling_session_notes enable row level security;
alter table public.appointments enable row level security;
alter table public.recommendations enable row level security;
alter table public.child_profiles enable row level security;

drop policy if exists "Parents manage their own profile" on public.parent_profiles;
create policy "Parents manage their own profile" on public.parent_profiles
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Parents view their child profiles" on public.child_profiles;
create policy "Parents view their child profiles" on public.child_profiles
for select to authenticated using (auth.uid() = parent_id or auth.uid() = user_id);

drop policy if exists "Children view their own profile" on public.child_profiles;
create policy "Children view their own profile" on public.child_profiles
for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Parents create child profiles" on public.child_profiles;
create policy "Parents create child profiles" on public.child_profiles
for insert to authenticated with check (auth.uid() = parent_id);

drop policy if exists "Counselors view their own profile" on public.counselor_profiles;
create policy "Counselors view their own profile" on public.counselor_profiles
for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Admins manage counselor profiles" on public.counselor_profiles;
create policy "Admins manage counselor profiles" on public.counselor_profiles
for all to authenticated using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin') with check ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

drop policy if exists "Counselors view their assignments" on public.counselor_child_assignments;
create policy "Counselors view their assignments" on public.counselor_child_assignments
for select to authenticated using (auth.uid() = counselor_id or auth.uid() = assigned_by);

drop policy if exists "Admins manage assignments" on public.counselor_child_assignments;
create policy "Admins manage assignments" on public.counselor_child_assignments
for all to authenticated using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin') with check ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

drop policy if exists "Assigned counselors manage session notes" on public.counseling_session_notes;
create policy "Assigned counselors manage session notes" on public.counseling_session_notes
for all to authenticated using (
  auth.uid() = counselor_id and exists (
    select 1 from public.counselor_child_assignments a
    where a.counselor_id = auth.uid() and a.child_id = counseling_session_notes.child_id and a.status = 'active'
  )
) with check (
  auth.uid() = counselor_id and exists (
    select 1 from public.counselor_child_assignments a
    where a.counselor_id = auth.uid() and a.child_id = counseling_session_notes.child_id and a.status = 'active'
  )
);

drop policy if exists "Participants view appointments" on public.appointments;
create policy "Participants view appointments" on public.appointments
for select to authenticated using (auth.uid() in (parent_id, counselor_id, child_id));

drop policy if exists "Parents create appointments for their children" on public.appointments;
create policy "Parents create appointments for their children" on public.appointments
for insert to authenticated with check (
  auth.uid() = parent_id and exists (
    select 1 from public.child_profiles p where p.user_id = appointments.child_id and p.parent_id = auth.uid()
  )
);

drop policy if exists "Counselors update assigned appointments" on public.appointments;
create policy "Counselors update assigned appointments" on public.appointments
for update to authenticated using (auth.uid() = counselor_id) with check (auth.uid() = counselor_id);

drop policy if exists "Children and parents view recommendations" on public.recommendations;
create policy "Children and parents view recommendations" on public.recommendations
for select to authenticated using (
  auth.uid() = child_id or auth.uid() = counselor_id or exists (
    select 1 from public.child_profiles p where p.user_id = recommendations.child_id and p.parent_id = auth.uid()
  )
);

drop policy if exists "Assigned counselors create recommendations" on public.recommendations;
create policy "Assigned counselors create recommendations" on public.recommendations
for insert to authenticated with check (
  auth.uid() = counselor_id and exists (
    select 1 from public.counselor_child_assignments a
    where a.counselor_id = auth.uid() and a.child_id = recommendations.child_id and a.status = 'active'
  )
);

create index if not exists counselor_assignments_counselor_idx on public.counselor_child_assignments (counselor_id, status);
create index if not exists counselor_assignments_child_idx on public.counselor_child_assignments (child_id, status);
create index if not exists session_notes_child_date_idx on public.counseling_session_notes (child_id, session_date desc);
create index if not exists appointments_participants_date_idx on public.appointments (parent_id, counselor_id, scheduled_at);
