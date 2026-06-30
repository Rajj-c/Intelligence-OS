import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Upload, Zap, AlertTriangle, CheckCircle2, Download,
  Github, ExternalLink, Brain, BarChart3, Users, Shield,
  ChevronDown, ChevronUp, Sparkles, Clock, Star, TrendingUp,
  BookOpen, Code2,
} from "lucide-react";
import { useState, useCallback, useRef } from "react";
import { rankHackathonCandidates, type ScoredCandidate, type HackathonCandidate } from "@/lib/hackathon.functions";

export const Route = createFileRoute("/_app/hackathon")({
  head: () => ({
    meta: [{ title: "Hackathon — Redrob India Runs AI Challenge | TalentOS" }],
  }),
  component: HackathonPage,
});

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface RankResult {
  results: ScoredCandidate[];
  total: number;
  n_honeypot: number;
  n_disqualified: number;
  top_k: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function parseInput(text: string): HackathonCandidate[] {
  text = text.trim();
  if (text.startsWith("[")) {
    return JSON.parse(text);
  }
  // JSONL
  return text
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
}

function buildCSV(results: ScoredCandidate[]): string {
  const rows = results
    .slice(0, 100)
    .map((r, i) => {
      const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
      return `${r.candidate_id},${i + 1},${r.rounded_score},${esc(r.reasoning)}`;
    });
  return "candidate_id,rank,score,reasoning\n" + rows.join("\n");
}

function ScoreBar({
  value, label, color, delay = 0,
}: { value: number; label: string; color: string; delay?: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
        <span className="text-[10px] font-mono font-semibold text-foreground">{value.toFixed(0)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, delay, ease: "easeOut" }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const classes =
    rank === 1 ? "bg-gradient-to-br from-amber-400 to-orange-400 text-black" :
    rank === 2 ? "bg-gradient-to-br from-slate-300 to-slate-400 text-black" :
    rank === 3 ? "bg-gradient-to-br from-amber-700 to-amber-600 text-white" :
    "bg-surface-2 border border-border/60 text-muted-foreground";

  return (
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${classes}`}>
      #{rank}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CANDIDATE CARD
// ─────────────────────────────────────────────────────────────────────────────

function CandidateCard({ result, rank, index }: { result: ScoredCandidate; rank: number; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const scoreColor =
    result.rounded_score >= 0.85 ? "text-emerald" :
    result.rounded_score >= 0.70 ? "text-primary" :
    result.rounded_score >= 0.50 ? "text-amber-400" : "text-muted-foreground";

  const noticeBadge =
    result.notice_days <= 30 ? { text: "⚡ Available", cls: "bg-emerald/10 text-emerald border-emerald/20" } :
    result.notice_days <= 60 ? { text: "📅 60d notice", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" } :
    { text: `🕐 ${result.notice_days}d notice`, cls: "bg-destructive/10 text-destructive border-destructive/20" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(0.4, index * 0.03) }}
      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
        result.is_honeypot
          ? "border-destructive/40 bg-destructive/5"
          : result.disqualifiers.length > 0
            ? "border-amber-500/20 bg-amber-500/3"
            : "border-border/40 bg-surface/30 hover:border-primary/30 hover:bg-surface/50"
      }`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <RankBadge rank={rank} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground truncate">
                {result.candidate_id}
              </span>
              {result.is_honeypot && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-destructive/15 text-destructive border border-destructive/30">
                  🚨 HONEYPOT
                </span>
              )}
              {!result.is_honeypot && result.n_core_skills >= 5 && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  ⭐ {result.n_core_skills} core AI skills
                </span>
              )}
              {!result.is_honeypot && result.n_core_skills > 0 && result.n_core_skills < 5 && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-surface-2 text-muted-foreground border border-border/60">
                  {result.n_core_skills} AI skills
                </span>
              )}
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${noticeBadge.cls}`}>
                {noticeBadge.text}
              </span>
              {result.response_rate >= 0.6 && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald/10 text-emerald border border-emerald/20">
                  ✓ Responsive
                </span>
              )}
              {result.disqualifiers.map((d) => (
                <span key={d} className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  ⚠ {d.replace(/-/g, " ")}
                </span>
              ))}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {result.primary_title} · {result.yoe.toFixed(1)} yrs exp
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className={`text-xl font-display font-bold tabular-nums ${scoreColor}`}>
              {(result.rounded_score * 100).toFixed(2)}%
            </div>
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider">match score</div>
          </div>
        </div>

        {/* Score bar (mini, always visible) */}
        {!result.is_honeypot && (
          <div className="mt-3">
            <div className="h-1 rounded-full bg-surface overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${result.rounded_score * 100}%` }}
                transition={{ duration: 1, delay: index * 0.02 }}
                className={`h-full rounded-full ${
                  result.rounded_score >= 0.85
                    ? "bg-gradient-to-r from-emerald to-cyan"
                    : result.rounded_score >= 0.7
                      ? "bg-gradient-to-r from-primary to-cyan"
                      : "bg-gradient-to-r from-amber-500 to-amber-400"
                }`}
              />
            </div>
          </div>
        )}

        {/* Expand toggle */}
        {!result.is_honeypot && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? "Hide" : "Show"} score breakdown
          </button>
        )}
      </div>

      {/* Expanded breakdown */}
      <AnimatePresence>
        {expanded && !result.is_honeypot && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2 border-t border-border/30 pt-3">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <ScoreBar value={result.skills_score} label="Skills Match (×0.30)" color="bg-primary" delay={0.05} />
                <ScoreBar value={result.career_score} label="Career Quality (×0.25)" color="bg-cyan" delay={0.1} />
                <ScoreBar value={result.availability_score} label="Availability (×0.20)" color="bg-emerald" delay={0.15} />
                <ScoreBar value={result.engagement_score} label="Engagement (×0.15)" color="bg-amber-400" delay={0.2} />
                <ScoreBar value={result.education_score} label="Education Tier (×0.10)" color="bg-violet-400" delay={0.25} />
              </div>
              {result.reasoning && (
                <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed border-t border-border/30 pt-2">
                  {result.reasoning}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

function HackathonPage() {
  const rankFn = useServerFn(rankHackathonCandidates);
  const fileRef = useRef<HTMLInputElement>(null);

  const [rankResult, setRankResult] = useState<RankResult | null>(null);
  const [rawInput, setRawInput] = useState("");
  const [topK, setTopK] = useState(100);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);

  const rankMutation = useMutation({
    mutationFn: async (candidates: HackathonCandidate[]) => {
      return rankFn({ data: { candidates, topK } });
    },
    onSuccess: (data) => setRankResult(data as RankResult),
    onError: (e) => setError((e as Error).message),
  });

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    try {
      const text = await file.text();
      const candidates = parseInput(text);
      setRawInput(text.slice(0, 500) + (text.length > 500 ? "..." : ""));
      rankMutation.mutate(candidates);
    } catch (e) {
      setError(`Parse error: ${(e as Error).message}`);
    }
  }, [rankMutation]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const downloadCSV = () => {
    if (!rankResult) return;
    const csv = buildCSV(rankResult.results);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "submission.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const topResults = rankResult?.results ?? [];

  // Summary stats
  const top10Ai = topResults.slice(0, 10).filter((r) => r.n_core_skills >= 3).length;
  const top10Avail = topResults.slice(0, 10).filter((r) => r.availability_score >= 50).length;

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <Trophy size={12} className="text-amber-400" />
            Redrob India Runs AI Challenge
          </div>
          <h1 className="font-display text-4xl text-gradient mt-1">
            Hackathon Demo
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Intelligent Candidate Discovery & Ranking — upload a JSON/JSONL sample,
            run our multi-signal scoring engine, and export a spec-compliant submission CSV.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a
            href="https://github.com/YOUR_USERNAME/redrob-ranker"
            target="_blank"
            rel="noopener noreferrer"
            className="h-9 px-3 rounded-lg bg-surface border border-border/60 text-xs font-medium hover:bg-surface-2 transition-colors flex items-center gap-2"
          >
            <Github size={14} /> GitHub
          </a>
          <button
            onClick={() => setShowMethodology(!showMethodology)}
            className="h-9 px-3 rounded-lg bg-surface border border-border/60 text-xs font-medium hover:bg-surface-2 transition-colors flex items-center gap-2"
          >
            <BookOpen size={14} /> Methodology
          </button>
          {rankResult && (
            <button
              onClick={downloadCSV}
              className="h-9 px-4 rounded-lg bg-gradient-to-r from-primary to-cyan text-primary-foreground text-xs font-semibold flex items-center gap-2 shadow-md hover:opacity-90 transition"
            >
              <Download size={14} /> Download submission.csv
            </button>
          )}
        </div>
      </div>

      {/* ── Methodology Panel ── */}
      <AnimatePresence>
        {showMethodology && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-panel rounded-2xl p-6 border border-border/40 bg-surface/30 space-y-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Code2 size={16} className="text-primary" />
                Scoring Methodology
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { label: "Skills Match", weight: "30%", color: "text-primary", detail: "Trust-weighted: endorsements × duration penalties for keyword stuffers" },
                  { label: "Career Quality", weight: "25%", color: "text-cyan", detail: "Title fit, product vs. IT services, description keywords, tenure stability" },
                  { label: "Availability", weight: "20%", color: "text-emerald", detail: "Open-to-work, last active, notice period, recruiter response rate" },
                  { label: "Engagement", weight: "15%", color: "text-amber-400", detail: "GitHub activity score, profile completeness, platform assessments" },
                  { label: "Education Tier", weight: "10%", color: "text-violet-400", detail: "IIT/IIM tier-1 → local college tier-4, with STEM field bonus" },
                ].map((m) => (
                  <div key={m.label} className="rounded-xl bg-surface/60 p-3 border border-border/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-semibold ${m.color}`}>{m.label}</span>
                      <span className="text-xs font-mono text-muted-foreground">{m.weight}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{m.detail}</p>
                  </div>
                ))}
                <div className="rounded-xl bg-destructive/5 p-3 border border-destructive/20">
                  <div className="text-xs font-semibold text-destructive mb-1">Disqualifiers</div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Entire-career IT services (×0.25), off-domain title (×0.30),
                    no AI skills (×0.35), inactive 6m+ (×0.60)
                  </p>
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground border-t border-border/30 pt-3">
                <span className="font-semibold text-foreground">Honeypot detection:</span> Impossible profiles caught via timeline inconsistencies
                (experience claims vs. career dates, expert proficiency + 0 months usage, date inversions).
                {" "}Pure CPU · No LLM API calls · No network · ~20s for 100K candidates.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Upload Zone ── */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`rounded-2xl border-2 border-dashed transition-all duration-200 p-8 text-center cursor-pointer ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border/40 bg-surface/20 hover:border-primary/50 hover:bg-surface/30"
        }`}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".json,.jsonl"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 grid place-items-center">
            <Upload size={24} className="text-primary" />
          </div>
          <div>
            <div className="font-semibold text-sm">Drop candidates JSON/JSONL here</div>
            <div className="text-xs text-muted-foreground mt-1">
              Supports <code className="text-[10px] bg-surface px-1 py-0.5 rounded">candidates.jsonl</code> (100K full dataset) or{" "}
              <code className="text-[10px] bg-surface px-1 py-0.5 rounded">sample_candidates.json</code>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Top-N results:
              <select
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value))}
                onClick={(e) => e.stopPropagation()}
                className="h-7 px-2 rounded bg-surface border border-border/60 text-foreground text-xs outline-none"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100 (submission)</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      {/* ── Loading ── */}
      {rankMutation.isPending && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-panel rounded-2xl p-8 border border-border/40 text-center"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <div>
              <div className="font-semibold">Scoring candidates…</div>
              <div className="text-xs text-muted-foreground mt-1">
                Running 5-component composite scoring engine
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-destructive shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold text-destructive">Error</div>
            <div className="text-muted-foreground mt-0.5">{error}</div>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      <AnimatePresence>
        {rankResult && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Summary Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Candidates Scored", value: rankResult.total.toLocaleString(), icon: Users, color: "text-primary" },
                { label: "Honeypots Caught", value: rankResult.n_honeypot, icon: Shield, color: "text-destructive" },
                { label: "Top-10 with AI Skills", value: `${top10Ai}/10`, icon: Brain, color: "text-cyan" },
                { label: "Top-10 Available", value: `${top10Avail}/10`, icon: Zap, color: "text-emerald" },
              ].map((m, i) => (
                <motion.div
                  key={m.label}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-panel rounded-2xl p-4 border border-border/40 bg-surface/30"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <m.icon size={14} className={m.color} />
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{m.label}</span>
                  </div>
                  <div className="text-2xl font-display font-bold text-foreground">{m.value}</div>
                </motion.div>
              ))}
            </div>

            {/* Results List */}
            <div className="glass-panel rounded-2xl p-5 border border-border/40 bg-surface/20">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold">
                    <span className="text-gradient">Ranked Candidates</span>
                    <span className="text-muted-foreground text-sm font-normal ml-2">
                      — Top {topResults.length} of {rankResult.total.toLocaleString()}
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sorted by composite score · Click any row to expand score breakdown
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald" />
                  <span className="text-xs text-emerald font-medium">Submission-ready</span>
                </div>
              </div>

              <div className="space-y-2">
                {topResults.map((result, i) => (
                  <CandidateCard
                    key={result.candidate_id}
                    result={result}
                    rank={i + 1}
                    index={i}
                  />
                ))}
              </div>
            </div>

            {/* CSV Preview */}
            <div className="glass-panel rounded-2xl p-5 border border-border/40 bg-surface/20">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Download size={14} className="text-primary" />
                  Submission CSV Preview
                </h3>
                <button
                  onClick={downloadCSV}
                  className="h-8 px-3 rounded-lg bg-primary/15 border border-primary/30 text-primary text-xs font-medium hover:bg-primary/25 transition-colors flex items-center gap-1.5"
                >
                  <Download size={12} /> Download
                </button>
              </div>
              <div className="font-mono text-[10px] text-muted-foreground bg-surface rounded-xl p-3 overflow-x-auto whitespace-pre leading-relaxed border border-border/30">
                {buildCSV(topResults.slice(0, 5)).split("\n").map((line, i) => (
                  <div key={i} className={i === 0 ? "text-foreground font-semibold" : ""}>
                    {line}
                  </div>
                ))}
                {topResults.length > 5 && (
                  <div className="text-muted-foreground/50 mt-1">
                    ... {topResults.length - 5} more rows
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Empty state ── */}
      {!rankResult && !rankMutation.isPending && (
        <div className="glass-panel rounded-2xl p-10 border border-border/40 bg-surface/20 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 grid place-items-center">
              <Sparkles size={28} className="text-primary" />
            </div>
            <div>
              <div className="font-semibold text-lg">Ready to rank</div>
              <div className="text-sm text-muted-foreground mt-1 max-w-sm">
                Upload a <code className="text-xs bg-surface px-1 py-0.5 rounded">candidates.jsonl</code> or{" "}
                <code className="text-xs bg-surface px-1 py-0.5 rounded">sample_candidates.json</code> to see the ranking engine in action.
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3 mt-2 text-left w-full max-w-lg">
              {[
                { icon: Brain, title: "Multi-signal scoring", desc: "Skills, career, availability, engagement, education" },
                { icon: Shield, title: "Honeypot detection", desc: "Impossible profiles filtered out automatically" },
                { icon: TrendingUp, title: "Spec-compliant CSV", desc: "Download submission.csv ready for portal upload" },
              ].map((f) => (
                <div key={f.title} className="rounded-xl bg-surface/60 p-3 border border-border/30">
                  <f.icon size={16} className="text-primary mb-2" />
                  <div className="text-xs font-semibold mb-0.5">{f.title}</div>
                  <div className="text-[10px] text-muted-foreground">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
