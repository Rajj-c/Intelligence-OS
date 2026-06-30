import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useAuthServerFn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  Briefcase,
  Sparkles,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { listCandidates } from "@/lib/candidates.functions";
import { listJobs } from "@/lib/jobs.functions";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Command Center — TalentOS" }] }),
  component: Dashboard,
});

function Dashboard() {
  const listCandidatesFn = useAuthServerFn(listCandidates);
  const listJobsFn = useAuthServerFn(listJobs);

  const { data: candidates = [] } = useQuery({
    queryKey: ["candidates"],
    queryFn: () => listCandidatesFn({ data: { limit: 200 } }),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => listJobsFn(),
  });

  const embeddedCount = candidates.filter((c) => c.has_embedding).length;
  const embeddedJobCount = jobs.filter((j) => j.has_embedding).length;

  const KPIS = [
    { label: "Active Jobs", value: String(jobs.length), delta: `${embeddedJobCount} parsed`, icon: Briefcase, color: "primary" },
    { label: "Candidates", value: String(candidates.length), delta: `${embeddedCount} embedded`, icon: Users, color: "cyan" },
    { label: "Parsed & Ready", value: String(embeddedCount), delta: "with embeddings", icon: Target, color: "emerald" },
    { label: "Jobs Embedded", value: String(embeddedJobCount), delta: "ready to match", icon: Sparkles, color: "amber" },
  ];

  // Build pipeline stages from real data
  const PIPELINE_DATA = [
    { stage: "Uploaded", value: candidates.length },
    { stage: "Embedded", value: embeddedCount },
    { stage: "Jobs", value: jobs.length },
    { stage: "Jobs Ready", value: embeddedJobCount },
  ].filter((s) => s.value > 0);

  // Top candidates for the list
  const topCandidates = candidates.slice(0, 5);
  const topJobs = jobs.slice(0, 5);

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Recruiter Command Center</div>
          <h1 className="font-display text-4xl text-gradient mt-1">Talent Intelligence OS</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {candidates.length} candidates · {jobs.length} jobs · {embeddedCount} AI-embedded profiles
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/resumes" className="px-4 h-10 rounded-lg bg-surface border border-border/60 text-sm font-medium hover:bg-surface-2 transition-colors flex items-center gap-2">
            <Zap size={14} /> Upload Resumes
          </Link>
          <Link to="/matching" className="px-4 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2">
            <Sparkles size={14} /> Run AI Matching
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPIS.map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="glass-panel rounded-2xl p-5 relative overflow-hidden"
          >
            <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl bg-${k.color}/20`} />
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className={`w-9 h-9 rounded-lg bg-${k.color}/15 border border-${k.color}/30 grid place-items-center text-${k.color}`}>
                  <k.icon size={16} />
                </div>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <ArrowUpRight size={12} /> {k.delta}
                </span>
              </div>
              <div className="mt-4 text-3xl font-display">{k.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{k.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Candidate Embedding Status</h3>
              <p className="text-xs text-muted-foreground">Raw uploads vs. AI-embedded profiles</p>
            </div>
          </div>
          <div className="h-72">
            {PIPELINE_DATA.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={PIPELINE_DATA}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="stage" stroke="#6b7280" fontSize={11} />
                  <YAxis stroke="#6b7280" fontSize={11} />
                  <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8 }} />
                  <Area type="monotone" dataKey="value" stroke="#3B82F6" fill="url(#g1)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full grid place-items-center text-muted-foreground text-sm">
                Upload candidates &amp; jobs to see pipeline data
              </div>
            )}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6">
          <h3 className="font-semibold">Data Pipeline</h3>
          <p className="text-xs text-muted-foreground mb-4">Processing stages</p>
          <div className="h-72">
            {PIPELINE_DATA.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={PIPELINE_DATA} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                  <XAxis type="number" stroke="#6b7280" fontSize={11} />
                  <YAxis dataKey="stage" type="category" stroke="#6b7280" fontSize={11} width={80} />
                  <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8 }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {PIPELINE_DATA.map((_, i) => (
                      <Cell key={i} fill={`hsl(${210 + i * 6}, 80%, ${60 - i * 4}%)`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full grid place-items-center text-muted-foreground text-sm text-center px-4">
                No data yet. Upload CSV files from the Datasets page.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Candidates</h3>
              <p className="text-xs text-muted-foreground">Most recently uploaded</p>
            </div>
            <Link to="/candidates" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {topCandidates.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No candidates yet. <Link to="/resumes" className="text-primary hover:underline">Upload candidates →</Link>
              </div>
            ) : (
              topCandidates.map((c) => {
                const initials = c.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
                const skills = c.skills ?? [];
                return (
                  <Link
                    key={c.id}
                    to="/candidates/$id"
                    params={{ id: c.id }}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-surface/60 transition-colors border border-transparent hover:border-border/60"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-cyan/30 border border-border/60 grid place-items-center text-sm font-semibold">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{c.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {c.headline ?? "Candidate"} {c.location ? `· ${c.location}` : ""}
                      </div>
                    </div>
                    <div className="hidden md:flex gap-1">
                      {skills.slice(0, 3).map((s) => (
                        <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-surface border border-border/60 text-muted-foreground">{s}</span>
                      ))}
                    </div>
                    <div className="text-right">
                      {c.has_embedding ? (
                        <div className="text-xs text-emerald font-semibold">Embedded ✓</div>
                      ) : (
                        <div className="text-xs text-muted-foreground">Not embedded</div>
                      )}
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6">
          <h3 className="font-semibold">Jobs</h3>
          <p className="text-xs text-muted-foreground mb-4">Open roles</p>
          <div className="space-y-3">
            {topJobs.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No jobs yet. <Link to="/resumes" className="text-primary hover:underline">Upload jobs →</Link>
              </div>
            ) : (
              topJobs.map((j) => (
                <div key={j.id} className="p-3 rounded-xl bg-surface/60 border border-border/60">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-medium truncate max-w-[160px]">{j.title}</div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${j.has_embedding ? "bg-emerald/15 text-emerald border border-emerald/30" : "bg-amber/15 text-amber border border-amber/30"}`}>
                      {j.has_embedding ? "Ready" : "Needs embed"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3 text-xs">
                    <span className="text-muted-foreground text-[10px] truncate max-w-[160px]">
                      {j.description?.slice(0, 50)}…
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
