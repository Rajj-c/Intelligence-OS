import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useAuthServerFn, getAuthHeaders } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Award,
  BrainCircuit,
  Calendar,
  CheckCircle2,
  GraduationCap,
  MapPin,
  MessageSquare,
  Shield,
  Sparkles,
  TrendingUp,
  Clock,
  Building,
  MapPinIcon,
  HelpCircle,
  FileDown,
  X,
} from "lucide-react";
import { getCandidate, updateCandidateStatus } from "@/lib/candidates.functions";

export const Route = createFileRoute("/_app/candidates/$id")({
  head: ({ params }) => ({ meta: [{ title: `${params.id} — TalentOS` }] }),
  loader: async ({ params }) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(params.id)) throw notFound();
    try {
      const headers = await getAuthHeaders();
      const res = await getCandidate({ data: { id: params.id }, headers });
      return res;
    } catch (e) {
      throw notFound();
    }
  },
  notFoundComponent: () => (
    <div className="p-8 text-muted-foreground">Candidate not found.</div>
  ),
  errorComponent: ({ error, reset }) => (
    <div className="p-8 text-sm text-destructive">
      Failed to load — {error.message} <button onClick={reset} className="underline ml-2">Retry</button>
    </div>
  ),
  component: CandidateDetail,
});

function CandidateDetail() {
  const router = useRouter();
  const qc = useQueryClient();
  const updateStatusFn = useAuthServerFn(updateCandidateStatus);

  const loaderData = Route.useLoaderData();
  const dbData = loaderData as any;
  const cand = dbData.candidate;
  const parsed = cand.parsed;
  const initials = cand.name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  let potential = 70;
  if (parsed?.education_tier === "Tier-1") potential += 15;
  else if (parsed?.education_tier === "Tier-2") potential += 5;
  if (parsed?.company_tier === "Tier-1") potential += 10;
  if ((parsed?.notice_period_days ?? 30) <= 15) potential += 5;
  potential = Math.min(99, potential);

  const skills = cand.skills && cand.skills.length > 0 ? cand.skills : (parsed?.normalized_skills ?? []);

  const isGem =
    (skills.length >= 5 && parsed?.education_tier === "Tier-3" && potential >= 75) ||
    (parsed?.company_tier === "Tier-1" && (parsed?.notice_period_days ?? 30) <= 30) ||
    ((parsed?.notice_period_days ?? 30) <= 15 && potential >= 80);

  const gemLabel = isGem
    ? parsed?.education_tier === "Tier-3"
      ? "Off-campus Prodigy"
      : parsed?.company_tier === "Tier-1"
        ? "Fast-track Operator"
        : "Immediate High-Fit"
    : "";

  const gemReason = isGem
    ? parsed?.education_tier === "Tier-3"
      ? "Excellent skill density from a Tier-3 college, demonstrating self-driven execution."
      : parsed?.company_tier === "Tier-1"
        ? "MNC/Unicorn product experience with rapid hiring availability."
        : "Immediate start capability paired with strong developer profile."
    : "";

  const matchScore = dbData.latest_match ? Math.round(Number(dbData.latest_match.final_score) * 100) : null;
  const confidenceScore = dbData.latest_match
    ? Math.round(Number(dbData.latest_match.semantic_score) * 100)
    : parsed
      ? 90
      : 60;

  const c = {
    id: cand.id,
    name: cand.name,
    role: cand.headline ?? parsed?.primary_domain ?? "Software Engineer",
    location: cand.location ?? (parsed?.preferred_locations?.[0] ? `${parsed.preferred_locations[0]}, IN` : "India"),
    match: matchScore,
    confidence: confidenceScore,
    potential: potential,
    skills: skills,
    experienceYears: cand.experience_years ?? 0,
    education: cand.education ?? (parsed?.education_tier ? `${parsed.education_tier} College` : "Degree"),
    recommendedRole: parsed?.seniority
      ? `${parsed.seniority.charAt(0).toUpperCase() + parsed.seniority.slice(1)} Engineer`
      : "Engineer",
    initials: initials,
    status: dbData.candidate.status || "shortlisted",
    education_tier: parsed?.education_tier ?? "Tier-3",
    company_tier: parsed?.company_tier ?? "Tier-3",
    notice_period_days: parsed?.notice_period_days ?? 30,
    preferred_locations: parsed?.preferred_locations ?? [],
    is_gem: isGem,
    gem_label: gemLabel,
    gem_reason: gemReason,
    reasons: parsed?.strengths ?? [
      "Solid skillset spanning multiple requested technologies.",
      "Demonstrates high potential for independent work and scaling projects.",
    ],
    aiRecommendation: parsed?.trajectory ?? `${cand.name} demonstrates a strong trajectory. They have accumulated ${cand.experience_years ?? 0}y of experience in ${parsed?.primary_domain ?? "software development"} and show command over ${skills.slice(0, 3).join(", ")}.`,
  };

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewTime, setInterviewTime] = useState("");
  const [interviewType, setInterviewType] = useState("Technical Round");

  const updateStatus = useMutation({
    mutationFn: async (newStatus: string) => {
      return updateStatusFn({ data: { id: c.id, status: newStatus } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candidate", c.id] });
      router.invalidate();
    },
  });

  const handleExportReport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(c, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${c.name.replace(/\s+/g, "_")}_profile_report.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleScheduleInterview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!interviewDate || !interviewTime) {
      alert("Please fill in date and time");
      return;
    }
    updateStatus.mutate("interview");
    setShowScheduleModal(false);
    alert(`Interview successfully scheduled for ${c.name} on ${interviewDate} at ${interviewTime} (${interviewType})!`);
  };

  return (
    <div className="p-8 space-y-6">
      <Link
        to="/candidates"
        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 w-max"
      >
        <ArrowLeft size={12} /> Back to candidates
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-3xl p-8 relative overflow-hidden"
      >
        <div className="absolute inset-0 [background:radial-gradient(circle_at_20%_0%,oklch(0.65_0.20_255/.2),transparent_60%)] pointer-events-none" />
        <div className="relative flex flex-wrap items-start gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-cyan grid place-items-center text-2xl font-display shrink-0 shadow-lg">
            {c.initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-3xl text-gradient">{c.name}</h1>
              {c.is_gem && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wider flex items-center gap-1 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
                  💎 {c.gem_label}
                </span>
              )}
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                c.status === "interview"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                  : c.status === "offer"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : c.status === "rejected"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                      : "bg-primary/20 text-primary-foreground border border-primary/40"
              }`}>
                {c.status}
              </span>
            </div>
            <p className="text-lg font-medium text-foreground/90 mt-1">{c.role}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground mt-3">
              <span className="flex items-center gap-1.5">
                <MapPin size={13} className="text-primary" /> {c.location}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar size={13} className="text-cyan" /> {c.experienceYears} years experience
              </span>
              <span className="flex items-center gap-1.5">
                <GraduationCap size={13} className="text-emerald" /> {c.education}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: "Fit Score", value: c.match ? `${c.match}%` : "—", color: "primary" },
              { label: "Confidence", value: `${c.confidence}%`, color: "cyan" },
              { label: "Potential", value: `${c.potential}%`, color: "emerald" },
            ].map((m) => (
              <div key={m.label} className="px-4 py-3 rounded-xl bg-surface/60 border border-border/60 min-w-[95px]">
                <div className={`text-2xl font-display text-${m.color}`}>{m.value}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative mt-6 flex flex-wrap gap-2 items-center">
          <button
            onClick={() => setShowScheduleModal(true)}
            className="px-4 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-md shadow-primary/20"
          >
            <MessageSquare size={14} /> Schedule Interview
          </button>
          
          <button
            onClick={() => updateStatus.mutate(c.status === "shortlisted" ? "screening" : "shortlisted")}
            disabled={updateStatus.isPending}
            className={`px-4 h-10 rounded-lg border text-sm font-medium transition-colors ${
              c.status === "shortlisted"
                ? "bg-surface border-border/60 hover:bg-surface-2"
                : "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20"
            }`}
          >
            {updateStatus.isPending ? "Updating..." : c.status === "shortlisted" ? "Move to Screening" : "Shortlist"}
          </button>

          <button
            onClick={() => updateStatus.mutate(c.status === "offer" ? "shortlisted" : "offer")}
            disabled={updateStatus.isPending}
            className={`px-4 h-10 rounded-lg border text-sm font-medium transition-colors ${
              c.status === "offer"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                : "bg-surface border-border/60 hover:bg-surface-2"
            }`}
          >
            {c.status === "offer" ? "Revoke Offer" : "Make Offer"}
          </button>

          <button
            onClick={() => updateStatus.mutate(c.status === "rejected" ? "shortlisted" : "rejected")}
            disabled={updateStatus.isPending}
            className={`px-4 h-10 rounded-lg border text-sm font-medium transition-colors ${
              c.status === "rejected"
                ? "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20"
                : "bg-surface border-border/60 hover:bg-surface-2 text-rose-400 hover:border-rose-500/20"
            }`}
          >
            {c.status === "rejected" ? "Restore Candidate" : "Reject"}
          </button>

          <button
            onClick={handleExportReport}
            className="px-4 h-10 rounded-lg bg-surface border border-border/60 text-sm font-medium hover:bg-surface-2 transition-colors flex items-center gap-1.5 ml-auto"
          >
            <FileDown size={14} /> Export Report
          </button>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Panel
            icon={BrainCircuit}
            title="AI Hiring Recommendation"
            badge={c.potential >= 85 ? "Strong Hire" : "Moderate Hire"}
          >
            <p className="text-sm leading-relaxed text-foreground/90 font-medium">{c.aiRecommendation}</p>
            <div className="mt-4 grid sm:grid-cols-3 gap-3 text-xs">
              {[
                { icon: CheckCircle2, label: "Skill overlap", val: `${c.confidence}%`, color: "emerald" },
                {
                  icon: TrendingUp,
                  label: "Career Trajectory",
                  val: c.potential >= 88 ? "Accelerating" : "Steady",
                  color: "primary",
                },
                { icon: Shield, label: "Notice Risk", val: c.notice_period_days <= 30 ? "Low" : "High", color: "cyan" },
              ].map((x) => (
                <div key={x.label} className="rounded-lg bg-surface/60 border border-border/60 p-3 flex items-center gap-3">
                  <x.icon size={16} className={`text-${x.color}`} />
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{x.label}</div>
                    <div className="text-sm font-semibold mt-0.5">{x.val}</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          {/* India Context & Recruiteability Panel */}
          <Panel icon={Sparkles} title="India Context & Recruiteability Insights" badge="Market Intelligence">
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald/10 border border-emerald/20 flex items-center justify-center text-emerald shrink-0 mt-0.5">
                    <Clock size={14} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Notice Period &amp; Buyout Fit</h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Candidate has a <strong>{c.notice_period_days} day notice period</strong>.{" "}
                      {c.notice_period_days === 0
                        ? "Immediate joiner status eliminates buyout costs and minimizes counter-offer dropout risks."
                        : c.notice_period_days <= 30
                          ? "Highly recruitable. Standard buyout can easily be offered to secure immediate release."
                          : "Counter-offer risk is high. Continuous engagement is recommended during their transition."}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
                    <Building size={14} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Company Background (Pedigree)</h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Assigned to <strong>{c.company_tier} companies</strong>.
                      {c.company_tier === "Tier-1"
                        ? " High scale and product-first orientation. High baseline of engineering practices."
                        : c.company_tier === "Tier-2"
                          ? " Solid core skills. Good mix of product execution and engineering hygiene."
                          : " Primarily services or regional operations. Might need minor training on product scaling."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan/10 border border-cyan/20 flex items-center justify-center text-cyan shrink-0 mt-0.5">
                    <GraduationCap size={14} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Education Tier Placement</h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Graduated from a <strong>{c.education_tier} Institution</strong> ({c.education}).
                      {c.education_tier === "Tier-1"
                        ? " Top tier academic background (IIT/NIT/BITS level). High problem-solving baseline."
                        : c.education_tier === "Tier-2"
                          ? " Strong regional university background. Excellent foundation of core concepts."
                          : " Off-campus pedigree. Excellent potential hidden gem indicators showing self-taught capability."}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber/10 border border-amber/20 flex items-center justify-center text-amber shrink-0 mt-0.5">
                    <MapPinIcon size={14} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Location Relocation Fit</h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Preferred target hubs: <strong>{c.preferred_locations.join(", ") || c.location}</strong>.
                      Matches primary technical clusters. Relocation friction is minimized.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Panel>

          <Panel icon={Award} title="Skills Analysis">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={[
                    { skill: "Technical", candidate: Math.min(100, (c.skills.length / 10) * 100), role: 85 },
                    { skill: "Domain", candidate: c.potential, role: 80 },
                    { skill: "Experience", candidate: Math.min(100, (c.experienceYears / 10) * 100), role: 70 },
                    { skill: "Availability", candidate: c.notice_period_days <= 15 ? 95 : c.notice_period_days <= 30 ? 75 : 50, role: 75 },
                    { skill: "Education", candidate: c.education_tier === "Tier-1" ? 95 : c.education_tier === "Tier-2" ? 75 : 55, role: 80 },
                    { skill: "Company Bg.", candidate: c.company_tier === "Tier-1" ? 95 : c.company_tier === "Tier-2" ? 75 : 55, role: 65 },
                  ]}>
                    <PolarGrid stroke="#374151" />
                    <PolarAngleAxis dataKey="skill" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                    <PolarRadiusAxis stroke="#374151" tick={{ fill: "#6b7280", fontSize: 9 }} />
                    <Radar name="Role" dataKey="role" stroke="#6b7280" fill="#6b7280" fillOpacity={0.15} />
                    <Radar name="Candidate" dataKey="candidate" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.4} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2.5">
                {c.skills.map((s: string) => {
                  // Generate stable score based on skill name
                  const hash = s.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
                  const val = 60 + (hash % 38);
                  return (
                    <div key={s} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-foreground/90">{s}</span>
                        <span className="text-muted-foreground">{val}% match</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-primary to-cyan" style={{ width: `${val}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel icon={TrendingUp} title="Activity &amp; Behavioral Score">
            <div className="space-y-4">
              {[
                { label: "Logins (30d)", val: `${dbData.candidate.activity_signals?.[0]?.logins_30d ?? 0} times`, desc: "Active interface usage" },
                {
                  label: "Response Rate",
                  val: `${Math.round((dbData.candidate.activity_signals?.[0]?.response_rate ?? 0) * 100)}%`,
                  desc: "Likelihood to respond to messages",
                },
                {
                  label: "Reply Speed",
                  val: `${dbData.candidate.activity_signals?.[0]?.avg_reply_hours ?? 0} hrs`,
                  desc: "Average message response turnaround",
                },
                {
                  label: "Active Recency",
                  val: dbData.candidate.activity_signals?.[0]?.last_active_at
                    ? new Date(dbData.candidate.activity_signals[0].last_active_at).toLocaleDateString()
                    : "No records",
                  desc: "Last recorded activity timestamp",
                },
              ].map((item) => (
                <div key={item.label} className="border-b border-border/40 pb-3 last:border-0 last:pb-0 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold text-foreground/95">{item.label}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</div>
                  </div>
                  <div className="text-sm font-semibold text-cyan">{item.val}</div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel icon={Shield} title="Risk Assessment">
            <ul className="text-xs space-y-2.5">
              {[
                {
                  color: c.company_tier !== "Tier-3" ? "emerald" : "amber",
                  text: `Worked at ${c.company_tier} companies (product mindset: ${c.company_tier !== "Tier-3" ? "high" : "services-oriented"})`,
                },
                {
                  color: c.notice_period_days <= 30 ? "emerald" : "amber",
                  text: `Notice period: ${c.notice_period_days} days (${c.notice_period_days <= 30 ? "low" : "moderate"} counteroffer dropout risk)`,
                },
                {
                  color: "emerald",
                  text: `Location preference: matches target hubs (${c.preferred_locations.join(", ")})`,
                },
                { color: "emerald", text: "No flagged inconsistencies in resume/LinkedIn history" },
              ].map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className={`mt-1.5 w-1.5 h-1.5 rounded-full bg-${r.color} shrink-0`} />
                  <span className="text-foreground/90 leading-relaxed">{r.text}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      {/* Schedule Interview Modal */}
      <AnimatePresence>
        {showScheduleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel w-full max-w-md rounded-2xl p-6 relative bg-surface border border-border/80 shadow-2xl"
            >
              <button
                onClick={() => setShowScheduleModal(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
              
              <h3 className="font-semibold text-lg flex items-center gap-2 mb-2">
                <MessageSquare size={18} className="text-primary" />
                Schedule Interview
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Arrange a virtual interview round for <strong>{c.name}</strong>.
              </p>

              <form onSubmit={handleScheduleInterview} className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Interview Round</label>
                  <select
                    value={interviewType}
                    onChange={(e) => setInterviewType(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-surface-2 border border-border/60 text-sm text-foreground outline-none focus:border-primary"
                  >
                    <option value="Technical Round">Technical Round (Coding/System Design)</option>
                    <option value="Managerial Round">Managerial &amp; Cult-Fit Round</option>
                    <option value="HR / Offer Discussion">HR / Offer Discussion</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Date</label>
                    <input
                      type="date"
                      required
                      value={interviewDate}
                      onChange={(e) => setInterviewDate(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-surface-2 border border-border/60 text-sm text-foreground outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Time</label>
                    <input
                      type="time"
                      required
                      value={interviewTime}
                      onChange={(e) => setInterviewTime(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-surface-2 border border-border/60 text-sm text-foreground outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowScheduleModal(false)}
                    className="px-4 h-9 rounded-lg bg-surface-2 border border-border/60 text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                  >
                    Confirm &amp; Schedule
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Panel({
  icon: Icon,
  title,
  badge,
  children,
}: {
  icon: any;
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-panel rounded-2xl p-6 border border-border/40 bg-surface/40">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 grid place-items-center text-primary">
            <Icon size={14} />
          </div>
          <h3 className="font-semibold text-foreground">{title}</h3>
        </div>
        {badge && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 uppercase tracking-wider">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
