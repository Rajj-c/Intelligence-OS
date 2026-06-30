
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
security invoker
set search_path = public
as $$
  select c.id, c.name, 1 - (c.embedding <=> query_embedding) as similarity
  from public.candidates c
  where c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
