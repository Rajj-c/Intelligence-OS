import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuthServerFn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, Search, SlidersHorizontal, Check, X } from "lucide-react";
import { useState } from "react";
import { listCandidates } from "@/lib/candidates.functions";

export const Route = createFileRoute("/_app/candidates/")({
  head: () => ({ meta: [{ title: "Candidate Intelligence — TalentOS" }] }),
  component: CandidatesPage,
});

function CandidatesPage() {
  const listFn = useAuthServerFn(listCandidates);
  const { data: dbCandidates, isLoading } = useQuery({
    queryKey: ["candidates"],
    queryFn: () => listFn({ data: { limit: 200 } }),
  });

  const [q, setQ] = useState("");
  const [noticeFilter, setNoticeFilter] = useState<string>("all"); // "all", "0", "30", "60"
  const [eduFilter, setEduFilter] = useState<string>("all"); // "all", "Tier-1", "Tier-2", "Tier-3"
  const [compFilter, setCompFilter] = useState<string>("all"); // "all", "Tier-1", "Tier-2", "Tier-3"
  const [gemsOnly, setGemsOnly] = useState<boolean>(false);
  const [filtersOpen, setFiltersOpen] = useState<boolean>(false);

  // Map DB candidates to candidate cards
  const dbMapped = (dbCandidates ?? []).map((c) => {
    const parsed = c.parsed;
    const initials = c.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    // Calculate generic fit score for display in pool
    let potential = 70;
    if (parsed?.education_tier === "Tier-1") potential += 15;
    else if (parsed?.education_tier === "Tier-2") potential += 5;
    if (parsed?.company_tier === "Tier-1") potential += 10;
    if ((parsed?.notice_period_days ?? 30) <= 15) potential += 5;
    potential = Math.min(99, potential);

    const skills = c.skills && c.skills.length > 0 ? c.skills : (parsed?.normalized_skills ?? []);

    // Detect hidden gem status
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

    return {
      id: c.id,
      name: c.name,
      role: c.headline ?? parsed?.primary_domain ?? "Software Engineer",
      location: c.location ?? (parsed?.preferred_locations?.[0] ? `${parsed.preferred_locations[0]}, IN` : "India"),
      match: null,
      confidence: parsed ? 92 : 60,
      potential: potential,
      skills: skills,
      experienceYears: c.experience_years ?? 0,
      education: c.education ?? (parsed?.education_tier ? `${parsed.education_tier} College` : "Degree"),
      recommendedRole: parsed?.seniority
        ? `${parsed.seniority.charAt(0).toUpperCase() + parsed.seniority.slice(1)} Engineer`
        : "Engineer",
      initials: initials,
      status: c.status as any,
      education_tier: parsed?.education_tier ?? "Tier-3",
      company_tier: parsed?.company_tier ?? "Tier-3",
      notice_period_days: parsed?.notice_period_days ?? 30,
      preferred_locations: parsed?.preferred_locations ?? [],
      is_gem: isGem,
      gem_label: gemLabel,
    };
  });

  const candidatesList = dbMapped;

  // Apply filters
  const filtered = candidatesList.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(q.toLowerCase()) ||
      c.role.toLowerCase().includes(q.toLowerCase()) ||
      c.skills.some((s: string) => s.toLowerCase().includes(q.toLowerCase()));

    if (!matchesSearch) return false;

    if (noticeFilter === "0" && c.notice_period_days !== 0) return false;
    if (noticeFilter === "30" && c.notice_period_days > 30) return false;
    if (noticeFilter === "60" && c.notice_period_days <= 30) return false;

    if (eduFilter !== "all" && c.education_tier !== eduFilter) return false;
    if (compFilter !== "all" && c.company_tier !== compFilter) return false;

    if (gemsOnly && !c.is_gem) return false;

    return true;
  });

  return (
    <div className="p-8 space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Candidate Intelligence Center</div>
        <h1 className="font-display text-4xl text-gradient mt-1">Bharat Talent Pool</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {candidatesList.length} candidates analyzed · Indian context filters active
        </p>
      </div>

      <div className="space-y-3">
        <div className="glass-panel rounded-2xl p-3 flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[240px] flex items-center gap-2 px-3 h-10 rounded-lg bg-surface/60 border border-border/60">
            <Search size={14} className="text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, role, or skill (e.g. 'PyTorch', 'IIT')"
              className="flex-1 bg-transparent outline-none text-sm text-foreground"
            />
            {q && (
              <button onClick={() => setQ("")} className="text-muted-foreground hover:text-foreground">
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`h-10 px-3 rounded-lg border text-xs flex items-center gap-2 transition-all ${
              filtersOpen || noticeFilter !== "all" || eduFilter !== "all" || compFilter !== "all" || gemsOnly
                ? "bg-primary/15 border-primary/30 text-primary"
                : "bg-surface border-border/60 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            }`}
          >
            <Filter size={14} /> Filters
            {(noticeFilter !== "all" || eduFilter !== "all" || compFilter !== "all" || gemsOnly) && (
              <span className="w-2 h-2 rounded-full bg-primary" />
            )}
          </button>
          <button className="h-10 px-3 rounded-lg bg-surface border border-border/60 text-xs flex items-center gap-2 hover:bg-surface-2 text-muted-foreground">
            <SlidersHorizontal size={14} /> Sort: Potential
          </button>
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {filtersOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="glass-panel rounded-2xl p-5 overflow-hidden border border-border/40 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4"
            >
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                  Notice Period
                </label>
                <div className="space-y-1">
                  {[
                    { val: "all", label: "Any Notice" },
                    { val: "0", label: "Immediate (0 days)" },
                    { val: "30", label: "Short (≤ 30 days)" },
                    { val: "60", label: "Standard (> 30 days)" },
                  ].map((o) => (
                    <button
                      key={o.val}
                      onClick={() => setNoticeFilter(o.val)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                        noticeFilter === o.val ? "bg-surface-2 text-foreground font-medium" : "text-muted-foreground hover:bg-surface-2/40"
                      }`}
                    >
                      {o.label}
                      {noticeFilter === o.val && <Check size={12} className="text-primary" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                  Education Tier
                </label>
                <div className="space-y-1">
                  {[
                    { val: "all", label: "Any College" },
                    { val: "Tier-1", label: "Tier-1 (IIT/NIT/BITS)" },
                    { val: "Tier-2", label: "Tier-2 (VIT/Manipal/etc.)" },
                    { val: "Tier-3", label: "Tier-3 (Other Regional)" },
                  ].map((o) => (
                    <button
                      key={o.val}
                      onClick={() => setEduFilter(o.val)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                        eduFilter === o.val ? "bg-surface-2 text-foreground font-medium" : "text-muted-foreground hover:bg-surface-2/40"
                      }`}
                    >
                      {o.label}
                      {eduFilter === o.val && <Check size={12} className="text-primary" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                  Company Tier
                </label>
                <div className="space-y-1">
                  {[
                    { val: "all", label: "Any Company" },
                    { val: "Tier-1", label: "Tier-1 (MNC/Unicorn)" },
                    { val: "Tier-2", label: "Tier-2 (Mid Startup)" },
                    { val: "Tier-3", label: "Tier-3 (IT Services)" },
                  ].map((o) => (
                    <button
                      key={o.val}
                      onClick={() => setCompFilter(o.val)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                        compFilter === o.val ? "bg-surface-2 text-foreground font-medium" : "text-muted-foreground hover:bg-surface-2/40"
                      }`}
                    >
                      {o.label}
                      {compFilter === o.val && <Check size={12} className="text-primary" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col justify-between">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                    Hidden Gems
                  </label>
                  <label className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-surface-2/40 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={gemsOnly}
                      onChange={(e) => setGemsOnly(e.target.checked)}
                      className="rounded border-border/60 text-primary focus:ring-primary w-4 h-4"
                    />
                    <span className="text-xs text-foreground">Gems Only (💎)</span>
                  </label>
                </div>
                <button
                  onClick={() => {
                    setNoticeFilter("all");
                    setEduFilter("all");
                    setCompFilter("all");
                    setGemsOnly(false);
                  }}
                  className="mt-4 text-xs text-left px-2.5 py-1.5 text-destructive hover:underline flex items-center gap-1.5"
                >
                  <X size={12} /> Clear all filters
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="glass-panel rounded-2xl p-5 h-64 animate-pulse bg-surface-2/40" />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(0.3, i * 0.04) }}
            >
              <Link
                to="/candidates/$id"
                params={{ id: c.id }}
                className="block glass-panel rounded-2xl p-5 hover:border-primary/40 transition-all hover:-translate-y-0.5 group relative overflow-hidden"
              >
                {c.is_gem && (
                  <div className="absolute top-0 right-0 w-24 h-24 overflow-hidden pointer-events-none">
                    <div className="bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-[8px] font-bold uppercase tracking-wider text-center py-1 absolute top-4 -right-6 w-24 rotate-45 shadow-sm">
                      Gem 💎
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/30 to-cyan/30 border border-border/60 grid place-items-center font-semibold text-sm shrink-0">
                    {c.initials}
                  </div>
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold truncate text-foreground group-hover:text-primary transition-colors">
                          {c.name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{c.role}</div>
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {c.location} · {c.experienceYears}y exp
                    </div>
                  </div>
                </div>

                {/* Localized badging */}
                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  {c.is_gem && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber/10 text-amber border border-amber/30">
                      💎 {c.gem_label}
                    </span>
                  )}
                  {c.education_tier === "Tier-1" && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      🎓 Tier-1 College
                    </span>
                  )}
                  {c.company_tier === "Tier-1" && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-cyan/10 text-cyan border border-cyan/20">
                      🏢 Tier-1 Co.
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      c.notice_period_days === 0
                        ? "bg-emerald/10 text-emerald border border-emerald/20"
                        : c.notice_period_days <= 15
                          ? "bg-emerald/5 text-emerald border border-emerald/10"
                          : c.notice_period_days <= 30
                            ? "bg-surface border border-border/60 text-foreground"
                            : "bg-surface border border-border/40 text-muted-foreground"
                    }`}
                  >
                    ⏱️ {c.notice_period_days === 0 ? "Immediate" : `${c.notice_period_days}d notice`}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-surface/60 border border-border/60 py-2">
                    <div className="text-[10px] text-muted-foreground">Potential</div>
                    <div className="text-sm font-semibold text-emerald">{c.potential}%</div>
                  </div>
                  <div className="rounded-lg bg-surface/60 border border-border/60 py-2">
                    <div className="text-[10px] text-muted-foreground">Notice</div>
                    <div className="text-sm font-semibold text-cyan">
                      {c.notice_period_days === 0 ? "0d" : `${c.notice_period_days}d`}
                    </div>
                  </div>
                  <div className="rounded-lg bg-surface/60 border border-border/60 py-2">
                    <div className="text-[10px] text-muted-foreground">College</div>
                    <div className="text-sm font-semibold text-amber truncate px-1">
                      {c.education_tier === "Tier-3" ? "Regional" : c.education_tier}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-1">
                  {c.skills.slice(0, 4).map((s: string) => (
                    <span
                      key={s}
                      className="text-[9px] px-2 py-0.5 rounded-full bg-surface border border-border/60 text-muted-foreground"
                    >
                      {s}
                    </span>
                  ))}
                </div>

                <div className="mt-4 pt-3 border-t border-border/40 text-xs text-muted-foreground flex items-center justify-between">
                  <span className="truncate">
                    College: <span className="text-foreground">{c.education.split("—").pop()?.trim()}</span>
                  </span>
                  <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    View profile →
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground text-sm glass-panel rounded-2xl">
              {candidatesList.length === 0
                ? <>No candidates uploaded yet. <Link to="/resumes" className="text-primary hover:underline">Upload a CSV →</Link></>
                : "No candidates found matching current filters."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

