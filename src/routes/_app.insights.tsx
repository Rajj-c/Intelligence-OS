import { createFileRoute } from "@tanstack/react-router";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";
import { BrainCircuit, ChevronRight, Lightbulb, Network, Sparkles, Target, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_app/insights")({
  head: () => ({ meta: [{ title: "AI Insights — TalentOS" }] }),
  component: InsightsPage,
});

// Illustrative radar — shows how the AI scoring dimensions work
const SKILL_RADAR = [
  { skill: "Technical", candidate: 0, role: 85 },
  { skill: "Domain", candidate: 0, role: 80 },
  { skill: "Leadership", candidate: 0, role: 70 },
  { skill: "Communication", candidate: 0, role: 75 },
  { skill: "Systems Design", candidate: 0, role: 88 },
  { skill: "Research", candidate: 0, role: 65 },
];

const TIMELINE = [
  { time: "T+0.0s", label: "Parsed resume — 3,214 tokens", color: "primary" },
  { time: "T+0.2s", label: "Extracted 47 skill entities", color: "cyan" },
  { time: "T+0.4s", label: "Embedded to 1,536-dim vector", color: "primary" },
  { time: "T+0.6s", label: "Matched against 12k role corpus", color: "emerald" },
  { time: "T+0.8s", label: "Re-ranked using outcome model", color: "amber" },
  { time: "T+0.9s", label: "Final score: 96 (top 3.2%)", color: "emerald" },
];

function InsightsPage() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">AI Insights Center</div>
        <h1 className="font-display text-4xl text-gradient mt-1">Why this candidate matched</h1>
        <p className="text-sm text-muted-foreground mt-1">Full explainability for <span className="text-foreground">Aarav Mehta</span> → Senior ML Engineer</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute inset-0 [background:radial-gradient(circle_at_70%_0%,oklch(0.72_0.15_210/.18),transparent_60%)] pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-cyan mb-3">
              <BrainCircuit size={14} /> AI Reasoning
            </div>
            <p className="text-lg leading-relaxed font-display">
              "Candidate demonstrates strong NLP expertise through transformer-based projects and
              practical deployment experience. Their work on retrieval-augmented systems and
              quantization research closely matches the role's priorities."
            </p>
            <div className="mt-6 grid sm:grid-cols-3 gap-3">
              {[
                { label: "Semantic similarity", value: "0.94" },
                { label: "Outcome model confidence", value: "0.89" },
                { label: "Skill coverage", value: "92%" },
              ].map((m) => (
                <div key={m.label} className="rounded-xl bg-surface/60 border border-border/60 p-3">
                  <div className="text-xs text-muted-foreground">{m.label}</div>
                  <div className="text-2xl font-display text-gradient mt-1">{m.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary mb-3">
            <Sparkles size={14} /> AI Reasoning Timeline
          </div>
          <ol className="space-y-3">
            {TIMELINE.map((t, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-start gap-3"
              >
                <div className={`mt-1 w-2 h-2 rounded-full bg-${t.color} shrink-0`} />
                <div>
                  <div className="text-[10px] font-mono text-muted-foreground">{t.time}</div>
                  <div className="text-sm">{t.label}</div>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>

        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary mb-3">
            <Target size={14} /> Compatibility Radar
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <RadarChart data={SKILL_RADAR}>
                <PolarGrid stroke="#374151" />
                <PolarAngleAxis dataKey="skill" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                <Radar name="Role" dataKey="role" stroke="#6b7280" fill="#6b7280" fillOpacity={0.15} />
                <Radar name="Candidate" dataKey="candidate" stroke="#06B6D4" fill="#06B6D4" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-emerald mb-3">
            <Lightbulb size={14} /> Hidden Strengths
          </div>
          <ul className="space-y-2 text-sm">
            {[
              "Cross-team mentoring patterns suggest senior IC trajectory",
              "Open-source maintainership not listed on resume",
              "Cited in 3 industry retrieval benchmarks",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2"><ChevronRight size={14} className="mt-0.5 text-emerald" /><span>{t}</span></li>
            ))}
          </ul>
        </div>

        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-amber mb-3">
            <TrendingUp size={14} /> Skill Gaps & Training
          </div>
          <ul className="space-y-2 text-sm">
            {[
              { gap: "Distributed inference orchestration", train: "Ray Serve workshop · 12h" },
              { gap: "Enterprise security review process", train: "Internal Day-1 module" },
              { gap: "Customer-facing technical writing", train: "Coaching pairing" },
            ].map((g) => (
              <li key={g.gap} className="rounded-lg bg-surface/60 border border-border/60 p-3">
                <div className="text-sm">{g.gap}</div>
                <div className="text-xs text-muted-foreground mt-1">→ {g.train}</div>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-3 glass-panel rounded-2xl p-6">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-cyan mb-3">
            <Network size={14} /> Compatibility Matrix · Top Candidates × Open Roles
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="text-left py-2 px-2">Candidate</th>
                  {["Senior ML", "Staff DS", "Applied NLP", "MLOps", "Backend"].map((r) => (
                    <th key={r} className="text-center py-2 px-2">{r}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {["Aarav Mehta", "Sofia Bianchi", "Daniel Okafor", "Yuki Tanaka", "Priya Nair"].map((n) => (
                  <tr key={n} className="border-t border-border/40">
                    <td className="py-2 px-2 font-medium">{n}</td>
                    {[0, 1, 2, 3, 4].map((i) => {
                      const v = Math.floor(50 + Math.random() * 50);
                      return (
                        <td key={i} className="py-1 px-2 text-center">
                          <div className="inline-block px-2 py-1 rounded font-mono" style={{ background: `oklch(0.65 0.20 255 / ${v / 120})`, color: v > 70 ? "white" : "#cbd5e1" }}>
                            {v}
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
    </div>
  );
}
