import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES (mirror the Python schema)
// ─────────────────────────────────────────────────────────────────────────────

export interface RedrobSkill {
  name: string;
  proficiency: "beginner" | "intermediate" | "advanced" | "expert";
  endorsements: number;
  duration_months: number;
}

export interface CareerEntry {
  company: string;
  title: string;
  start_date: string;
  end_date: string | null;
  duration_months: number;
  is_current: boolean;
  industry: string;
  company_size: string;
  description: string;
}

export interface Education {
  institution: string;
  degree: string;
  field_of_study: string;
  start_year: number;
  end_year: number;
  grade?: string | null;
  tier: "tier_1" | "tier_2" | "tier_3" | "tier_4" | "unknown";
}

export interface RedrobSignals {
  profile_completeness_score: number;
  signup_date: string;
  last_active_date: string;
  open_to_work_flag: boolean;
  profile_views_received_30d: number;
  applications_submitted_30d: number;
  recruiter_response_rate: number;
  avg_response_time_hours: number;
  skill_assessment_scores: Record<string, number>;
  connection_count: number;
  endorsements_received: number;
  notice_period_days: number;
  expected_salary_range_inr_lpa: { min: number; max: number };
  preferred_work_mode: "remote" | "hybrid" | "onsite" | "flexible";
  willing_to_relocate: boolean;
  github_activity_score: number;
  search_appearance_30d: number;
  saved_by_recruiters_30d: number;
  interview_completion_rate: number;
  offer_acceptance_rate: number;
  verified_email: boolean;
  verified_phone: boolean;
  linkedin_connected: boolean;
}

export interface HackathonCandidate {
  candidate_id: string;
  profile: {
    anonymized_name: string;
    headline: string;
    summary: string;
    location: string;
    country: string;
    years_of_experience: number;
    current_title: string;
    current_company: string;
    current_company_size: string;
    current_industry: string;
  };
  career_history: CareerEntry[];
  education: Education[];
  skills: RedrobSkill[];
  certifications?: { name: string; issuer: string; year: number }[];
  languages?: { language: string; proficiency: string }[];
  redrob_signals: RedrobSignals;
}

