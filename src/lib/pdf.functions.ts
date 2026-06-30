import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { extractStructured } from "./ranking/ai-gateway.server";
import { PDFParse } from "pdf-parse";

// Output shape Gemini must fill in from resume text
interface ParsedResume {
  name: string;
  headline: string;
  location: string;
  skills: string[];
  experience_years: number;
  education: string;
  raw_summary: string;
}

const SYSTEM_PROMPT = `You are an expert resume parser. Given raw resume text, extract structured candidate information accurately.
Be conservative — if a field is not clearly stated, return an empty string or 0.
For skills, return a comprehensive flat list of technologies, tools, frameworks, and domains mentioned.
For experience_years, return the TOTAL years of professional experience as a number (e.g. 4.5).
For education, return the highest degree and institution (e.g. "B.Tech Computer Science, IIT Bombay").
For headline, return a concise professional title based on their current or most recent role.`;

const RESUME_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string", description: "Full name of the candidate" },
    headline: { type: "string", description: "Professional title / current role" },
    location: { type: "string", description: "City, Country" },
    skills: {
      type: "array",
      items: { type: "string" },
      description: "All technical skills, tools, frameworks, languages mentioned",
    },
    experience_years: {
      type: "number",
      description: "Total professional experience in years",
    },
    education: {
      type: "string",
      description: "Highest qualification and institution",
    },
    raw_summary: {
      type: "string",
      description: "2-3 sentence professional summary of the candidate",
    },
  },
  required: ["name", "headline", "location", "skills", "experience_years", "education", "raw_summary"],
};

/**
 * Ingests one or more PDF resumes (base64-encoded) using pdf-parse on the server
 * to extract text, then uses Gemini to extract structured candidate fields,
 * and finally saves them to Supabase.
 */
export const ingestResumePdfs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      resumes: z.array(
        z.object({
          filename: z.string(),
          base64: z.string(),
        })
      ),
    })
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const results: { filename: string; name: string; status: "ok" | "error"; error?: string }[] = [];
    const inserts: Record<string, unknown>[] = [];

    for (const resume of data.resumes) {
      try {
        // Decode base64 to buffer
        const buffer = Buffer.from(resume.base64, "base64");
        
        // Extract text using PDFParse class
        const parser = new PDFParse({ data: buffer });
        const pdfData = await parser.getText();
        const text = pdfData.text;
        await parser.destroy();

        if (!text || text.trim().length < 50) {
          results.push({ filename: resume.filename, name: "", status: "error", error: "Could not extract enough text from PDF" });
          continue;
        }

        // Truncate to avoid token limits (~8k chars ≈ ~2k tokens)
        const snippet = text.slice(0, 8000);

        const parsed = await extractStructured<ParsedResume>({
          systemPrompt: SYSTEM_PROMPT,
          userPrompt: snippet,
          toolName: "save_candidate",
          toolDescription: "Save structured candidate data extracted from resume",
          parameters: RESUME_SCHEMA,
        });

        inserts.push({
          external_id: `pdf_${resume.filename.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_${Date.now()}`,
          name: parsed.name || resume.filename.replace(".pdf", ""),
          headline: parsed.headline || null,
          location: parsed.location || null,
          skills: parsed.skills ?? [],
          experience_years: parsed.experience_years > 0 ? parsed.experience_years : null,
          education: parsed.education || null,
          raw_profile: { source: "pdf", filename: resume.filename, raw_summary: parsed.raw_summary },
          user_id: userId,
        });

        results.push({ filename: resume.filename, name: parsed.name, status: "ok" });
      } catch (e) {
        results.push({
          filename: resume.filename,
          name: "",
          status: "error",
          error: (e as Error).message.slice(0, 120),
        });
      }
    }

    let inserted = 0;
    if (inserts.length > 0) {
      const { data: rows, error } = await supabaseAdmin
        .from("candidates")
        .insert(inserts as never)
        .select("id");
      if (error) throw new Error(error.message);
      inserted = rows?.length ?? 0;
    }

    return { inserted, results };
  });
