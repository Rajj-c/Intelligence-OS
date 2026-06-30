import { extractStructured } from "./ai-gateway.server";

export type ParsedJob = {
  required_skills: string[];
  nice_to_have: string[];
  min_experience_years: number;
  seniority: "junior" | "mid" | "senior" | "staff" | "principal";
  domain: string;
  responsibilities: string[];
};

export type ParsedProfile = {
  normalized_skills: string[];
  seniority: "junior" | "mid" | "senior" | "staff" | "principal";
  primary_domain: string;
  trajectory: string; // one-line summary
  strengths: string[];
  // Indian context fields
  education_tier: "Tier-1" | "Tier-2" | "Tier-3";
  company_tier: "Tier-1" | "Tier-2" | "Tier-3";
  notice_period_days: number;
  preferred_locations: string[];
};

export async function parseJobDescription(title: string, description: string): Promise<ParsedJob> {
  return extractStructured<ParsedJob>({
    systemPrompt:
      "You are a senior technical recruiter specializing in the Indian tech ecosystem. Extract structured hiring requirements from job descriptions. " +
      "Understand Hinglish, local recruitment phrases, and compensation terms (e.g. 'LPA' for Lakhs Per Annum, 'Cr' for Crores). " +
      "Normalize skill names (e.g. 'k8s' → 'Kubernetes').",
    userPrompt: `Title: ${title}\n\nDescription:\n${description}`,
    toolName: "extract_job_requirements",
    toolDescription: "Structured requirements for a role",
    parameters: {
      type: "object",
      properties: {
        required_skills: { type: "array", items: { type: "string" }, maxItems: 20 },
        nice_to_have: { type: "array", items: { type: "string" }, maxItems: 15 },
        min_experience_years: { type: "number" },
        seniority: { type: "string", enum: ["junior", "mid", "senior", "staff", "principal"] },
        domain: { type: "string" },
        responsibilities: { type: "array", items: { type: "string" }, maxItems: 10 },
      },
      required: ["required_skills", "nice_to_have", "min_experience_years", "seniority", "domain", "responsibilities"],
    },
  });
}

export async function parseProfile(input: {
  name: string;
  headline?: string;
  skills?: string[];
  experience_years?: number;
  education?: string;
  raw?: unknown;
}): Promise<ParsedProfile> {
  const text =
    `Name: ${input.name}\n` +
    `Headline: ${input.headline ?? ""}\n` +
    `Skills: ${(input.skills ?? []).join(", ")}\n` +
    `Years: ${input.experience_years ?? ""}\n` +
    `Education: ${input.education ?? ""}\n` +
    `Raw: ${JSON.stringify(input.raw ?? {}).slice(0, 4000)}`;
  return extractStructured<ParsedProfile>({
    systemPrompt:
      "You are a talent intelligence analyst specializing in the Indian tech hiring ecosystem. " +
      "Normalize the candidate profile and extract Indian-context information.\n\n" +
      "CRITERIA FOR TIERS:\n" +
      "- education_tier:\n" +
      "  * 'Tier-1': IITs, NITs, BITS Pilani, IISc, top IIITs (e.g. IIIT Hyderabad/Bangalore), DTU, NSUT, IIMs, or elite global institutions (MIT, CMU, Stanford).\n" +
      "  * 'Tier-2': Good state or private universities (e.g. VIT Vellore, Manipal MIT, SRM, Thapar, RVCE, PES University, COEP, PSG, etc.).\n" +
      "  * 'Tier-3': All other regional colleges.\n" +
      "- company_tier:\n" +
      "  * 'Tier-1': Elite global product MNCs (Google, Microsoft, Amazon, Meta, Apple, Netflix, Uber) or top-tier high-growth Indian startups/unicorns (Flipkart, Swiggy, Zomato, Razorpay, CRED, Zerodha, Ola, PhonePe, InMobi, Paytm).\n" +
      "  * 'Tier-2': Growing mid-market product companies, well-funded Series-B+ startups, or premium agencies.\n" +
      "  * 'Tier-3': Large traditional Indian IT service companies (TCS, Infosys, Wipro, Cognizant, Tech Mahindra, HCL, LTI Mindtree) or small local agencies.\n\n" +
      "- notice_period_days: Extract notice period in days. E.g., 'immediate' / 'serving notice' -> 0. '15 days' -> 15. If not specified, default to 30.\n" +
      "- preferred_locations: Preferred cities (e.g. Bengaluru, Hyderabad, Pune, Gurugram, Noida, Mumbai, Chennai). If not specified, infer from current location or default to ['Bengaluru'].",
    userPrompt: text,
    toolName: "normalize_profile",
    toolDescription: "Normalized candidate profile",
    parameters: {
      type: "object",
      properties: {
        normalized_skills: { type: "array", items: { type: "string" }, maxItems: 25 },
        seniority: { type: "string", enum: ["junior", "mid", "senior", "staff", "principal"] },
        primary_domain: { type: "string" },
        trajectory: { type: "string" },
        strengths: { type: "array", items: { type: "string" }, maxItems: 5 },
        education_tier: { type: "string", enum: ["Tier-1", "Tier-2", "Tier-3"] },
        company_tier: { type: "string", enum: ["Tier-1", "Tier-2", "Tier-3"] },
        notice_period_days: { type: "number" },
        preferred_locations: { type: "array", items: { type: "string" } },
      },
      required: [
        "normalized_skills",
        "seniority",
        "primary_domain",
        "trajectory",
        "strengths",
        "education_tier",
        "company_tier",
        "notice_period_days",
        "preferred_locations",
      ],
    },
  });
}

export function jobToEmbedText(j: { title: string; description: string; parsed?: ParsedJob }) {
  const p = j.parsed;
  return [
    j.title,
    j.description,
    p ? `Required: ${p.required_skills.join(", ")}` : "",
    p ? `Nice: ${p.nice_to_have.join(", ")}` : "",
    p ? `Domain: ${p.domain}` : "",
    p ? `Seniority: ${p.seniority}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function candidateToEmbedText(c: {
  name: string;
  headline?: string | null;
  skills?: string[] | null;
  education?: string | null;
  parsed?: ParsedProfile | null;
}) {
  return [
    c.name,
    c.headline ?? "",
    `Skills: ${(c.skills ?? []).join(", ")}`,
    c.education ?? "",
    c.parsed ? `Domain: ${c.parsed.primary_domain}` : "",
    c.parsed ? `Trajectory: ${c.parsed.trajectory}` : "",
    c.parsed ? `Strengths: ${c.parsed.strengths.join(", ")}` : "",
    c.parsed ? `Education Tier: ${c.parsed.education_tier}` : "",
    c.parsed ? `Company Tier: ${c.parsed.company_tier}` : "",
    c.parsed ? `Notice Period: ${c.parsed.notice_period_days} days` : "",
    c.parsed ? `Preferred Locations: ${(c.parsed.preferred_locations ?? []).join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