export interface ScoredCandidate {
  candidate_id: string;
  composite: number;
  rounded_score: number;
  is_honeypot: boolean;
  skills_score: number;
  career_score: number;
  education_score: number;
  availability_score: number;
  engagement_score: number;
  notice_days: number;
  response_rate: number;
  n_core_skills: number;
  primary_title: string;
  yoe: number;
  disqualifiers: string[];
  reasoning: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// JD SIGNAL MAPS (ported from rank.py)
// ─────────────────────────────────────────────────────────────────────────────

const CORE_AI_SKILLS: Record<string, number> = {
  // Tier 1 (8 pts) — Explicitly required
  "sentence-transformers": 8, "sentence transformers": 8, "embeddings": 8,
  "embedding": 8, "vector database": 8, "vector databases": 8,
  "retrieval": 8, "semantic search": 8, "dense retrieval": 8,
  "hybrid retrieval": 8, "hybrid search": 8, "faiss": 8,
  "pinecone": 8, "weaviate": 8, "qdrant": 8, "milvus": 8,
  "chroma": 7, "opensearch": 7, "elasticsearch": 7, "bm25": 7,
  "ndcg": 7, "mrr": 6,
  "ranking": 7, "ranking systems": 8, "learning to rank": 8,
  "learning-to-rank": 8, "ltr": 7, "information retrieval": 8,
  "nlp": 7, "natural language processing": 7,
  "rag": 7, "retrieval augmented generation": 8,
  "recommendation systems": 7, "recommendation system": 7, "recommender systems": 7,
  // Tier 2 (4 pts) — Nice to have
  "fine-tuning llms": 4, "fine-tuning": 4, "lora": 4, "qlora": 4, "peft": 4,
  "llm": 4, "large language models": 4, "transformer": 4, "transformers": 4,
  "bert": 4, "hugging face": 4, "huggingface": 4, "openai": 4,
  "langchain": 3, "xgboost": 4, "gradient boosting": 4, "lightgbm": 4,
  "a/b testing": 4, "a/b test": 4, "evaluation framework": 4,
  "mlflow": 4, "weights & biases": 4, "wandb": 4, "mlops": 4,
  // Tier 3 (2 pts) — General
  "machine learning": 2.5, "deep learning": 2.5, "pytorch": 2.5,
  "tensorflow": 2.5, "scikit-learn": 2, "sklearn": 2, "python": 2,
  "sql": 1.5, "spark": 2, "pyspark": 2, "kafka": 2, "airflow": 2,
  "docker": 2, "kubernetes": 2, "aws": 1.5, "gcp": 1.5, "azure": 1.5,
  "distributed systems": 2.5, "data engineering": 2, "feature engineering": 2,
  "statistical modeling": 2,
  "tts": 1, "speech recognition": 1, "gans": 1.5,
  "image classification": 1, "object detection": 1, "computer vision": 1,
};

const PURE_SERVICES = new Set([
  "tcs", "tata consultancy services", "infosys", "wipro", "accenture",
  "cognizant", "cognizant technology solutions", "capgemini", "hcl",
  "hcl technologies", "tech mahindra", "mphasis", "hexaware",
  "mindtree", "ltimindtree", "l&t infotech",
]);

const GOOD_TITLES: Record<string, number> = {
  "ml engineer": 1.0, "machine learning engineer": 1.0, "ai engineer": 1.0,
  "senior ml engineer": 1.0, "senior machine learning engineer": 1.0,
  "senior ai engineer": 1.0, "research engineer": 0.9, "applied ml": 0.9,
  "applied scientist": 0.9, "search engineer": 1.0, "ranking engineer": 1.0,
  "retrieval engineer": 1.0, "nlp engineer": 0.95, "data scientist": 0.75,
  "senior data scientist": 0.80, "principal data scientist": 0.85,
  "staff engineer": 0.85, "staff ml": 0.90, "backend engineer": 0.5,
  "data engineer": 0.55, "software engineer": 0.45,
  "junior ml": 0.3, "junior machine learning": 0.3,
};

const BAD_TITLES: Record<string, number> = {
  "marketing manager": -0.6, "hr manager": -0.7, "human resources": -0.7,
  "accountant": -0.8, "civil engineer": -0.7, "mechanical engineer": -0.6,
  "graphic designer": -0.8, "content writer": -0.7, "sales executive": -0.8,
  "customer support": -0.7, "project manager": -0.3, "operations manager": -0.4,
  "business analyst": -0.3,
};

const GOOD_DESC_KEYWORDS = [
  "embedding", "retrieval", "ranking", "recommendation", "semantic",
  "vector", "ndcg", "mrr", "a/b test", "evaluation", "production",
  "shipped", "deployed", "latency", "index", "pipeline", "real-time",
  "bert", "transformer", "fine-tun", "lora", "rag", "faiss",
  "elasticsearch", "opensearch", "pytorch", "tensorflow",
];

const PREFERRED_LOCATIONS = new Set([
  "pune", "noida", "hyderabad", "mumbai", "delhi", "bengaluru",
  "bangalore", "gurgaon", "gurugram", "ncr",
]);

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function norm(s: string): string {
  return s.toLowerCase().trim();
}

function daysSince(dateStr: string | null | undefined): number {
  if (!dateStr) return 999;
  try {
    const d = new Date(dateStr);
    const diff = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.round(diff));
  } catch {
    return 999;
  }
}

function skillMatches(skillName: string, key: string): boolean {
  const sn = norm(skillName);
  return sn === key || sn.startsWith(key) || key.includes(sn) || sn.includes(key);
}

function isServicesCompany(company: string): boolean {
  return PURE_SERVICES.has(norm(company));
}

