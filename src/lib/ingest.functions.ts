import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import Papa from "papaparse";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CandidateRow = z.object({
  external_id: z.string().optional(),
  name: z.string().min(1),
  headline: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  skills: z.union([z.string(), z.array(z.string())]).optional(),
  experience_years: z.union([z.string(), z.number()]).optional(),
  education: z.string().optional().nullable(),
  // any extra columns captured into raw
}).passthrough();

const JobRow = z.object({
  external_id: z.string().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
}).passthrough();

const SIGNAL_KEYS = new Set([
  "logins_30d",
  "response_rate",
  "avg_reply_hours",
  "applications_90d",
  "tenure_months_avg",
  "last_active_at",
  "engagement_score",
]);

function toSkillsArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof v === "string") {
    if (v.trim().startsWith("[")) {
      try {
        const arr = JSON.parse(v);
        if (Array.isArray(arr)) return arr.map(String).map((s) => s.trim()).filter(Boolean);
      } catch {}
    }
    return v.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function parseFile(content: string, format: "csv" | "json"): Record<string, unknown>[] {
  if (format === "json") {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray((parsed as { data?: unknown[] }).data)) {
      return (parsed as { data: Record<string, unknown>[] }).data;
    }
    throw new Error("JSON must be an array or {data: [...]}");
  }
  const res = Papa.parse<Record<string, unknown>>(content, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });
  if (res.errors.length) {
    throw new Error(`CSV parse error: ${res.errors[0].message}`);
  }
  return res.data;
}

export const ingestCandidates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { content: string; format: "csv" | "json" }) => input)
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const rows = parseFile(data.content, data.format);
    if (rows.length === 0) return { inserted: 0, errors: [] as string[] };
    if (rows.length > 5000) throw new Error("Max 5000 candidates per upload");

    const errors: string[] = [];
    const candidateInserts: Array<Record<string, unknown>> = [];
    const signalInserts: Array<Record<string, unknown> & { external_id: string }> = [];

    rows.forEach((raw, i) => {
      const parsed = CandidateRow.safeParse(raw);
      if (!parsed.success) {
        errors.push(`Row ${i + 1}: ${parsed.error.issues[0]?.message}`);
        return;
      }
      const r = parsed.data;
      const external_id = String(r.external_id ?? `row_${i}`);
      const expYearsRaw = r.experience_years;
      const expYears =
        expYearsRaw == null || expYearsRaw === ""
          ? null
          : Number(expYearsRaw);

      // Separate behavioral signals from the rest into raw_profile
      const raw_profile: Record<string, unknown> = {};
      const signalRaw: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(r)) {
        if (SIGNAL_KEYS.has(k)) signalRaw[k] = v;
        else if (!["external_id", "name", "headline", "location", "skills", "experience_years", "education"].includes(k)) {
          raw_profile[k] = v;
        }
      }

      candidateInserts.push({
        external_id,
        name: r.name,
        headline: r.headline ?? null,
        location: r.location ?? null,
        skills: toSkillsArray(r.skills),
        experience_years: expYears,
        education: r.education ?? null,
        raw_profile,
        user_id: userId,
      });

      if (Object.keys(signalRaw).length > 0) {
        signalInserts.push({
          external_id,
          logins_30d: Number(signalRaw.logins_30d ?? 0) || 0,
          response_rate: Number(signalRaw.response_rate ?? 0) || 0,
          avg_reply_hours: Number(signalRaw.avg_reply_hours ?? 72) || 72,
          applications_90d: Number(signalRaw.applications_90d ?? 0) || 0,
          tenure_months_avg: Number(signalRaw.tenure_months_avg ?? 0) || 0,
          last_active_at: signalRaw.last_active_at ? new Date(String(signalRaw.last_active_at)).toISOString() : null,
          engagement_score: Number(signalRaw.engagement_score ?? 0) || 0,
          raw: signalRaw,
        });
      }
    });

    // Bulk insert candidates
    const { data: inserted, error } = await supabaseAdmin
      .from("candidates")
      .insert(candidateInserts as never)
      .select("id, external_id");
    if (error) throw new Error(error.message);

    // Map external_id → uuid for signal inserts
    const idMap = new Map((inserted ?? []).map((r) => [r.external_id, r.id]));
    const signalsToInsert = signalInserts
      .map(({ external_id, ...rest }) => {
        const cid = idMap.get(external_id);
        return cid ? { candidate_id: cid, ...rest } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    if (signalsToInsert.length > 0) {
      const { error: sigErr } = await supabaseAdmin.from("activity_signals").insert(signalsToInsert);
      if (sigErr) errors.push(`Signals: ${sigErr.message}`);
    }

    return { inserted: inserted?.length ?? 0, errors };
  });

export const ingestJobs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { content: string; format: "csv" | "json" }) => input)
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const rows = parseFile(data.content, data.format);
    const errors: string[] = [];
    const jobInserts: Array<Record<string, unknown>> = [];
    rows.forEach((raw, i) => {
      const parsed = JobRow.safeParse(raw);
      if (!parsed.success) {
        errors.push(`Row ${i + 1}: ${parsed.error.issues[0]?.message}`);
        return;
      }
      const r = parsed.data;
      jobInserts.push({
        title: r.title,
        description: r.description,
        user_id: userId,
        raw_requirements: Object.fromEntries(
          Object.entries(r).filter(([k]) => !["title", "description"].includes(k)),
        ),
      });
    });
    const { data: inserted, error } = await supabaseAdmin
      .from("jobs")
      .insert(jobInserts as never)
      .select("id");
    if (error) throw new Error(error.message);
    return { inserted: inserted?.length ?? 0, errors };
  });

export const clearDataset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const { data: runs } = await supabaseAdmin.from("rankings").select("id").eq("user_id", userId);
    const runIds = (runs ?? []).map((r) => r.id);
    if (runIds.length > 0) {
      await supabaseAdmin.from("ranking_results").delete().in("run_id", runIds);
    }
    await supabaseAdmin.from("rankings").delete().eq("user_id", userId);

    const { data: cands } = await supabaseAdmin.from("candidates").select("id").eq("user_id", userId);
    const candIds = (cands ?? []).map((c) => c.id);
    if (candIds.length > 0) {
      await supabaseAdmin.from("activity_signals").delete().in("candidate_id", candIds);
    }
    await supabaseAdmin.from("candidates").delete().eq("user_id", userId);
    await supabaseAdmin.from("jobs").delete().eq("user_id", userId);
    return { ok: true };
  });

export const datasetStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const [c, j, s, r] = await Promise.all([
      supabaseAdmin.from("candidates").select("id", { count: "exact", head: true }).or(`user_id.eq.${userId},user_id.is.null`),
      supabaseAdmin.from("jobs").select("id", { count: "exact", head: true }).or(`user_id.eq.${userId},user_id.is.null`),
      supabaseAdmin.from("activity_signals").select("candidate_id, candidates!inner(user_id)", { count: "exact", head: true }).or(`user_id.eq.${userId},user_id.is.null`, { foreignTable: "candidates" }),
      supabaseAdmin.from("rankings").select("id", { count: "exact", head: true }).or(`user_id.eq.${userId},user_id.is.null`),
    ]);
    return {
      candidates: c.count ?? 0,
      jobs: j.count ?? 0,
      signals: s.count ?? 0,
      rankings: r.count ?? 0,
    };
  });
