
create extension if not exists vector;

-- JOBS
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  raw_requirements jsonb default '{}'::jsonb,
  parsed jsonb default '{}'::jsonb,  -- {required_skills, nice_to_have, min_experience, seniority, domain, responsibilities}
  embedding vector(1536),
  created_at timestamptz not null default now()
);
grant all on public.jobs to service_role;
alter table public.jobs enable row level security;

-- CANDIDATES
create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  external_id text,  -- id from source dataset
  name text not null,
  headline text,
  location text,
  skills text[] default '{}',
  experience_years numeric,
  education text,
  raw_profile jsonb default '{}'::jsonb,
  parsed jsonb default '{}'::jsonb,
  embedding vector(1536),
  created_at timestamptz not null default now()
);
create index candidates_external_id_idx on public.candidates(external_id);
grant all on public.candidates to service_role;
alter table public.candidates enable row level security;

-- ACTIVITY SIGNALS (behavioral)
create table public.activity_signals (
  candidate_id uuid primary key references public.candidates(id) on delete cascade,
  logins_30d integer default 0,
  response_rate numeric default 0,        -- 0..1
  avg_reply_hours numeric default 72,
  applications_90d integer default 0,
  tenure_months_avg numeric default 0,
  last_active_at timestamptz,
  engagement_score numeric default 0,     -- precomputed 0..1
  raw jsonb default '{}'::jsonb
);
grant all on public.activity_signals to service_role;
alter table public.activity_signals enable row level security;

-- RANKING RUNS
create table public.rankings (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  params jsonb default '{}'::jsonb,       -- weights, top_k, model
  candidates_evaluated integer default 0,
  status text not null default 'completed',
  created_at timestamptz not null default now()
);
grant all on public.rankings to service_role;
alter table public.rankings enable row level security;

-- RANKING RESULTS
create table public.ranking_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.rankings(id) on delete cascade,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  rank integer not null,
  semantic_score numeric not null,
  skill_score numeric not null,
  experience_score numeric not null,
  behavioral_score numeric not null,
  final_score numeric not null,
  reasoning jsonb default '{}'::jsonb
);
create index ranking_results_run_idx on public.ranking_results(run_id, rank);
grant all on public.ranking_results to service_role;
alter table public.ranking_results enable row level security;

-- Vector indexes (HNSW cosine)
create index jobs_embedding_idx on public.jobs using hnsw (embedding vector_cosine_ops);
create index candidates_embedding_idx on public.candidates using hnsw (embedding vector_cosine_ops);

-- Similarity search RPC for candidates
create or replace function public.match_candidates(
  query_embedding vector(1536),
  match_count int default 50
)
returns table (
  id uuid,
  name text,
  similarity float
)
language sql stable
as $$
  select c.id, c.name, 1 - (c.embedding <=> query_embedding) as similarity
  from public.candidates c
  where c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
grant execute on function public.match_candidates to service_role;