// ─────────────────────────────────────────────────────────────────────────────
// HONEYPOT DETECTION
// ─────────────────────────────────────────────────────────────────────────────

function detectHoneypot(c: HackathonCandidate): boolean {
  const career = c.career_history ?? [];
  const skills = c.skills ?? [];

  // Check 1: Expert + 0 duration on many skills
  const expertZero = skills.filter(
    (s) => s.proficiency === "expert" && (s.duration_months ?? 0) === 0
  ).length;
  if (expertZero >= 5) return true;

  // Check 2: High endorsements + 0 duration
  const imposters = skills.filter(
    (s) => (s.endorsements ?? 0) > 50 && (s.duration_months ?? 0) === 0
  ).length;
  if (imposters >= 3) return true;

  // Check 3: Date inversions in career
  for (const job of career) {
    if (job.start_date && job.end_date) {
      const s = new Date(job.start_date);
      const e = new Date(job.end_date);
      if (s > e) return true;
      const stated = job.duration_months ?? 0;
      const actual =
        (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
      if (stated > actual + 24) return true;
    }
  }

  // Check 4: Claimed YoE >> career dates suggest
  const totalCareerMonths = career.reduce((sum, j) => sum + (j.duration_months ?? 0), 0);
  const statedYoe = c.profile.years_of_experience ?? 0;
  if (statedYoe > 5 && totalCareerMonths > 0 && statedYoe > (totalCareerMonths / 12) * 2.5) {
    return true;
  }

  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORING COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function scoreSkills(c: HackathonCandidate): { score: number; nCore: number } {
  const skills = c.skills ?? [];
  const assessments = c.redrob_signals?.skill_assessment_scores ?? {};
  const seenKeys = new Set<string>();
  let total = 0;
  let nCore = 0;

  for (const skill of skills) {
    const sn = norm(skill.name ?? "");
    let bestPts = 0;
    let bestKey = "";

    for (const [key, pts] of Object.entries(CORE_AI_SKILLS)) {
      if (skillMatches(sn, key) && !seenKeys.has(key) && pts > bestPts) {
        bestPts = pts;
        bestKey = key;
      }
    }
    if (!bestKey || bestPts === 0) continue;
    seenKeys.add(bestKey);

    const profMult: Record<string, number> = {
      expert: 1.2, advanced: 1.0, intermediate: 0.8, beginner: 0.5,
    };
    const pm = profMult[skill.proficiency ?? "beginner"] ?? 0.6;

    const endorsements = skill.endorsements ?? 0;
    const duration = skill.duration_months ?? 0;
    let trust = 1.0;
    if (endorsements === 0 && duration === 0) {
      trust = 0.3;
    } else if (endorsements === 0) {
      trust = 0.6 + Math.min(0.3, duration / 60);
    } else if (duration === 0) {
      trust = 0.5 + Math.min(0.4, endorsements / 50);
    } else {
      trust = Math.min(1.5, 0.7 + endorsements / 40 + duration / 60);
    }

    // Platform assessment bonus
    let bonus = 0;
    for (const [ak, av] of Object.entries(assessments)) {
      if (skillMatches(norm(ak), bestKey) || skillMatches(sn, norm(ak))) {
        bonus = (av / 100) * 0.5;
        break;
      }
    }

    total += bestPts * pm * trust * (1 + bonus);
    if (bestPts >= 7) nCore++;
  }

  return { score: Math.min(100, total * 1.5), nCore };
}

function scoreCareer(c: HackathonCandidate): { score: number; title: string } {
  const profile = c.profile;
  const career = c.career_history ?? [];
  const yoe = profile.years_of_experience ?? 0;
  const currentTitle = norm(profile.current_title ?? "");

  // YoE
  let yoeScore =
    yoe >= 5 && yoe <= 9 ? 100 :
    yoe >= 4 && yoe < 5 ? 75 :
    yoe > 9 && yoe <= 12 ? 80 :
    yoe >= 3 && yoe < 4 ? 55 :
    yoe > 12 ? 65 :
    yoe >= 2 && yoe < 3 ? 35 : 15;

  // Title
  let titleScore = 40;
  for (const [key, mult] of Object.entries(GOOD_TITLES)) {
    if (currentTitle.includes(key)) { titleScore = 40 + 60 * mult; break; }
  }
  for (const [key, pen] of Object.entries(BAD_TITLES)) {
    if (currentTitle.includes(key)) { titleScore = Math.max(5, 40 + 40 * pen); break; }
  }

  // Company quality
  const total = career.length;
  const servicesCount = career.filter((j) => isServicesCompany(j.company ?? "")).length;
  let companyScore = 40;
  if (total === 0) {
    companyScore = 20;
  } else if (servicesCount === total) {
    companyScore = 10;
  } else {
    companyScore = Math.min(100, 40 + (60 * (total - servicesCount)) / total);
  }

  // Description keyword density
  let kwHits = 0;
  for (const job of career) {
    const desc = norm(job.description ?? "");
    for (const kw of GOOD_DESC_KEYWORDS) {
      if (desc.includes(kw)) kwHits++;
    }
  }
  const descScore = Math.min(100, kwHits * 8 + Math.min(kwHits, 10) * 5);

  // Tenure
  const avgTenure = total > 0
    ? career.reduce((sum, j) => sum + (j.duration_months ?? 0), 0) / total
    : 0;
  const tenureScore =
    avgTenure >= 24 ? 100 :
    avgTenure >= 18 ? 80 :
    avgTenure >= 12 ? 60 : 30;

  const score =
    yoeScore * 0.30 +
    titleScore * 0.30 +
    companyScore * 0.20 +
    descScore * 0.12 +
    tenureScore * 0.08;

  return { score, title: profile.current_title ?? "Unknown" };
}

function scoreEducation(c: HackathonCandidate): number {
  const edu = c.education ?? [];
  if (edu.length === 0) return 30;

  let best = 0;
  for (const e of edu) {
    const tierScore: Record<string, number> = {
      tier_1: 100, tier_2: 75, tier_3: 50, tier_4: 25, unknown: 20,
    };
    const ts = tierScore[e.tier ?? "unknown"] ?? 20;
    const field = norm(e.field_of_study ?? "");
    const stemBonus = [
      "computer science", "machine learning", "artificial intelligence",
      "data science", "information technology", "electronics", "mathematics",
      "statistics", "engineering", "information systems",
    ].some((f) => field.includes(f)) ? 15 : 0;
    const deg = norm(e.degree ?? "");
    const degBonus = deg.includes("ph.d") || deg.includes("phd") ? 10 :
      deg.includes("m.tech") || deg.includes("m.e") || deg.includes("m.sc") ? 5 : 0;
    const s = Math.min(100, ts + stemBonus + degBonus);
    if (s > best) best = s;
  }
  return best;
}

function scoreAvailability(c: HackathonCandidate): {
  score: number; noticeDays: number; responseRate: number;
} {
  const sig = c.redrob_signals ?? {} as RedrobSignals;

  const otwScore = sig.open_to_work_flag ? 20 : 0;

  const inactive = daysSince(sig.last_active_date);
  const activityScore =
    inactive <= 14 ? 25 :
    inactive <= 30 ? 20 :
    inactive <= 90 ? 12 :
    inactive <= 180 ? 5 : 0;

  const notice = sig.notice_period_days ?? 90;
  const noticeScore =
    notice <= 0 ? 25 :
    notice <= 15 ? 22 :
    notice <= 30 ? 18 :
    notice <= 60 ? 10 :
    notice <= 90 ? 5 : 0;

  const rr = sig.recruiter_response_rate ?? 0;
  const responseScore =
    rr >= 0.7 ? 15 :
    rr >= 0.5 ? 10 :
    rr >= 0.3 ? 6 :
    rr >= 0.1 ? 3 : 0;

  const interviewScore = (sig.interview_completion_rate ?? 0) * 10;

  const verified =
    (sig.verified_email ? 2 : 0) +
    (sig.verified_phone ? 2 : 0) +
    (sig.linkedin_connected ? 1 : 0);

  const location = norm(c.profile.location ?? "");
  const country = norm(c.profile.country ?? "india");
  const willRelocate = sig.willing_to_relocate ?? false;
  let locationScore = 0;
  if (country === "india") {
    if ([...PREFERRED_LOCATIONS].some((city) => location.includes(city))) {
      locationScore = 5;
    } else if (willRelocate) {
      locationScore = 3;
    } else {
      locationScore = 1;
    }
  } else if (willRelocate) {
    locationScore = 1;
  }

  const score = Math.min(100, otwScore + activityScore + noticeScore + responseScore + interviewScore + verified + locationScore);
  return { score, noticeDays: notice, responseRate: rr };
}

function scoreEngagement(c: HackathonCandidate): number {
  const sig = c.redrob_signals ?? {} as RedrobSignals;

  const github = sig.github_activity_score ?? -1;
  const githubScore =
    github < 0 ? 0 :
    github >= 70 ? 40 :
    github >= 50 ? 30 :
    github >= 25 ? 20 :
    github >= 10 ? 10 : 5;

  const completenessScore = ((sig.profile_completeness_score ?? 0) / 100) * 20;

  const assessments = sig.skill_assessment_scores ?? {};
  const assessVals = Object.values(assessments);
  const assessScore = assessVals.length > 0
    ? (assessVals.reduce((a, b) => a + b, 0) / assessVals.length / 100) * 25
    : 0;

  const saved = Math.min(sig.saved_by_recruiters_30d ?? 0, 20);
  const savedScore = (saved / 20) * 15;

  return Math.min(100, githubScore + completenessScore + assessScore + savedScore);
}

function computeDisqualifier(c: HackathonCandidate): {
  multiplier: number; reasons: string[];
} {
  const profile = c.profile;
  const career = c.career_history ?? [];
  const skills = c.skills ?? [];
  const sig = c.redrob_signals ?? {} as RedrobSignals;

  let multiplier = 1.0;
  const reasons: string[] = [];
  const currentTitle = norm(profile.current_title ?? "");
  const total = career.length;

  // D1: Entire career at IT services
  if (total > 0) {
    const servicesJobs = career.filter((j) => isServicesCompany(j.company ?? "")).length;
    if (servicesJobs === total) {
      multiplier *= 0.25;
      reasons.push("entire-career-IT-services");
    }
  }

  // D2: Off-domain title + no real AI skills
  const badTitleMatch = Object.keys(BAD_TITLES).some((k) => currentTitle.includes(k));
  const relevantSkills = skills.filter((s) => {
    const sn = norm(s.name ?? "");
    return Object.keys(CORE_AI_SKILLS).some((k) => skillMatches(sn, k)) &&
      (s.endorsements ?? 0) > 0 && (s.duration_months ?? 0) > 0;
  }).length;
  if (badTitleMatch && relevantSkills < 2) {
    multiplier *= 0.30;
    reasons.push("off-domain-title-no-skills");
  }

  // D3: Very inactive
  const inactive = daysSince(sig.last_active_date);
  if (inactive > 270) {
    multiplier *= 0.6;
    reasons.push("inactive-270d+");
  } else if (inactive > 180) {
    multiplier *= 0.75;
    reasons.push("inactive-180d+");
  }

  // D4: Not open + very low engagement
  if (!sig.open_to_work_flag && (sig.recruiter_response_rate ?? 0) < 0.05) {
    multiplier *= 0.5;
    reasons.push("not-open-to-work-no-response");
  }

  // D5: No AI skills at all
  const hasAny = skills.some((s) => {
    const sn = norm(s.name ?? "");
    return Object.keys(CORE_AI_SKILLS).some((k) => skillMatches(sn, k));
  });
  if (!hasAny) {
    multiplier *= 0.35;
    reasons.push("no-ai-skills");
  }

  return { multiplier, reasons };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCORING FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

function scoreCandidate(c: HackathonCandidate): ScoredCandidate {
  const cid = c.candidate_id ?? "";

  if (detectHoneypot(c)) {
    return {
      candidate_id: cid, composite: 0, rounded_score: 0, is_honeypot: true,
      skills_score: 0, career_score: 0, education_score: 0,
      availability_score: 0, engagement_score: 0,
      notice_days: 999, response_rate: 0, n_core_skills: 0,
      primary_title: c.profile.current_title ?? "", yoe: c.profile.years_of_experience ?? 0,
      disqualifiers: ["honeypot"], reasoning: "Honeypot candidate — impossible profile signals",
    };
  }

  const { score: skillsScore, nCore } = scoreSkills(c);
  const { score: careerScore, title } = scoreCareer(c);
  const educationScore = scoreEducation(c);
  const { score: availabilityScore, noticeDays, responseRate } = scoreAvailability(c);
  const engagementScore = scoreEngagement(c);
  const { multiplier, reasons } = computeDisqualifier(c);

  const compositeRaw = (
    skillsScore * 0.30 +
    careerScore * 0.25 +
    educationScore * 0.10 +
    availabilityScore * 0.20 +
    engagementScore * 0.15
  ) * multiplier;

  const composite = compositeRaw / 100;
  const rounded_score = Math.round(composite * 10000) / 10000;

  const yoe = c.profile.years_of_experience ?? 0;
  const noticeTxt =
    noticeDays <= 30 ? `notice ${noticeDays}d` :
    noticeDays <= 60 ? `notice ${noticeDays}d (moderate)` :
    `notice ${noticeDays}d (long)`;

  const parts = [
    `${title} with ${yoe.toFixed(1)}yrs`,
    nCore > 0 ? `${nCore} core AI/ML skills` : null,
    noticeTxt,
    `response rate ${responseRate.toFixed(2)}`,
    availabilityScore >= 70 ? "highly available" : availabilityScore >= 40 ? "available" : null,
    reasons.length > 0 ? `penalized: ${reasons[0]}` : null,
  ].filter(Boolean);

  return {
    candidate_id: cid,
    composite,
    rounded_score,
    is_honeypot: false,
    skills_score: skillsScore,
    career_score: careerScore,
    education_score: educationScore,
    availability_score: availabilityScore,
    engagement_score: engagementScore,
    notice_days: noticeDays,
    response_rate: responseRate,
    n_core_skills: nCore,
    primary_title: title,
    yoe,
    disqualifiers: reasons,
    reasoning: parts.join("; "),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVER FUNCTION — exposed to React
// ─────────────────────────────────────────────────────────────────────────────

export const rankHackathonCandidates = createServerFn({ method: "POST" })
  .inputValidator((input: { candidates: HackathonCandidate[]; topK?: number }) =>
    z.object({
      candidates: z.array(z.any()).min(1).max(500),
      topK: z.number().int().min(1).max(200).optional(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const topK = data.topK ?? 100;
    const candidates = data.candidates as HackathonCandidate[];

    const scored = candidates.map(scoreCandidate);

    // Sort: rounded_score desc, candidate_id lex asc (spec requirement)
    scored.sort((a, b) => {
      if (b.rounded_score !== a.rounded_score) return b.rounded_score - a.rounded_score;
      return a.candidate_id.localeCompare(b.candidate_id);
    });

    const top = scored.slice(0, topK);
    const nHoneypot = scored.filter((r) => r.is_honeypot).length;
    const nDisqualified = scored.filter((r) => r.disqualifiers.length > 0 && !r.is_honeypot).length;

    return {
      results: top,
      total: candidates.length,
      n_honeypot: nHoneypot,
      n_disqualified: nDisqualified,
      top_k: topK,
    };
  });

export type RankResult = Awaited<ReturnType<typeof rankHackathonCandidates>>;
