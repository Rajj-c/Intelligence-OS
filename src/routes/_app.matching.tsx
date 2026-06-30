import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuthServerFn } from "@/lib/utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowDown, Brain, FileText, Sparkles, Target, Briefcase, Play, ChevronRight } from "lucide-react";
import { useState } from "react";
import { listJobs } from "@/lib/jobs.functions";
import { runRanking } from "@/lib/ranking.functions";

export const Route = createFileRoute("/_app/matching")({
  head: () => ({ meta: [{ title: "AI Matching Engine — TalentOS" }] }),
  component: MatchingPage,
});

const STEPS = [
  { icon: FileText, label: "Job Description Analysis", detail: "Extracting skills, seniority, and local nuances (LPA, notice)" },
  { icon: Brain, label: "Semantic Parsing", detail: "Generating 1,536-dim embeddings via Gemini" },
  { icon: Sparkles, label: "Vector Search", detail: "Retrieving candidate corpus using HNSW cosine index" },
  { icon: Target, label: "Hybrid Re-Ranking", detail: "Scoring skills overlap, years of exp, and behavioral signals" },
];

function MatchingPage() {
  const jobsFn = useAuthServerFn(listJobs);
  const runFn = useAuthServerFn(runRanking);

  const { data: dbJobs } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => jobsFn(),
  });

  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [pipelineState, setPipelineState] = useState<"idle" | "running" | "complete">("idle");
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [matchResults, setMatchResults] = useState<any[]>([]);
  const [totalEvaluated, setTotalEvaluated] = useState<number>(0);

  const embeddedJobs = (dbJobs ?? []).filter((j) => j.has_embedding);
  const selectedJob = embeddedJobs.find((j) => j.id === selectedJobId);

  const triggerMatch = useMutation({
    mutationFn: async () => {
      setPipelineState("running");
      setCurrentStep(0);
      await new Promise((r) => setTimeout(r, 600));
      setCurrentStep(1);
      await new Promise((r) => setTimeout(r, 600));
      setCurrentStep(2);
      await new Promise((r) => setTimeout(r, 600));
      setCurrentStep(3);
      const res = await runFn({ data: { jobId: selectedJobId, topK: 20 } });
      await new Promise((r) => setTimeout(r, 400));
      return res;
    },
    onSuccess: (data) => {
      setMatchResults(data?.results ?? []);
      setTotalEvaluated(data?.evaluated ?? 0);
      setPipelineState("complete");
    },
    onError: (e) => {
      console.error(e);
      setPipelineState("idle");
      alert(`Matching failed: ${(e as Error).message}`);
    },
  });

  return (
    <div className="p-8 space-y-8">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">AI Matching Engine</div>
        <h1 className="font-display text-4xl text-gradient mt-1">Bharat Match Pipeline</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {pipelineState === "complete" ? (
            <>
              Live execution for <span className="text-foreground font-semibold">{selectedJob?.title}</span> ·{" "}
              <span className="text-primary font-semibold">{totalEvaluated}</span> candidates evaluated
            </>
          ) : (
            "Select an open role to run the localized semantic matching engine."
          )}
        </p>
      </div>

      {/* Selector Card */}
      <div className="glass-panel rounded-2xl p-5 border border-border/40 bg-surface/30 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 grid place-items-center text-primary">
            <Briefcase size={18} />
          </div>
          <div>
            <div className="font-semibold text-sm">Select Open Position</div>
            <p className="text-xs text-muted-foreground">Choose from parsed roles to begin vector candidate match.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            disabled={pipelineState === "running"}
            className="h-10 px-3 rounded-lg bg-surface border border-border/60 text-sm min-w-[260px] text-foreground focus:border-primary outline-none"
          >
            <option value="">Select a job...</option>
            {embeddedJobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>

          <button
            onClick={() => triggerMatch.mutate()}
            disabled={!selectedJobId || pipelineState === "running"}
            className="h-10 px-4 rounded-lg bg-gradient-to-r from-primary to-cyan text-primary-foreground text-sm font-medium flex items-center gap-2 disabled:opacity-50 hover:opacity-90 shadow-md transition-all active:scale-95"
          >
            <Play size={14} /> {pipelineState === "running" ? "Matching..." : "Run AI Pipeline"}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Pipeline Progression Sidebar */}
        <div className="glass-panel rounded-3xl p-6 border border-border/40 bg-surface/30 flex flex-col justify-between h-max">
          <div className="space-y-4">
            <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
              Pipeline Progress
            </div>
            <div className="space-y-3">
              {STEPS.map((s, i) => {
                const stepState =
                  pipelineState === "idle"
                    ? "idle"
                    : pipelineState === "complete"
                      ? "complete"
                      : currentStep > i
                        ? "complete"
                        : currentStep === i
                          ? "active"
                          : "idle";

                return (
                  <div key={s.label} className="relative">
                    <div
                      className={`rounded-2xl p-4 border transition-all duration-300 flex items-start gap-3.5 relative overflow-hidden ${
                        stepState === "complete"
                          ? "bg-emerald/5 border-emerald/20 text-foreground"
                          : stepState === "active"
                            ? "bg-primary/5 border-primary/40 text-foreground ring-1 ring-primary/20"
                            : "bg-surface/30 border-border/40 text-muted-foreground opacity-50"
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl border grid place-items-center shrink-0 transition-colors ${
                          stepState === "complete"
                            ? "bg-emerald/10 border-emerald/30 text-emerald"
                            : stepState === "active"
                              ? "bg-primary/20 border-primary/40 text-primary"
                              : "bg-surface border-border/60 text-muted-foreground"
                        }`}
                      >
                        <s.icon size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold">{s.label}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                          {s.detail}
                        </div>
                      </div>
                      <div className="shrink-0 text-[9px] font-bold uppercase tracking-wider">
                        {stepState === "complete" ? (
                          <span className="text-emerald">Ready</span>
                        ) : stepState === "active" ? (
                          <span className="text-primary animate-pulse">Running</span>
                        ) : (
                          <span>Queue</span>
                        )}
                      </div>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="flex justify-center my-1">
                        <ArrowDown
                          size={12}
                          className={stepState === "complete" ? "text-emerald/60" : "text-muted-foreground/30"}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Matches table list */}
        <div className="lg:col-span-2 glass-panel rounded-3xl p-6 border border-border/40 bg-surface/30">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-lg">
                {pipelineState === "complete" ? "AI Ranked Candidates" : "Match Results"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {pipelineState === "complete"
                  ? "Ranked according to custom India-Context weights. Click row to inspect."
                  : "Select a role above and click 'Run AI Pipeline' to see ranked candidates."}
              </p>
            </div>
            {pipelineState === "complete" && (
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-semibold uppercase tracking-wider">
                Live Result
              </span>
            )}
          </div>

          {pipelineState !== "complete" ? (
            <div className="py-16 text-center text-muted-foreground text-sm space-y-2">
              <Sparkles size={32} className="mx-auto mb-3 text-muted-foreground/40" />
              <p className="font-medium">No results yet</p>
              <p className="text-xs max-w-xs mx-auto">
                Select an embedded job from the dropdown above and click <strong>Run AI Pipeline</strong> to rank your candidates.
              </p>
              {embeddedJobs.length === 0 && (
                <p className="text-xs text-amber mt-2">
                  No embedded jobs found. Go to <Link to="/jobs" className="text-primary hover:underline">Jobs</Link> to parse &amp; embed your jobs first.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {matchResults.map((c, i) => {
                const res = c.reasoning;
                const gem = res?.hidden_gem;
                const hasGem = gem && gem.badgeType !== "none";
                const eduTier = res?.education_tier ?? "Tier-3";
                const compTier = res?.company_tier ?? "Tier-3";
                const notice = res?.notice_period_days ?? 30;

                const initials = c.name
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <motion.div
                    key={c.candidate_id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(0.3, i * 0.04) }}
                  >
                    <Link
                      to="/candidates/$id"
                      params={{ id: c.candidate_id }}
                      className="flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-2xl border border-border/60 bg-surface/40 hover:bg-surface-2/45 hover:border-primary/40 transition-all group relative overflow-hidden"
                    >
                      {hasGem && (
                        <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden pointer-events-none">
                          <div className="bg-amber-500 text-black text-[6px] font-bold uppercase tracking-wider text-center py-0.5 absolute top-2 -right-5 w-16 rotate-45">
                            Gem 💎
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-xs font-mono font-bold text-muted-foreground w-6">
                          #{i + 1}
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-cyan/30 border border-border/60 grid place-items-center text-xs font-semibold text-foreground group-hover:from-primary/50 group-hover:to-cyan/50 transition-all">
                          {initials}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                            {c.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate max-w-[180px] md:max-w-none">
                            {c.role || "Software Engineer"}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 md:flex-1 md:justify-center">
                        {hasGem && (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            💎 {gem.label}
                          </span>
                        )}
                        {eduTier === "Tier-1" && (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            🎓 Tier-1
                          </span>
                        )}
                        {compTier === "Tier-1" && (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-cyan/10 text-cyan border border-cyan/20">
                            🏢 Tier-1 Co.
                          </span>
                        )}
                        <span
                          className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                            notice === 0
                              ? "bg-emerald/10 text-emerald border border-emerald/20"
                              : notice <= 15
                                ? "bg-emerald/5 text-emerald border border-emerald/10"
                                : "bg-surface border border-border/60 text-muted-foreground"
                          }`}
                        >
                          ⏱️ {notice === 0 ? "Immediate" : `${notice}d notice`}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 justify-between md:justify-end shrink-0 w-full md:w-auto border-t border-border/30 md:border-0 pt-2 md:pt-0">
                        <div className="hidden xl:block w-24">
                          <div className="h-1.5 rounded-full bg-surface overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.round(c.final * 100)}%` }}
                              transition={{ delay: 0.2 + i * 0.03, duration: 0.8 }}
                              className="h-full bg-gradient-to-r from-primary to-cyan"
                            />
                          </div>
                          <div className="text-[8px] text-muted-foreground mt-1 flex justify-between">
                            <span>sem: {Math.round(c.semantic * 100)}%</span>
                            <span>skill: {Math.round(c.skill * 100)}%</span>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <div>
                            <div className="text-base font-display font-semibold text-gradient tabular-nums">
                              {Math.round(c.final * 100)}%
                            </div>
                            <div className="text-[8px] text-muted-foreground uppercase tracking-wider">
                              Match Score
                            </div>
                          </div>
                          <ChevronRight
                            size={14}
                            className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all"
                          />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
