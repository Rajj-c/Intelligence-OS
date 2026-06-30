import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { embedOne } from "./ranking/ai-gateway.server";
import { parseProfile, candidateToEmbedText, type ParsedProfile } from "./ranking/parse.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CandidateRow = {
  id: string;
  external_id: string | null;
  name: string;
  headline: string | null;
  location: string | null;
  skills: string[];
  experience_years: number | null;
  education: string | null;
  has_embedding: boolean;
  created_at: string;
  parsed: any;
  status: string;
};

export const listCandidates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query?: string; limit?: number } | undefined) =>
    z
      .object({ query: z.string().optional(), limit: z.number().int().min(1).max(500).optional() })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    let q = supabaseAdmin
      .from("candidates")
      .select("id, external_id, name, headline, location, skills, experience_years, education, parsed, embedding, created_at, raw_profile")
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 200);

    if (data.query && data.query.trim()) {
      const term = `%${data.query.trim()}%`;
      q = q.or(`name.ilike.${term},headline.ilike.${term},location.ilike.${term}`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []).map(
      (r): CandidateRow => ({
        id: r.id as string,
        external_id: (r.external_id as string | null) ?? null,
        name: r.name as string,
        headline: (r.headline as string | null) ?? null,
        location: (r.location as string | null) ?? null,
        skills: (r.skills as string[] | null) ?? [],
        experience_years: (r.experience_years as number | null) ?? null,
        education: (r.education as string | null) ?? null,
        has_embedding: r.embedding != null,
        created_at: r.created_at as string,
        parsed: r.parsed,
        status: ((r.raw_profile as any)?.status as string) || "shortlisted",
      }),
    );
  });

export const getCandidate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { data: row, error } = await supabaseAdmin
      .from("candidates")
      .select("*, activity_signals(*)")
      .eq("id", data.id)
      .or(`user_id.eq.${userId},user_id.is.null`)
      .single();
    if (error) throw new Error(error.message);

    // Latest ranking result
    const { data: lastResult } = await supabaseAdmin
      .from("ranking_results")
      .select("rank, final_score, semantic_score, skill_score, experience_score, behavioral_score, reasoning, run_id, rankings:run_id(job_id, jobs:job_id(title))")
      .eq("candidate_id", data.id)
      .order("rank", { ascending: true })
      .limit(1)
      .maybeSingle();

    return {
      candidate: {
        ...row,
        parsed: (row.parsed as ParsedProfile | null) ?? null,
        skills: (row.skills as string[] | null) ?? [],
        status: ((row.raw_profile as any)?.status as string) || "shortlisted",
      },
      latest_match: lastResult ?? null,
    };
  });

export const updateCandidateStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; status: string }) =>
    z.object({ id: z.string().uuid(), status: z.string() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { data: row, error: fetchErr } = await supabaseAdmin
      .from("candidates")
      .select("raw_profile, user_id")
      .eq("id", data.id)
      .or(`user_id.eq.${userId},user_id.is.null`)
      .single();
    if (fetchErr) throw new Error(fetchErr.message);

    const raw_profile = {
      ...(row.raw_profile as any || {}),
      status: data.status,
    };

    const { error: updateErr } = await supabaseAdmin
      .from("candidates")
      .update({ raw_profile, user_id: row.user_id || userId })
      .eq("id", data.id);
    if (updateErr) throw new Error(updateErr.message);

    return { ok: true, status: data.status };
  });

export const semanticSearchCandidates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query: string; limit?: number }) =>
    z.object({ query: z.string().min(1).max(500), limit: z.number().int().min(1).max(100).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const vec = await embedOne(data.query);
    const { data: rows, error } = await supabaseAdmin.rpc("match_candidates", {
      query_embedding: vec as unknown as string,
      match_count: data.limit ?? 20,
    });
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) return [];

    const ids = rows.map((r) => r.id);
    const { data: allowedRows } = await supabaseAdmin
      .from("candidates")
      .select("id")
      .in("id", ids)
      .or(`user_id.eq.${userId},user_id.is.null`);
    const allowedIds = new Set((allowedRows ?? []).map((r) => r.id));
    return rows.filter((r) => allowedIds.has(r.id));
  });

export const parseAndEmbedAllCandidates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { limit?: number } | undefined) =>
    z.object({ limit: z.number().int().min(1).max(500).optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { data: rows, error } = await supabaseAdmin
      .from("candidates")
      .select("id, name, headline, skills, experience_years, education, raw_profile")
      .is("embedding", null)
      .or(`user_id.eq.${userId},user_id.is.null`)
      .limit(data.limit ?? 50);
    if (error) throw new Error(error.message);

    let ok = 0;
    const errors: string[] = [];
    for (const r of rows ?? []) {
      try {
        const parsed = await parseProfile({
          name: r.name as string,
          headline: (r.headline as string | null) ?? undefined,
          skills: (r.skills as string[] | null) ?? [],
          experience_years: (r.experience_years as number | null) ?? undefined,
          education: (r.education as string | null) ?? undefined,
          raw: r.raw_profile,
        });
        const emb = await embedOne(
          candidateToEmbedText({
            name: r.name as string,
            headline: r.headline as string | null,
            skills: (r.skills as string[] | null) ?? [],
            education: r.education as string | null,
            parsed,
          }),
        );
        const { error: upErr } = await supabaseAdmin
          .from("candidates")
          .update({ parsed, embedding: emb as unknown as string })
          .eq("id", r.id);
        if (upErr) throw upErr;
        ok++;
      } catch (e) {
        errors.push(`${r.name}: ${(e as Error).message}`);
      }
    }
    return { processed: ok, total: rows?.length ?? 0, errors };
  });

export const createConfirmedGuestUser = createServerFn({ method: "POST" })
  .handler(async () => {
    const guestEmail = "guest@talentos.com";
    const guestPassword = "GuestPassword123!";
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: guestEmail,
      password: guestPassword,
      email_confirm: true,
    });
    if (error) {
      if (
        error.message.includes("already exists") ||
        error.message.includes("already registered") ||
        error.status === 422
      ) {
        return { ok: true };
      }
      throw new Error(error.message);
    }
    return { ok: true };
  });

export const checkUserExists = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string }) => z.object({ email: z.string().email() }).parse(input))
  .handler(async ({ data }) => {
    try {
      const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
      if (error) throw error;
      const exists = (users ?? []).some(u => u.email?.toLowerCase() === data.email.toLowerCase());
      return { exists };
    } catch {
      return { exists: false };
    }
  });
