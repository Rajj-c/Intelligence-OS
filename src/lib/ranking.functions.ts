import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  DEFAULT_WEIGHTS,
  behavioralScore,
  compositeScore,
  experienceScore,
  skillScore,
  detectHiddenGem,
  type Weights,
} from "./ranking/score";
import type { ParsedJob } from "./ranking/parse.server";

const WeightsSchema = z
  .object({
    semantic: z.number().min(0).max(1),
    skill: z.number().min(0).max(1),
    experience: z.number().min(0).max(1),
    behavioral: z.number().min(0).max(1),
  })
  .optional();

export const runRanking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { jobId: string; topK?: number; weights?: Weights }) =>
    z
      .object({
        jobId: z.string().uuid(),
        topK: z.number().int().min(1).max(200).optional(),
        weights: WeightsSchema,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const weights = data.weights ?? DEFAULT_WEIGHTS;
    const topK = data.topK ?? 20;

    // 1. Load job with embedding
    const { data: job, error: jErr } = await supabaseAdmin
      .from("jobs")
      .select("id, title, parsed, embedding")
      .eq("id", data.jobId)
      .or(`user_id.eq.${userId},user_id.is.null`)
      .single();
    if (jErr) throw new Error(jErr.message);
    if (!job.embedding) throw new Error("Job has no embedding. Run parseAndEmbedJob first.");
    const parsed = (job.parsed as ParsedJob | null) ?? {
      required_skills: [],
      nice_to_have: [],
      min_experience_years: 0,
      seniority: "mid",
      domain: "",
      responsibilities: [],
    };

    // 2. Vector candidate shortlist (top 50)
    const { data: matches, error: mErr } = await supabaseAdmin.rpc("match_candidates", {
      query_embedding: job.embedding as unknown as string,
      match_count: Math.max(topK * 3, 50),
    });
    if (mErr) throw new Error(mErr.message);

    const ids = (matches as { id: string; similarity: number }[]).map((m) => m.id);
    if (ids.length === 0) {
      return { runId: null, count: 0, results: [] };
    }
    const simMap = new Map(
      (matches as { id: string; similarity: number }[]).map((m) => [m.id, m.similarity]),
    );

    // 3. Hydrate full candidate rows + signals
    const { data: candRows, error: cErr } = await supabaseAdmin
      .from("candidates")
      .select(
        "id, name, headline, location, skills, experience_years, education, parsed, activity_signals(*)",
      )
      .in("id", ids)
      .or(`user_id.eq.${userId},user_id.is.null`);
    if (cErr) throw new Error(cErr.message);

    // 4. Score
    const scored = (candRows ?? []).map((c) => {
      const sigArr = c.activity_signals as Array<Record<string, unknown>> | null;
      const sig = sigArr && sigArr.length > 0 ? sigArr[0] : null;
      const sem = Math.max(0, simMap.get(c.id as string) ?? 0);
      const sk = skillScore(
        (c.skills as string[] | null) ?? [],
        parsed.required_skills,
        parsed.nice_to_have,
      );
      const ex = experienceScore(c.experience_years as number | null, parsed.min_experience_years);
      const beh = behavioralScore(sig as never);
      const breakdown = compositeScore(
        { semantic: sem, skill: sk, experience: ex, behavioral: beh },
        weights,
      );
      const gem = detectHiddenGem((c.skills as string[]) ?? [], c.parsed as any, { skill: sk, behavioral: beh });
      const reasoning = buildReasoning(
        {
          name: c.name as string,
          skills: (c.skills as string[]) ?? [],
          years: c.experience_years as number | null,
          parsed: c.parsed,
        },
        parsed,
        breakdown,
        gem,
      );
      return { candidate: c, breakdown, reasoning };
    });

    scored.sort((a, b) => b.breakdown.final - a.breakdown.final);
    const top = scored.slice(0, topK);

    // 5. Persist run + results
    const { data: run, error: rErr } = await supabaseAdmin
      .from("rankings")
      .insert({
        job_id: data.jobId,
        params: { weights, topK },
        candidates_evaluated: scored.length,
        user_id: userId,
      })
      .select("id")
      .single();
    if (rErr) throw new Error(rErr.message);

    const inserts = top.map((s, idx) => ({
      run_id: run.id,
      candidate_id: (s.candidate as { id: string }).id,
      rank: idx + 1,
      semantic_score: s.breakdown.semantic,
      skill_score: s.breakdown.skill,
      experience_score: s.breakdown.experience,
      behavioral_score: s.breakdown.behavioral,
      final_score: s.breakdown.final,
      reasoning: s.reasoning,
    }));
    const { error: irErr } = await supabaseAdmin.from("ranking_results").insert(inserts);
    if (irErr) throw new Error(irErr.message);

    return {
      runId: run.id as string,
      count: top.length,
      evaluated: scored.length,
      results: top.map((s, idx) => ({
        rank: idx + 1,
        candidate_id: (s.candidate as { id: string }).id,
        name: (s.candidate as { name: string }).name,
        ...s.breakdown,
        reasoning: s.reasoning,
      })),
    };
  });

