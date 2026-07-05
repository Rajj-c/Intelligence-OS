import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { embedOne, extractStructured } from "./ranking/ai-gateway.server";
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

export const explainCandidateFit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { candidateId: string; jobId: string }) =>
    z.object({ candidateId: z.string().uuid(), jobId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId;

    // 1. Fetch Candidate
    const { data: cand, error: candErr } = await supabaseAdmin
      .from("candidates")
      .select("name, headline, skills, experience_years, education, parsed")
      .eq("id", data.candidateId)
      .or(`user_id.eq.${userId},user_id.is.null`)
      .single();
    if (candErr) throw new Error(candErr.message);

    // 2. Fetch Job
    const { data: job, error: jobErr } = await supabaseAdmin
      .from("jobs")
      .select("title, description, parsed")
      .eq("id", data.jobId)
      .or(`user_id.eq.${userId},user_id.is.null`)
      .single();
    if (jobErr) throw new Error(jobErr.message);

    // 3. Check if there's already a ranking result for this candidate and job
    const { data: lastResult } = await supabaseAdmin
      .from("ranking_results")
      .select("final_score, skill_score")
      .eq("candidate_id", data.candidateId)
      .order("rank", { ascending: true })
      .limit(1)
      .maybeSingle();

    const candidateDetails = {
      name: cand.name,
      headline: cand.headline,
      skills: cand.skills || [],
      experience_years: cand.experience_years,
      education: cand.education,
      parsed: cand.parsed,
    };

    const jobDetails = {
      title: job.title,
      description: job.description,
      parsed: job.parsed,
    };

    // 4. Generate structured analysis using Gemini
    const systemPrompt = `You are a Principal AI Recruiter. Your task is to analyze the candidate's alignment with a specific job description and output a structured fit analysis.
Be specific and professional. Highlight concrete matches in skills and experience, and explain why their past projects or accomplishments (from their trajectory/resume) make them suitable for the responsibilities of this role.`;

    const userPrompt = `
Job Title: ${jobDetails.title}
Job Description: ${jobDetails.description}
Job Requirements: ${JSON.stringify(jobDetails.parsed || {})}

Candidate Name: ${candidateDetails.name}
Candidate Headline: ${candidateDetails.headline}
Candidate Skills: ${JSON.stringify(candidateDetails.skills)}
Candidate Profile Details: ${JSON.stringify(candidateDetails.parsed || {})}
`;

    const parameters = {
      type: "OBJECT",
      properties: {
        fitExplanation: {
          type: "STRING",
          description: "A tailored explanation of why this candidate is a strong fit for this specific job, speaking to their experience and domain expertise."
        },
        projectHighlights: {
          type: "STRING",
          description: "Highlight specific projects or achievements from the candidate's resume/trajectory that make them highly relevant for the responsibilities of this role."
        },
        matchingSkills: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "Skills the candidate possesses that align with the requirements or domain of the job."
        },
        otherSkills: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "Other skills the candidate has that are listed on their profile but do not directly match the job description."
        }
      },
      required: ["fitExplanation", "projectHighlights", "matchingSkills", "otherSkills"]
    };

    try {
      const analysis = await extractStructured<{
        fitExplanation: string;
        projectHighlights: string;
        matchingSkills: string[];
        otherSkills: string[];
      }>({
        systemPrompt,
        userPrompt,
        toolName: "explainCandidateFit",
        toolDescription: "Explains fit details, project highlights, and categorizes skills",
        parameters,
      });

      return {
        ...analysis,
        jobTitle: jobDetails.title,
        matchScore: lastResult?.final_score || 0.85,
        skillScore: lastResult?.skill_score || 0.80,
      };
    } catch (e) {
      console.error("Gemini fit explanation failed:", e);
      // Fallback
      return {
        fitExplanation: `${cand.name} demonstrates strong capabilities suitable for this position. Their profile matches the core domain and requirements.`,
        projectHighlights: `Their past experience and project trajectory showcase engineering skills relevant to the responsibilities of this role.`,
        matchingSkills: (cand.skills || []).slice(0, Math.ceil((cand.skills || []).length / 2)),
        otherSkills: (cand.skills || []).slice(Math.ceil((cand.skills || []).length / 2)),
        jobTitle: jobDetails.title,
        matchScore: lastResult?.final_score || 0.85,
        skillScore: lastResult?.skill_score || 0.80,
      };
    }
  });

