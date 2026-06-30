import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { embedOne } from "./ranking/ai-gateway.server";
import { parseJobDescription, jobToEmbedText, type ParsedJob } from "./ranking/parse.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const { data, error } = await supabaseAdmin
      .from("jobs")
      .select("id, title, description, parsed, created_at, embedding")
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((j) => ({
    id: j.id as string,
    title: j.title as string,
    description: j.description as string,
    parsed: (j.parsed as ParsedJob | null) ?? null,
    created_at: j.created_at as string,
    has_embedding: j.embedding != null,
  }));
});

export const getJob = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { data: row, error } = await supabaseAdmin
      .from("jobs")
      .select("id, title, description, parsed, created_at, embedding")
      .eq("id", data.id)
      .or(`user_id.eq.${userId},user_id.is.null`)
      .single();
    if (error) throw new Error(error.message);
    return {
      ...row,
      parsed: (row.parsed as ParsedJob | null) ?? null,
      has_embedding: row.embedding != null,
    };
  });

export const createJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { title: string; description: string }) =>
    z.object({ title: z.string().min(1).max(300), description: z.string().min(10).max(20000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { data: row, error } = await supabaseAdmin
      .from("jobs")
      .insert({ title: data.title, description: data.description, user_id: userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const parseAndEmbedJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { data: job, error } = await supabaseAdmin
      .from("jobs")
      .select("id, title, description")
      .eq("id", data.id)
      .or(`user_id.eq.${userId},user_id.is.null`)
      .single();
    if (error) throw new Error(error.message);

    const parsed = await parseJobDescription(job.title as string, job.description as string);
    const embedding = await embedOne(
      jobToEmbedText({ title: job.title as string, description: job.description as string, parsed }),
    );

    const { error: upErr } = await supabaseAdmin
      .from("jobs")
      .update({ parsed, embedding: embedding as unknown as string, user_id: userId })
      .eq("id", data.id);
    if (upErr) throw new Error(upErr.message);
    return { ok: true, parsed };
  });