function buildReasoning(
  cand: { name: string; skills: string[]; years: number | null; parsed: any },
  job: ParsedJob,
  bd: { semantic: number; skill: number; experience: number; behavioral: number },
  gem: any,
) {
  const candSet = new Set(cand.skills.map((s) => s.toLowerCase().trim()));
  const matched = job.required_skills.filter((s) => candSet.has(s.toLowerCase().trim()));
  const missing = job.required_skills.filter((s) => !candSet.has(s.toLowerCase().trim()));
  let summary =
    `${cand.name}: ` +
    `semantic ${(bd.semantic * 100).toFixed(0)}%, ` +
    `skills ${(bd.skill * 100).toFixed(0)}% (${matched.length}/${job.required_skills.length}), ` +
    `experience ${(bd.experience * 100).toFixed(0)}% vs ${job.min_experience_years}y target, ` +
    `behavioral ${(bd.behavioral * 100).toFixed(0)}%`;

  if (cand.parsed) {
    if (cand.parsed.education_tier) {
      summary += `, Education: ${cand.parsed.education_tier}`;
    }
    if (cand.parsed.company_tier) {
      summary += `, Company: ${cand.parsed.company_tier}`;
    }
    if (cand.parsed.notice_period_days !== undefined) {
      summary += `, Notice: ${cand.parsed.notice_period_days}d`;
    }
  }

  if (gem && gem.badgeType !== "none") {
    summary += ` (💎 ${gem.label}: ${gem.reason})`;
  }

  return {
    summary,
    matched_skills: matched,
    missing_skills: missing,
    hidden_gem: gem,
    education_tier: cand.parsed?.education_tier ?? "Tier-3",
    company_tier: cand.parsed?.company_tier ?? "Tier-3",
    notice_period_days: cand.parsed?.notice_period_days ?? 30,
    preferred_locations: cand.parsed?.preferred_locations ?? [],
  };
}

export const listRankings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const { data, error } = await supabaseAdmin
      .from("rankings")
      .select("id, job_id, params, candidates_evaluated, created_at, jobs:job_id(title)")
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id as string,
    job_id: r.job_id as string,
    job_title: (r.jobs as { title: string } | null)?.title ?? "—",
    candidates_evaluated: r.candidates_evaluated as number,
    created_at: r.created_at as string,
    params: r.params,
  }));
});

export const getRanking = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { runId: string }) => z.object({ runId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { data: run, error } = await supabaseAdmin
      .from("rankings")
      .select("*, jobs:job_id(title, description, parsed)")
      .eq("id", data.runId)
      .or(`user_id.eq.${userId},user_id.is.null`)
      .single();
    if (error) throw new Error(error.message);
    const { data: results, error: rErr } = await supabaseAdmin
      .from("ranking_results")
      .select("*, candidates:candidate_id(name, headline, location, skills)")
      .eq("run_id", data.runId)
      .order("rank", { ascending: true });
    if (rErr) throw new Error(rErr.message);
    return { run, results: results ?? [] };
  });

export const exportRanking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { runId: string; format: "csv" | "json" }) =>
    z.object({ runId: z.string().uuid(), format: z.enum(["csv", "json"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { data: run, error } = await supabaseAdmin
      .from("rankings")
      .select("id, job_id")
      .eq("id", data.runId)
      .or(`user_id.eq.${userId},user_id.is.null`)
      .single();
    if (error) throw new Error(error.message);
    const { data: results, error: rErr } = await supabaseAdmin
      .from("ranking_results")
      .select("rank, candidate_id, final_score, semantic_score, skill_score, experience_score, behavioral_score, reasoning, candidates:candidate_id(external_id, name)")
      .eq("run_id", data.runId)
      .order("rank", { ascending: true });
    if (rErr) throw new Error(rErr.message);

    const rows = (results ?? []).map((r) => ({
      job_id: run.job_id,
      candidate_id: (r.candidates as { external_id: string | null } | null)?.external_id ?? r.candidate_id,
      candidate_name: (r.candidates as { name: string } | null)?.name ?? "",
      rank: r.rank,
      final_score: Number(r.final_score).toFixed(4),
      semantic_score: Number(r.semantic_score).toFixed(4),
      skill_score: Number(r.skill_score).toFixed(4),
      experience_score: Number(r.experience_score).toFixed(4),
      behavioral_score: Number(r.behavioral_score).toFixed(4),
      reasoning: (r.reasoning as { summary?: string } | null)?.summary ?? "",
    }));

    if (data.format === "json") {
      return { mime: "application/json", body: JSON.stringify(rows, null, 2) };
    }
    // CSV
    const headers = Object.keys(rows[0] ?? {
      job_id: "",
      candidate_id: "",
      candidate_name: "",
      rank: "",
      final_score: "",
      semantic_score: "",
      skill_score: "",
      experience_score: "",
      behavioral_score: "",
      reasoning: "",
    });
    const escape = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv =
      headers.join(",") +
      "\n" +
      rows.map((r) => headers.map((h) => escape((r as Record<string, unknown>)[h])).join(",")).join("\n");
    return { mime: "text/csv", body: csv };
  });
