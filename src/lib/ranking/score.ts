// Pure scoring math. No env, no IO — safe to import anywhere.

export type Weights = {
  semantic: number;
  skill: number;
  experience: number;
  behavioral: number;
};

export const DEFAULT_WEIGHTS: Weights = {
  semantic: 0.5,
  skill: 0.25,
  experience: 0.1,
  behavioral: 0.15,
};

const normalizeSkill = (s: string) => s.toLowerCase().trim().replace(/[._-]+/g, " ");

export function skillScore(
  candidateSkills: string[],
  requiredSkills: string[],
  niceToHave: string[],
): number {
  if (requiredSkills.length === 0 && niceToHave.length === 0) return 0.5;
  const cand = new Set(candidateSkills.map(normalizeSkill));
  const reqHit = requiredSkills.filter((s) => cand.has(normalizeSkill(s))).length;
  const niceHit = niceToHave.filter((s) => cand.has(normalizeSkill(s))).length;
  const reqDen = Math.max(1, requiredSkills.length);
  const niceDen = Math.max(1, niceToHave.length);
  const reqRatio = reqHit / reqDen;
  const niceRatio = niceHit / niceDen;
  // Required skills weighted 75%, nice 25%.
  return Math.max(0, Math.min(1, reqRatio * 0.75 + niceRatio * 0.25));
}

export function experienceScore(candidateYears: number | null | undefined, targetYears: number): number {
  const y = Number(candidateYears ?? 0);
  if (targetYears <= 0) return 0.7;
  // Gaussian centered on target, sigma scaled to allow ±3y near full credit.
  const sigma = Math.max(2, targetYears * 0.5);
  const diff = y - targetYears;
  // Slight asymmetry: over-experienced still good (clamped), under-experienced penalized more.
  const eff = diff >= 0 ? diff * 0.5 : diff;
  return Math.exp(-(eff * eff) / (2 * sigma * sigma));
}

export type BehavioralInput = {
  engagement_score?: number | null;
  response_rate?: number | null;
  avg_reply_hours?: number | null;
  last_active_at?: string | Date | null;
  logins_30d?: number | null;
};

export function behavioralScore(b: BehavioralInput | null | undefined): number {
  if (!b) return 0.5; // neutral when no signal
  const engagement = clamp(b.engagement_score ?? 0);
  const response = clamp(b.response_rate ?? 0);
  const replySpeed = b.avg_reply_hours == null ? 0.5 : clamp(1 - Number(b.avg_reply_hours) / 168); // <168h = 1 week
  const recency = recencyDecay(b.last_active_at);
  const activity = clamp((b.logins_30d ?? 0) / 30);
  // Weighted blend
  return clamp(
    engagement * 0.3 + response * 0.25 + replySpeed * 0.15 + recency * 0.2 + activity * 0.1,
  );
}

function clamp(n: number) {
  return Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
}

function recencyDecay(d: string | Date | null | undefined): number {
  if (!d) return 0.4;
  const t = new Date(d).getTime();
  if (!Number.isFinite(t)) return 0.4;
  const daysAgo = (Date.now() - t) / (1000 * 60 * 60 * 24);
  // half-life ~30 days
  return clamp(Math.pow(0.5, daysAgo / 30));
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
export type ScoreBreakdown = {
  semantic: number;
  skill: number;
  experience: number;
  behavioral: number;
  final: number;
};

export function compositeScore(
  parts: { semantic: number; skill: number; experience: number; behavioral: number },
  weights: Weights = DEFAULT_WEIGHTS,
): ScoreBreakdown {
  const w = weights;
  const wSum = w.semantic + w.skill + w.experience + w.behavioral || 1;
  const final =
    (parts.semantic * w.semantic +
      parts.skill * w.skill +
      parts.experience * w.experience +
      parts.behavioral * w.behavioral) /
    wSum;
  return { ...parts, final: clamp(final) };
}

export type HiddenGemTag = {
  label: string;
  reason: string;
  badgeType: "prodigy" | "operator" | "immediate" | "none";
};

export function detectHiddenGem(
  skills: string[],
  parsed: {
    education_tier?: "Tier-1" | "Tier-2" | "Tier-3";
    company_tier?: "Tier-1" | "Tier-2" | "Tier-3";
    notice_period_days?: number;
  } | null | undefined,
  scores: { skill: number; behavioral: number }
): HiddenGemTag {
  if (!parsed) {
    return { label: "", reason: "", badgeType: "none" };
  }

  // 1. Off-campus Prodigy: High technical skills (skill score > 0.8), but from a Tier-3 college
  if (scores.skill >= 0.8 && parsed.education_tier === "Tier-3") {
    return {
      label: "Off-campus Prodigy",
      reason: "High skill match (>80%) from a Tier-3 college, demonstrating strong self-taught proficiency.",
      badgeType: "prodigy",
    };
  }

  // 2. Fast-track Operator: Experience at a Tier-1 startup/unicorn + short notice period (<= 30 days)
  if (parsed.company_tier === "Tier-1" && parsed.notice_period_days !== undefined && parsed.notice_period_days <= 30) {
    return {
      label: "Fast-track Operator",
      reason: "Experienced in high-growth Tier-1 startup environments and available within 30 days.",
      badgeType: "operator",
    };
  }

  // 3. Immediate High-Fit: Immediate joiner (<= 15 days notice) + Skill score > 0.75
  if (parsed.notice_period_days !== undefined && parsed.notice_period_days <= 15 && scores.skill >= 0.75) {
    return {
      label: "Immediate High-Fit",
      reason: "High skill overlap (>75%) and available to start within 15 days.",
      badgeType: "immediate",
    };
  }

  return { label: "", reason: "", badgeType: "none" };
}

