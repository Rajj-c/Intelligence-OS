-- Add user_id column to jobs, candidates, and rankings
alter table public.jobs add column user_id uuid references auth.users(id) on delete cascade;
alter table public.candidates add column user_id uuid references auth.users(id) on delete cascade;
alter table public.rankings add column user_id uuid references auth.users(id) on delete cascade;

-- Enable Row Level Security (already enabled, but making sure)
alter table public.jobs enable row level security;
alter table public.candidates enable row level security;
alter table public.rankings enable row level security;
alter table public.activity_signals enable row level security;
alter table public.ranking_results enable row level security;

-- Create RLS Policies to isolate data per-user, while keeping existing data (user_id is null) accessible
create policy "Users can manage their own jobs" on public.jobs
  for all using (auth.uid() = user_id or user_id is null);

create policy "Users can manage their own candidates" on public.candidates
  for all using (auth.uid() = user_id or user_id is null);

create policy "Users can manage their own rankings" on public.rankings
  for all using (auth.uid() = user_id or user_id is null);

create policy "Users can manage their own activity_signals" on public.activity_signals
  for all using (
    exists (
      select 1 from public.candidates c
      where c.id = candidate_id
      and (c.user_id = auth.uid() or c.user_id is null)
    )
  );

create policy "Users can manage their own ranking_results" on public.ranking_results
  for all using (
    exists (
      select 1 from public.rankings r
      join public.jobs j on j.id = r.job_id
      where r.id = run_id
      and (j.user_id = auth.uid() or j.user_id is null)
    )
  );
