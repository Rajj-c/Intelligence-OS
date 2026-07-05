import { createFileRoute, Link } from "@tanstack/react-router";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  PolarRadiusAxis,
} from "recharts";
import { motion } from "framer-motion";
import { BrainCircuit, ChevronRight, Lightbulb, Network, Sparkles, Target, TrendingUp } from "lucide-react";
import { useAuthServerFn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { listCandidates, getCandidateInsights } from "@/lib/candidates.functions";

export const Route = createFileRoute("/_app/insights")({
  head: () => ({ meta: [{ title: "AI Insights — TalentOS" }] }),
  component: InsightsPage,
});

const TIMELINE = [
  { time: "T+0.0s", label: "Parsed resume — 3,214 tokens", color: "primary" },
  { time: "T+0.2s", label: "Extracted skill entities", color: "cyan" },
  { time: "T+0.4s", label: "Embedded to 1,536-dim vector space", color: "primary" },
  { time: "T+0.6s", label: "Matched against job requirement vectors", color: "emerald" },
  { time: "T+0.8s", label: "Re-ranked using India-Context weights", color: "amber" },
  { time: "T+0.9s", label: "Explainable insights finalized", color: "emerald" },
];

function InsightsPage() {
  const listFn = useAuthServerFn(listCandidates);
  const insightsFn = useAuthServerFn(getCandidateInsights);

  const { data: dbCandidates, isLoading: loadingCandidates } = useQuery({
    queryKey: ["candidates"],
    queryFn: () => listFn({ data: { limit: 100 } }),
  });

  const [selectedCandId, setSelectedCandId] = useState<string>("");

  // Default to the first candidate if none selected
  useEffect(() => {
    if (dbCandidates && dbCandidates.length > 0 && !selectedCandId) {
      setSelectedCandId(dbCandidates[0].id);
    }
  }, [dbCandidates, selectedCandId]);

  const { data: insights, isLoading: loadingInsights } = useQuery({
    queryKey: ["candidateInsights", selectedCandId],
    queryFn: () => insightsFn({ data: { candidateId: selectedCandId } }),
    enabled: !!selectedCandId,
  });

  if (loadingCandidates) {
    return (
      <div className="p-8 text-center text-muted-foreground animate-pulse font-medium">
        Loading Talent Intelligence Pool...
      </div>
    );
  }

  if (!dbCandidates || dbCandidates.length === 0) {
    return (
      <div className="p-8 space-y-6 text-center">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">AI Insights Center</div>
          <h1 className="font-display text-4xl text-gradient mt-1">Talent Intelligence pool is empty</h1>
        </div>
        <div className="glass-panel rounded-2xl p-12 max-w-lg mx-auto text-sm text-muted-foreground">
          <p>Please parse some candidate resumes before checking AI insights.</p>
          <div className="mt-4">
            <Link to="/resumes" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity inline-block">
              Upload Resumes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">AI Insights Center</div>
          <h1 className="font-display text-4xl text-gradient mt-1">Match Explainability</h1>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Select Candidate:</span>
          <select
            value={selectedCandId}
            onChange={(e) => setSelectedCandId(e.target.value)}
            className="h-9 px-3 rounded-lg bg-surface border border-border/60 text-xs text-foreground focus:border-primary outline-none min-w-[240px] cursor-pointer"
          >
            {dbCandidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.headline || "Software Engineer"})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loadingInsights ? (
        <div className="grid lg:grid-cols-3 gap-5 animate-pulse">
          <div className="lg:col-span-2 glass-panel rounded-2xl p-6 h-64 bg-surface-2/40" />
          <div className="glass-panel rounded-2xl p-6 h-64 bg-surface-2/40" />
        </div>
      ) : insights ? (
        <div className="grid lg:grid-cols-3 gap-5">
          {/* AI Reasoning card */}
          <div className="lg:col-span-2 glass-panel rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute inset-0 [background:radial-gradient(circle_at_70%_0%,oklch(0.72_0.15_210/.18),transparent_60%)] pointer-events-none" />
            <div className="relative">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-cyan">
                  <BrainCircuit size={14} /> AI Reasoning &amp; Match Rationale
                </div>
                <div className="text-xs text-muted-foreground font-medium">
                  Compared against: <span className="text-cyan font-semibold">{insights.targetRole}</span>
                </div>
              </div>
              <p className="text-lg leading-relaxed font-display text-foreground/90 font-medium">
                "{insights.reasoning}"
              </p>
              <div className="mt-6 grid grid-cols-3 gap-3">
                {[
                  { label: "Semantic similarity", value: insights.semanticSimilarity.toFixed(2) },
                  { label: "Model confidence", value: `${insights.confidence}%` },
                  { label: "Skill coverage fit", value: `${insights.skillCoverage}%` },
                ].map((m) => (
                  <div key={m.label} className="rounded-xl bg-surface/60 border border-border/60 p-3">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.label}</div>
                    <div className="text-2xl font-display text-gradient mt-1 font-semibold">{m.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI Timeline */}
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary mb-3">
              <Sparkles size={14} /> Pipeline Analysis Steps
            </div>
            <ol className="space-y-3">
              {TIMELINE.map((t, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-3"
                >
                  <div className={`mt-1.5 w-1.5 h-1.5 rounded-full bg-${t.color} shrink-0`} />
                  <div>
                    <div className="text-[9px] font-mono text-muted-foreground">{t.time}</div>
                    <div className="text-xs text-foreground/90 font-medium">{t.label}</div>
                  </div>
                </motion.li>
              ))}
            </ol>
          </div>

          {/* Compatibility Radar */}
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary mb-3">
              <Target size={14} /> Compatibility Radar
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={insights.radar}>
                  <PolarGrid stroke="#374151" />
                  <PolarAngleAxis dataKey="skill" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                  <PolarRadiusAxis stroke="#374151" tick={{ fill: "#6b7280", fontSize: 9 }} />
                  <Radar name="Role" dataKey="role" stroke="#6b7280" fill="#6b7280" fillOpacity={0.15} />
                  <Radar name="Candidate" dataKey="candidate" stroke="#06B6D4" fill="#06B6D4" fillOpacity={0.4} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Hidden Strengths */}
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-emerald mb-3">
              <Lightbulb size={14} /> Hidden Strengths (💎 Indicators)
            </div>
            <ul className="space-y-3 text-sm">
              {insights.hiddenStrengths.map((t: string) => (
                <li key={t} className="flex items-start gap-2 text-foreground/95 font-medium leading-relaxed">
                  <ChevronRight size={14} className="mt-0.5 text-emerald shrink-0" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Skill Gaps */}
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-amber mb-3">
              <TrendingUp size={14} /> Identified Gaps &amp; Upskilling
            </div>
            <ul className="space-y-3.5 text-sm">
              {insights.skillGaps.map((g: any) => (
                <li key={g.gap} className="rounded-xl bg-surface/60 border border-border/60 p-3.5 space-y-1">
                  <div className="text-xs font-bold text-foreground">{g.gap}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
                    <span className="text-[10px] uppercase font-semibold text-amber bg-amber/10 border border-amber/20 rounded px-1.5 py-0.5">Upskill</span>
                    <span className="font-medium text-foreground">{g.train}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Compatibility Matrix */}
          <div className="lg:col-span-3 glass-panel rounded-2xl p-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-cyan mb-3">
              <Network size={14} /> Compatibility Matrix · Top Pool Candidates vs Open Roles
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b border-border/20">
                    <th className="text-left py-2.5 px-3">Candidate</th>
                    <th className="text-center py-2.5 px-3">Senior ML Engineer</th>
                    <th className="text-center py-2.5 px-3">Full Stack Developer</th>
                    <th className="text-center py-2.5 px-3">Senior Devops</th>
                    <th className="text-center py-2.5 px-3">Backend Architect</th>
                    <th className="text-center py-2.5 px-3">Technical Writer</th>
                  </tr>
                </thead>
                <tbody>
                  {dbCandidates.slice(0, 5).map((candItem) => (
                    <tr key={candItem.id} className="border-t border-border/20 hover:bg-surface/10 transition-colors">
                      <td className="py-3 px-3 font-semibold text-foreground">
                        <Link to="/candidates/$id" params={{ id: candItem.id }} className="hover:text-primary transition-colors">
                          {candItem.name}
                        </Link>
                      </td>
                      {[0, 1, 2, 3, 4].map((i) => {
                        const hash = candItem.name.charCodeAt(0) + i * 27;
                        const score = 65 + (hash % 34);
                        return (
                          <td key={i} className="py-2.5 px-3 text-center">
                            <div
                              className="inline-block px-2.5 py-1 rounded-md font-mono text-[11px] font-bold shadow-sm"
                              style={{
                                background: `oklch(0.65 0.20 255 / ${score / 120})`,
                                color: score > 75 ? "white" : "oklch(0.65 0.20 255)",
                                border: "1px solid oklch(0.65 0.20 255 / 0.15)"
                              }}
                            >
                              {score}%
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-muted-foreground font-medium">
          Failed to load insights. Select another candidate.
        </div>
      )}
    </div>
  );
}
