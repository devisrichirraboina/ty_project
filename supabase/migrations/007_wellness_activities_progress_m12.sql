-- Migration: 007_wellness_activities_progress_m12.sql
-- M12 — Wellness Activity & Progress Tracking

-- 1. Catalog of standard wellness activities
create table if not exists public.wellness_activities (
  id text primary key,
  title text not null,
  category text not null check (category in ('Breathing', 'Mindfulness', 'Relaxation', 'Journaling', 'Focus', 'Art Therapy', 'Games')),
  duration text not null default '3 min',
  duration_seconds integer not null default 180,
  emoji text not null default '🌿',
  color text not null default 'purple',
  screen text not null,
  description text not null,
  instructions text[] not null default '{}',
  benefits text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. Child wellness activity sessions & progress logs
create table if not exists public.wellness_activity_logs (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references auth.users(id) on delete cascade,
  activity_id text not null,
  activity_title text not null,
  category text not null,
  duration_seconds integer not null default 180,
  completed boolean not null default true,
  feedback text, -- e.g. 'helpful', 'calming', 'neutral'
  started_at timestamptz not null default now(),
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_wellness_activity_logs_child on public.wellness_activity_logs(child_id, created_at);
create index if not exists idx_wellness_activity_logs_category on public.wellness_activity_logs(category);

-- Enable RLS
alter table public.wellness_activities enable row level security;
alter table public.wellness_activity_logs enable row level security;

-- Policies
drop policy if exists "Activities are viewable by all authenticated users" on public.wellness_activities;
create policy "Activities are viewable by all authenticated users" on public.wellness_activities
for select to authenticated using (true);

drop policy if exists "Users can access their own activity logs" on public.wellness_activity_logs;
create policy "Users can access their own activity logs" on public.wellness_activity_logs
for all to authenticated
using (auth.uid() = child_id)
with check (auth.uid() = child_id);

-- Seed core activities if not present
insert into public.wellness_activities (id, title, category, duration, duration_seconds, emoji, color, screen, description, instructions, benefits)
values
  ('act_breathe', 'Breathe With Me', 'Breathing', '2 min', 120, '🌸', 'purple', 'BreatheWithMe', 'Gentle 4-4-4 box breathing to slow your heart rate and steady your thoughts.', '{"Find a comfortable sitting posture.", "Inhale smoothly as the circle expands (4s).", "Hold gently at the top (4s).", "Exhale slowly and completely (4s).", "Repeat for 5 relaxing cycles."}', 'Helps activate the parasympathetic nervous system for quick emotional grounding.'),
  ('act_bubble', 'Bubble Break', 'Games', '2 min', 120, '🫧', 'mint', 'BubbleBreak', 'Pop soft floating bubbles with calming sound effects in a pressure-free space.', '{"Tap on bubbles as they float upward.", "Listen to the gentle popping feedback.", "Allow your racing thoughts to drift away with each popped bubble."}', 'Provides tactile sensory redirection away from overwhelming stress.'),
  ('act_color', 'Color Calm', 'Art Therapy', '5 min', 300, '🎨', 'yellow', 'ColorCalm', 'Express feelings and unwind through relaxing coloring patterns and soothing tones.', '{"Choose a peaceful color palette.", "Fill in geometric and botanical patterns at your own pace.", "No right or wrong colors—just follow what feels calm."}', 'Fosters creative expression, non-verbal emotional processing, and mindful absorption.'),
  ('act_zen', 'Zen Garden', 'Relaxation', '5 min', 300, '🌿', 'purple', 'ZenGarden', 'Rake peaceful sand patterns and place soothing stones in your personal garden.', '{"Select raking tools or smooth stones.", "Draw calm concentric or wavy ripple lines in the sand.", "Take deep breaths as you build your quiet sanctuary."}', 'Encourages deliberate mindful focus and sustained mental clarity.'),
  ('act_memory', 'Calm Memory', 'Focus', '3 min', 180, '🧠', 'pink', 'CalmMemory', 'Flip serene cards and match tranquil symbols in an unhurried memory game.', '{"Turn over two cards at a time.", "Match peaceful wellness icons.", "Take your time without any stress or countdown timers."}', 'Gently resets cognitive focus and enhances working memory without academic pressure.'),
  ('act_journal', 'Expressive Journal', 'Journaling', '5 min', 300, '📝', 'yellow', 'Journal', 'Write out thoughts, daily worries, or moments of gratitude in a safe private space.', '{"Choose how you are feeling right now.", "Write whatever comes to mind without worrying about spelling or grammar.", "Read back and appreciate having expressed yourself."}', 'Helps untangle intense emotions and promotes reflective self-awareness.')
on conflict (id) do update set
  title = excluded.title,
  instructions = excluded.instructions,
  benefits = excluded.benefits;
