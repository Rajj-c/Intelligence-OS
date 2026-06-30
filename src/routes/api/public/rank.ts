import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { embedOne, embedTexts } from "@/lib/ranking/ai-gateway.server";
import { parseJobDescription, jobToEmbedText, candidateToEmbedText, parseProfile } from "@/lib/ranking/parse.server";
import {
  DEFAULT_WEIGHTS,
  behavioralScore,
  compositeScore,
  cosineSimilarity,
  experienceScore,
  skillScore,
} from "@/lib/ranking/score";

const RequestSchema = z.object({
  job: z.object({
    title: z.string().min(1).max(300),
    description: z.string().min(10).max(20000),
  }),
  candidates: z
    .array(
      z.object({
        id: z.string().min(1).max(100),
        name: z.string().min(1).max(200),
        headline: z.string().max(500).optional(),
        skills: z.array(z.string().max(80)).max(50).optional(),
        experience_years: z.number().min(0).max(60).optional(),
        education: z.string().max(500).optional(),
        signals: z
          .object({
            engagement_score: z.number().min(0).max(1).optional(),
            response_rate: z.number().min(0).max(1).optional(),
            avg_reply_hours: z.number().min(0).max(1000).optional(),
            last_active_at: z.string().optional(),
            logins_30d: z.number().min(0).max(10000).optional(),
          })
          .optional(),
      }),
    )
    .min(1)
    .max(200),
  weights: z
    .object({
      semantic: z.number().min(0).max(1),
      skill: z.number().min(0).max(1),
      experience: z.number().min(0).max(1),
      behavioral: z.number().min(0).max(1),
    })
    .optional(),
  top_k: z.number().int().min(1).max(100).optional(),
});

const buckets = new Map<string, { count: number; reset: number }>();
function rateLimit(ip: string): boolean {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || b.reset < now) {
    buckets.set(ip, { count: 1, reset: now + 60_000 });
    return true;
  }
  if (b.count >= 10) return false;
  b.count++;
  return true;
}

export const Route = createFileRoute("/api/public/rank")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }),
      POST: async ({ request }) => {
        const cors = {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        };
        const ip =
          request.headers.get("cf-connecting-ip") ??
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          "unknown";
        if (!rateLimit(ip)) {
          return new Response(JSON.stringify({ error: "Rate limited (10/min)" }), {
            status: 429,
            headers: cors,
          });
        }

        let body: z.infer<typeof RequestSchema>;
        try {
          body = RequestSchema.parse(await request.json());
        } catch (e) {
          return new Response(
            JSON.stringify({ error: "Invalid input", details: (e as Error).message }),
            { status: 400, headers: cors },
          );
        }

        const weights = body.weights ?? DEFAULT_WEIGHTS;
        const topK = body.top_k ?? 20;

        try {
          // Parse JD and embed
          const parsed = await parseJobDescription(body.job.title, body.job.description);
          const jobVec = await embedOne(jobToEmbedText({ ...body.job, parsed }));

          // Parse + embed candidates (parallelize cautiously: parse can be skipped for speed)
          const candTexts = body.candidates.map((c) =>
            candidateToEmbedText({
              name: c.name,
              headline: c.headline ?? null,
              skills: c.skills ?? [],
              education: c.education ?? null,
              parsed: null,
            }),
          );
          const candVecs = await embedTexts(candTexts);

          const scored = body.candidates.map((c, i) => {
            const sem = Math.max(0, cosineSimilarity(jobVec, candVecs[i] ?? []));
            const sk = skillScore(c.skills ?? [], parsed.required_skills, parsed.nice_to_have);
            const ex = experienceScore(c.experience_years ?? null, parsed.min_experience_years);
            const beh = behavioralScore(c.signals ?? null);
            const bd = compositeScore({ semantic: sem, skill: sk, experience: ex, behavioral: beh }, weights);
            const candSet = new Set((c.skills ?? []).map((s) => s.toLowerCase().trim()));
            const matched = parsed.required_skills.filter((s) => candSet.has(s.toLowerCase().trim()));
            const missing = parsed.required_skills.filter((s) => !candSet.has(s.toLowerCase().trim()));
            return {
              candidate_id: c.id,
              name: c.name,
              ...bd,
              reasoning: {
                summary: `${c.name}: semantic ${(bd.semantic * 100).toFixed(0)}%, skills ${(bd.skill * 100).toFixed(0)}% (${matched.length}/${parsed.required_skills.length}), experience ${(bd.experience * 100).toFixed(0)}%, behavioral ${(bd.behavioral * 100).toFixed(0)}%`,
                matched_skills: matched,
                missing_skills: missing,
              },
            };
          });

          scored.sort((a, b) => b.final - a.final);
          const ranked = scored.slice(0, topK).map((r, idx) => ({ rank: idx + 1, ...r }));

          return new Response(
            JSON.stringify({
              job: { title: body.job.title, parsed },
              weights,
              evaluated: scored.length,
              ranked,
            }),
            { headers: cors },
          );
        } catch (e) {
          console.error("rank error", e);
          return new Response(
            JSON.stringify({ error: (e as Error).message ?? "Internal error" }),
            { status: 500, headers: cors },
          );
        }
      },
    },
  },
});
