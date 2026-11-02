create table if not exists public.questionnaire_responses (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references auth.users(id) on delete cascade,
  answers jsonb not null,
  score integer not null check (score >= 0 and score <= 60),
  result_level text not null,
  category_scores jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.questionnaire_responses enable row level security;

create policy "Children can save their own questionnaire responses"
  on public.questionnaire_responses
  for insert
  to authenticated
  with check (auth.uid() = child_id);

create policy "Children can read their own questionnaire responses"
  on public.questionnaire_responses
  for select
  to authenticated
  using (auth.uid() = child_id);

create index if not exists questionnaire_responses_child_created_idx
  on public.questionnaire_responses (child_id, created_at desc);