
# TalentOS — Real AI Ranking Engine

Goal: turn the current demo (mock data + animated UI) into a working PoC that ingests a candidate/job dataset, ranks candidates with semantic + behavioral signals, exports the ranked shortlist, and is reproducible by judges.

## 1. Backend foundation

Enable Lovable Cloud (Supabase + pgvector). Create tables:

- `jobs` — id, title, description, requirements (jsonb), embedding `vector(1536)`, parsed_skills (text[]), created_at
- `candidates` — id, name, headline, location, skills (text[]), experience_years, education, raw_profile (jsonb), embedding `vector(1536)`, created_at
- `activity_signals` — candidate_id, logins_30d, response_rate, avg_reply_hours, applications_90d, tenure_months_avg, last_active_at, engagement_score
- `rankings` — id, job_id, run_id, created_at, params (jsonb)
- `ranking_results` — run_id, candidate_id, rank, semantic_score, skill_score, experience_score, behavioral_score, final_score, reasoning (jsonb)

All tables: `GRANT` to authenticated + service_role, RLS on, owner-scoped policies. Dataset rows are user-owned (`owner_id uuid` on jobs/candidates).

pgvector index: HNSW with `vector_cosine_ops` on jobs.embedding and candidates.embedding.

## 2. Ingestion

Two upload paths in the Resume Hub / new "Datasets" page:

- **Candidates CSV/JSON**: tolerant schema — auto-map common columns (name, title, skills, experience, education, location, plus any `activity_*` / `signal_*` columns into `activity_signals` jsonb). Show a column-mapping confirmation step.
- **Jobs CSV/JSON**: id, title, description, requirements.

Server fn `ingestDataset` parses file (CSV via papaparse, JSON native), batch-inserts rows, then enqueues embedding generation.

## 3. AI engine (server functions only)

`src/lib/ranking/` (all `.server.ts` or `.functions.ts`):

- **embed.server.ts** — `embedText(text)` calls Lovable AI Gateway `/v1/embeddings` with `google/gemini-embedding-001`, dims=1536. Batched (32 inputs/request).
- **parse-jd.server.ts** — calls `google/gemini-3-flash-preview` with tool-calling to extract: required_skills, nice_to_have, min_experience, seniority, domain, responsibilities. Stored in `jobs.requirements`.
- **parse-profile.server.ts** — same pattern: normalize candidate skills, infer seniority, extract trajectory features.
- **score.server.ts** — composite score:
  - `semantic = cosine(job.embedding, candidate.embedding)` — 50%
  - `skill_overlap = |req ∩ cand_skills| / |req|` weighted by must-have/nice-to-have — 25%
  - `experience_fit = gaussian(cand_years, target_years)` — 10%
  - `behavioral = normalize(engagement_score + response_rate + recency_decay)` — 15%
  - Weights configurable per-run.
- **rerank.server.ts** — top-50 from vector search re-scored with full formula, top-20 optionally re-ranked by a single Gemini call ("rank these candidates for this JD, return ordered ids with one-line reasoning") for explainability.

Server fns: `parseAndEmbedJob(jobId)`, `parseAndEmbedCandidate(candidateId)`, `runRanking({ jobId, weights, topK })` → writes to `rankings` + `ranking_results`.

## 4. Ranked output (the deliverable)

- New page `/exports` lists ranking runs. Each row: Download CSV, Download JSON.
- Server fn `exportRanking(runId, format)` returns string; client triggers download.
- Output schema (matches typical hackathon format):
  ```
  job_id, candidate_id, rank, final_score, semantic_score,
  skill_score, experience_score, behavioral_score, reasoning
  ```

## 5. Public reproducibility endpoint

`src/routes/api/public/rank.ts` (POST):
- Body: `{ job: {...}, candidates: [...], weights?: {...}, top_k?: 20 }`
- Validates with Zod, embeds + scores in-memory (no persistence), returns ranked JSON.
- Rate-limited (simple in-memory bucket per IP, 10/min).
- Lets judges call the engine directly with their dataset.

## 6. UI rewiring (minimal — keep current design)

Replace `mock-data.ts` reads with TanStack Query calls to server fns:
- Dashboard KPIs → aggregates from real tables
- `/candidates` → `listCandidates(query, filters)` with semantic search (embeds query, vector search)
- `/candidates/$id` → real profile + last ranking reasoning
- `/matching` → live run against a chosen job, shows real pipeline stages with real timings
- `/resumes` → becomes the ingestion hub
- New `/datasets` and `/exports` pages added to sidebar

Keep all glassmorphism / styling untouched. `mock-data.ts` stays only as seed fallback for empty state.

## 7. Blueprint / README

`README.md` at repo root with:
- Problem framing + approach
- Architecture diagram (ASCII)
- Data model
- Scoring formula with weight rationale
- Model choices (Gemini embeddings, Flash for parsing/rerank — cost + quality justification)
- How to reproduce: upload dataset OR call `/api/public/rank`
- Eval notes: precision@k, NDCG sketch (we won't run full eval, but document methodology)

## 8. Out of scope (call out)

- Auth flows beyond the existing login screen (the engine works under a single demo user)
- Real activity-signal pipelines (we accept whatever signals come in the dataset; document the schema)
- Fine-tuning / custom reranker training (we use pretrained embeddings + Gemini rerank)

## Technical sequencing

1. Enable Lovable Cloud
2. Migration: tables, GRANTs, RLS, pgvector + HNSW indexes
3. `embed.server.ts`, `parse-jd.server.ts`, `parse-profile.server.ts` + Lovable AI Gateway plumbing
4. Ingestion server fns + `/datasets` page (CSV/JSON upload)
5. Scoring + ranking server fns
6. Wire dashboard, candidates list/detail, matching page to real data
7. `/exports` page + download server fn
8. `/api/public/rank` route with Zod validation + rate limit
9. README with architecture + reproduction steps

```text
   Dataset (CSV/JSON)
         │
         ▼
   Ingest ──► Postgres (candidates, jobs, activity_signals)
                  │
                  ▼
          Lovable AI Gateway
          (Gemini parse + embed)
                  │
                  ▼
        pgvector (HNSW cosine)
                  │
                  ▼
   Hybrid scorer: semantic + skill + exp + behavioral
                  │
         ┌────────┴────────┐
         ▼                 ▼
   Gemini rerank        Ranked output
   (top-20 explain)     (CSV / JSON / API)
```

This delivers all three submission requirements: code, blueprint, ranked results — plus a live demo that's no longer cosmetic.