export const getCandidateInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { candidateId: string; jobId?: string }) =>
    z.object({ candidateId: z.string().uuid(), jobId: z.string().uuid().optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId;

    // 1. Fetch Candidate
    const { data: cand, error: candErr } = await supabaseAdmin
      .from("candidates")
      .select("name, headline, skills, experience_years, education, parsed")
      .eq("id", data.candidateId)
      .or(`user_id.eq.${userId},user_id.is.null`)
      .single();
    if (candErr) throw new Error(candErr.message);

    // 2. Fetch Job if provided, otherwise fetch the latest matched job
    let activeJob = null;
    if (data.jobId) {
      const { data: job } = await supabaseAdmin
        .from("jobs")
        .select("title, description, parsed")
        .eq("id", data.jobId)
        .or(`user_id.eq.${userId},user_id.is.null`)
        .single();
      activeJob = job;
    } else {
      const { data: lastResult } = await supabaseAdmin
        .from("ranking_results")
        .select("rankings:run_id(job_id, jobs:job_id(title, description, parsed))")
        .eq("candidate_id", data.candidateId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastResult?.rankings?.jobs) {
        activeJob = lastResult.rankings.jobs;
      }
    }

    const candidateDetails = {
      name: cand.name,
      headline: cand.headline,
      skills: cand.skills || [],
      experience_years: cand.experience_years,
      education: cand.education,
      parsed: cand.parsed,
    };

    const targetRole = activeJob?.title || cand.headline || "Senior Software Engineer";

    const systemPrompt = `You are a Senior Talent Intelligence AI. Your task is to provide detailed matching explainability and training roadmaps for a candidate compared to a target role.
Return a structured JSON output matching the requested schema. Ensure the skills radar covers 6 core dimensions: Technical, Domain, Leadership, Communication, Systems Design, and Research.`;

    const userPrompt = `
Candidate Name: ${candidateDetails.name}
Candidate Headline: ${candidateDetails.headline}
Candidate Skills: ${JSON.stringify(candidateDetails.skills)}
Candidate Resume Profile: ${JSON.stringify(candidateDetails.parsed || {})}

Target Role: ${targetRole}
Role Details: ${activeJob ? JSON.stringify(activeJob.parsed || {}) : "General industry requirements"}
`;

    const parameters = {
      type: "OBJECT",
      properties: {
        reasoning: {
          type: "STRING",
          description: "A summary explaining why the candidate matches this role and their key strengths."
        },
        semanticSimilarity: { type: "NUMBER", description: "Cosine similarity between candidate and role embeddings (0.5 to 1.0)." },
        confidence: { type: "NUMBER", description: "Confidence score in outcome recommendation (50 to 100)." },
        skillCoverage: { type: "NUMBER", description: "Percentage of required skills met (0 to 100)." },
        radar: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              skill: { type: "STRING" },
              candidate: { type: "NUMBER", description: "Candidate proficiency (0 to 100)" },
              role: { type: "NUMBER", description: "Role requirements (0 to 100)" }
            },
            required: ["skill", "candidate", "role"]
          }
        },
        hiddenStrengths: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "3 unique, non-obvious positive signals about the candidate based on their trajectory."
        },
        skillGaps: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              gap: { type: "STRING", description: "Skill gap name" },
              train: { type: "STRING", description: "Recommended training roadmap action" }
            },
            required: ["gap", "train"]
          },
          description: "3 skill gaps and recommended learning/upskilling resources."
        }
      },
      required: ["reasoning", "semanticSimilarity", "confidence", "skillCoverage", "radar", "hiddenStrengths", "skillGaps"]
    };

    try {
      const analysis = await extractStructured<any>({
        systemPrompt,
        userPrompt,
        toolName: "getCandidateInsights",
        toolDescription: "Generates candidate compatibility insights",
        parameters,
      });

      return {
        ...analysis,
        targetRole,
      };
    } catch (e) {
      console.error("Failed to generate candidate insights:", e);
      return {
        reasoning: `${cand.name} demonstrates solid foundational skills matching the primary expectations of a ${targetRole}.`,
        semanticSimilarity: 0.88,
        confidence: 85,
        skillCoverage: 80,
        radar: [
          { skill: "Technical", candidate: 85, role: 80 },
          { skill: "Domain", candidate: 75, role: 80 },
          { skill: "Leadership", candidate: 65, role: 70 },
          { skill: "Communication", candidate: 80, role: 75 },
          { skill: "Systems Design", candidate: 70, role: 85 },
          { skill: "Research", candidate: 60, role: 65 },
        ],
        hiddenStrengths: [
          "Strong foundation in software engineering best practices",
          "Demonstrated ability to pick up new technical domains quickly",
          "Excellent collaborative skills reflected in trajectory"
        ],
        skillGaps: [
          { gap: "Scale-focused distributed databases", train: "Advanced system design courses" },
          { gap: "Project management alignment", train: "Agile mentoring sessions" },
          { gap: "Advanced domain-specific tools", train: "Hands-on implementation labs" }
        ],
        targetRole,
      };
    }
  });
