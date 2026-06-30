import { motion } from "framer-motion";
import {
  Brain,
  Network,
  Sparkles,
  Target,
  BarChart3,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      const start = performance.now();
      const dur = 1600;
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / dur);
        setVal(Math.floor(to * (1 - Math.pow(1 - t, 3))));
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      io.disconnect();
    });
    io.observe(el);
    return () => io.disconnect();
  }, [to]);
  return (
    <span ref={ref} className="tabular-nums">
      {val.toLocaleString()}
      {suffix}
    </span>
  );
}

export function TrustSection() {
  const stats = [
    { value: 97, suffix: "%", label: "AI Matching Accuracy" },
    { value: 2400000, suffix: "+", label: "Candidates Analyzed" },
    { value: 184000, suffix: "+", label: "Hiring Decisions Assisted" },
    { value: 62, suffix: "%", label: "Avg. Time-to-Hire Reduction" },
  ];
  return (
    <section className="relative py-24 px-6 border-y border-border/40 bg-surface/30">
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="text-center"
          >
            <div className="text-4xl md:text-5xl font-display text-gradient">
              <Counter to={s.value} suffix={s.suffix} />
            </div>
            <div className="mt-2 text-sm text-muted-foreground uppercase tracking-wider">
              {s.label}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

const FEATURES = [
  { icon: Brain, title: "Semantic Talent Discovery", desc: "Move past keyword search. Our transformer models understand intent, context and adjacent expertise." },
  { icon: Sparkles, title: "Explainable AI Ranking", desc: "Every score is auditable. See the evidence, weights and signals behind each recommendation." },
  { icon: Network, title: "Candidate Intelligence Graph", desc: "Visualize relationships between skills, roles, companies and career trajectories in real time." },
  { icon: Target, title: "Skill Gap Analysis", desc: "Pinpoint precisely what's missing — and what training would close the gap fastest." },
  { icon: TrendingUp, title: "Predictive Hiring Success", desc: "Models trained on outcomes forecast retention, performance and ramp-up time per candidate." },
  { icon: BarChart3, title: "Recruitment Analytics", desc: "Executive dashboards for pipeline health, funnel conversion and team performance." },
];

export function FeaturesSection() {
  return (
    <section id="features" className="relative py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-primary mb-4">
            <ShieldCheck size={14} /> Enterprise Intelligence Suite
          </div>
          <h2 className="font-display text-4xl md:text-5xl text-gradient leading-tight">
            An operating system for modern talent teams.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Six tightly-integrated intelligence modules that turn raw resumes and job specs into
            decision-ready insight.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="glass-panel rounded-2xl p-6 group hover:border-primary/40 transition-all relative overflow-hidden"
            >
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary mb-5 group-hover:scale-110 transition-transform">
                  <f.icon size={20} />
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function IntelligenceSection() {
  return (
    <section id="intelligence" className="relative py-32 px-6 overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center relative">
        <div>
          <div className="text-xs uppercase tracking-widest text-accent mb-4">The Intelligence Layer</div>
          <h2 className="font-display text-4xl md:text-5xl text-gradient leading-tight mb-6">
            Decisions backed by evidence — not gut feeling.
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-8">
            TalentOS ingests resumes, job descriptions, performance data, and market signals
            through a unified semantic pipeline. Every recommendation arrives with reasoning,
            confidence and the raw signals you can drill into.
          </p>
          <ul className="space-y-3">
            {[
              "Transformer-based candidate embeddings",
              "Explainable ranking with per-skill attribution",
              "Bias-audited models with SOC 2 compliance",
              "Private deployment with zero data retention option",
            ].map((t) => (
              <li key={t} className="flex items-start gap-3 text-sm">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-cyan" />
                <span className="text-foreground/90">{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass-panel rounded-3xl p-8 relative">
          <div className="absolute inset-0 rounded-3xl pointer-events-none [background:radial-gradient(circle_at_30%_0%,oklch(0.65_0.20_255/.25),transparent_60%)]" />
          <div className="relative space-y-4">
            {[
              { name: "Aarav Mehta", role: "Senior ML Engineer", score: 96, color: "emerald" },
              { name: "Sofia Bianchi", role: "Staff Data Scientist", score: 92, color: "primary" },
              { name: "Daniel Okafor", role: "Applied Researcher", score: 88, color: "cyan" },
              { name: "Yuki Tanaka", role: "MLOps Lead", score: 81, color: "amber" },
            ].map((c, i) => (
              <motion.div
                key={c.name}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-4 p-3 rounded-xl bg-surface/60 border border-border/40"
              >
                <div className={`w-10 h-10 rounded-full bg-${c.color}/20 border border-${c.color}/40 flex items-center justify-center text-sm font-semibold`}>
                  {c.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{c.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{c.role}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold tabular-nums text-gradient">{c.score}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">match</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function CTASection() {
  return (
    <section id="enterprise" className="relative py-32 px-6">
      <div className="max-w-4xl mx-auto glass-panel rounded-3xl p-12 md:p-16 text-center relative overflow-hidden glow-border">
        <div className="absolute inset-0 [background:var(--gradient-glow)]" />
        <div className="relative">
          <h2 className="font-display text-4xl md:text-6xl text-gradient leading-tight">
            Bring intelligence to every hire.
          </h2>
          <p className="mt-6 text-muted-foreground max-w-xl mx-auto">
            Deploy TalentOS to your recruiting org in days. Pilot in a single team, scale across
            the enterprise.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="/dashboard" className="px-8 py-3 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-[var(--shadow-glow)]">
              Start Recruiting
            </a>
            <a href="/login" className="px-8 py-3 rounded-full border border-border bg-surface/60 text-sm font-medium hover:bg-surface transition-colors">
              Request Demo
            </a>
          </div>
        </div>
      </div>
      <footer className="max-w-6xl mx-auto mt-20 pt-8 border-t border-border/40 flex flex-wrap justify-between gap-4 text-xs text-muted-foreground">
        <div>© 2026 TalentOS · An AI Talent Intelligence Platform</div>
        <div className="flex gap-6">
          <a href="#" className="hover:text-foreground">Security</a>
          <a href="#" className="hover:text-foreground">Privacy</a>
          <a href="#" className="hover:text-foreground">Terms</a>
        </div>
      </footer>
    </section>
  );
}
