import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthServerFn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  FileText,
  Loader2,
  Sparkles,
  Upload,
  Users,
  Database,
  Trash2,
  ArrowRight,
  FileUp,
} from "lucide-react";
import { clearDataset, datasetStats, ingestCandidates, ingestJobs } from "@/lib/ingest.functions";
import { listJobs, parseAndEmbedJob } from "@/lib/jobs.functions";
import { parseAndEmbedAllCandidates } from "@/lib/candidates.functions";
import { ingestResumePdfs } from "@/lib/pdf.functions";

export const Route = createFileRoute("/_app/resumes")({
  head: () => ({ meta: [{ title: "Resume Processing — TalentOS" }] }),
  component: ResumesPage,
});

const PIPELINE_STAGES = [
  { label: "File Parsed", detail: "PDF text extracted via server-side pdf-parse" },
  { label: "Gemini Extraction", detail: "Skills, education & exp extracted using Gemini 2.5 Flash" },
  { label: "Saved to Database", detail: "Candidate record stored in Supabase" },
  { label: "Ready for Embedding", detail: "Generate vector embedding below for semantic ranking" },
];

function ResumesPage() {
  const qc = useQueryClient();
  const statsFn = useAuthServerFn(datasetStats);
  const ingestCFn = useAuthServerFn(ingestCandidates);
  const ingestJFn = useAuthServerFn(ingestJobs);
  const ingestPdfsFn = useAuthServerFn(ingestResumePdfs);
  const clearFn = useAuthServerFn(clearDataset);
  const embedCandFn = useAuthServerFn(parseAndEmbedAllCandidates);
  const embedJobFn = useAuthServerFn(parseAndEmbedJob);
  const jobsFn = useAuthServerFn(listJobs);

  const stats = useQuery({ queryKey: ["dataset-stats"], queryFn: () => statsFn() });
  const jobs = useQuery({ queryKey: ["jobs"], queryFn: () => jobsFn() });

  const [log, setLog] = useState<{ kind: "ok" | "err"; msg: string }[]>([]);
  const [pipelineStage, setPipelineStage] = useState<number>(-1);
  const [lastType, setLastType] = useState<"candidates" | "jobs" | "pdfs" | null>(null);

  const push = (kind: "ok" | "err", msg: string) =>
    setLog((l) => [{ kind, msg }, ...l].slice(0, 20));

  const runPipelineAnimation = () => {
    setPipelineStage(0);
    [0, 1, 2, 3].forEach((i) => setTimeout(() => setPipelineStage(i), (i + 1) * 800));
  };

  const uploadCands = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      const format = file.name.endsWith(".json") ? "json" : "csv";
      runPipelineAnimation();
      setLastType("candidates");
      return ingestCFn({ data: { content: text, format } });
    },
    onSuccess: (r) => {
      push("ok", `✅ Imported ${r.inserted} candidates successfully`);
      r.errors.slice(0, 5).forEach((e) => push("err", e));
      qc.invalidateQueries({ queryKey: ["dataset-stats"] });
      qc.invalidateQueries({ queryKey: ["candidates"] });
    },
    onError: (e) => push("err", (e as Error).message),
  });

  const uploadJobs = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      const format = file.name.endsWith(".json") ? "json" : "csv";
      runPipelineAnimation();
      setLastType("jobs");
      return ingestJFn({ data: { content: text, format } });
    },
    onSuccess: (r) => {
      push("ok", `✅ Imported ${r.inserted} jobs successfully`);
      r.errors.slice(0, 5).forEach((e) => push("err", e));
      qc.invalidateQueries({ queryKey: ["dataset-stats"] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (e) => push("err", (e as Error).message),
  });

  const uploadPdfs = useMutation({
    mutationFn: async (files: File[]) => {
      runPipelineAnimation();
      setLastType("pdfs");
      
      const resumesData = await Promise.all(
        files.map(async (file) => {
          return new Promise<{ filename: string; base64: string }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              // Extract base64 part
              const base64 = result.split(",")[1];
              resolve({ filename: file.name, base64 });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        })
      );

      return ingestPdfsFn({ data: { resumes: resumesData } });
    },
    onSuccess: (r) => {
      push("ok", `✅ Processed ${r.results.length} resumes. Successfully inserted ${r.inserted} candidates.`);
      r.results.forEach((res) => {
        if (res.status === "ok") {
          push("ok", `Parsed candidate: ${res.name} (${res.filename})`);
        } else {
          push("err", `Error parsing ${res.filename}: ${res.error}`);
        }
      });
      qc.invalidateQueries({ queryKey: ["dataset-stats"] });
      qc.invalidateQueries({ queryKey: ["candidates"] });
    },
    onError: (e) => push("err", (e as Error).message),
  });

  const embedCands = useMutation({
    mutationFn: () => embedCandFn({ data: { limit: 100 } }),
    onSuccess: (r) => {
      push("ok", `🧠 Parsed & embedded ${r.processed}/${r.total} candidates`);
      r.errors.slice(0, 3).forEach((e) => push("err", e));
      qc.invalidateQueries();
    },
    onError: (e) => push("err", (e as Error).message),
  });

  const embedJob = useMutation({
    mutationFn: (id: string) => embedJobFn({ data: { id } }),
    onSuccess: () => {
      push("ok", `🧠 Job embedded successfully`);
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["dataset-stats"] });
    },
    onError: (e) => push("err", (e as Error).message),
  });

  const wipe = useMutation({
    mutationFn: () => clearFn(),
    onSuccess: () => {
      push("ok", "🗑️ All data cleared");
      setPipelineStage(-1);
      setLastType(null);
      qc.invalidateQueries();
    },
  });

  const isBusy = uploadCands.isPending || uploadJobs.isPending || uploadPdfs.isPending;
  const unembeddedJobs = (jobs.data ?? []).filter((j) => !j.has_embedding);

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Resume Processing Hub</div>
          <h1 className="font-display text-4xl text-gradient mt-1">Bulk Intelligence Ingestion</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload CSV/JSON tables or raw PDF Resumes — TalentOS will parse, extract, and index them automatically.
          </p>
        </div>
        <Link
          to="/matching"
          className="px-4 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <Sparkles size={14} /> Run AI Matching
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Candidates", value: stats.data?.candidates ?? 0, icon: Users, color: "primary" },
          { label: "Jobs", value: stats.data?.jobs ?? 0, icon: Briefcase, color: "cyan" },
          { label: "Activity Signals", value: stats.data?.signals ?? 0, icon: Database, color: "emerald" },
          { label: "Ranking Runs", value: stats.data?.rankings ?? 0, icon: Sparkles, color: "amber" },
        ].map((s) => (
          <div key={s.label} className="glass-panel rounded-2xl p-4">
            <div className={`text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5`}>
              <s.icon size={11} /> {s.label}
            </div>
            <div className="text-3xl font-display text-gradient mt-1 tabular-nums">
              {stats.isLoading ? "…" : s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Upload cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <UploadCard
          icon={<Users size={18} />}
          title="Upload Candidates CSV"
          hint={
            <>
              <strong>Required columns:</strong> name, headline, location, skills, experience_years, education
              <br />
              <strong>Optional signals:</strong> logins_30d, response_rate, avg_reply_hours
            </>
          }
          busy={uploadCands.isPending}
          onFile={(f) => uploadCands.mutate(f)}
          accept=".csv,.json"
          color="primary"
        />

        <UploadCard
          icon={<FileUp size={18} />}
          title="Upload Resume PDFs"
          hint={
            <>
              <strong>Upload one or more PDF resumes.</strong>
              <br />
              TalentOS will extract the raw text and use Gemini 2.5 Flash to automatically extract candidate profiles.
            </>
          }
          busy={uploadPdfs.isPending}
          onFiles={(files) => uploadPdfs.mutate(files)}
          accept=".pdf"
          multiple
          color="amber"
        />

        <UploadCard
          icon={<Briefcase size={18} />}
          title="Upload Jobs CSV"
          hint={
            <>
              <strong>Required columns:</strong> title, description
              <br />
              Any extra columns are stored as raw requirements metadata.
            </>
          }
          busy={uploadJobs.isPending}
          onFile={(f) => uploadJobs.mutate(f)}
          accept=".csv,.json"
          color="cyan"
        />
      </div>

      {/* Pipeline animation */}
      <AnimatePresence>
        {pipelineStage >= 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass-panel rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold">
                  {isBusy ? "Processing Ingestion…" : `${lastType === "candidates" ? "Candidates" : lastType === "pdfs" ? "Resumes" : "Jobs"} Ingested`}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isBusy ? "Extracting, validating, and saving records…" : "Ingest pipeline complete. Check the activity log or run AI Embedding below."}
                </p>
              </div>
              {!isBusy && (
                <span className="text-xs text-emerald flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> Complete
                </span>
              )}
            </div>
            <div className="space-y-2">
              {PIPELINE_STAGES.map((s, i) => {
                const done = pipelineStage > i;
                const active = pipelineStage === i && isBusy;
                return (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className={`flex items-center gap-4 p-3 rounded-xl border ${
                      done
                        ? "border-emerald/40 bg-emerald/5"
                        : active
                          ? "border-primary/40 bg-primary/10"
                          : "border-border/60 bg-surface/60 opacity-50"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg grid place-items-center ${done ? "bg-emerald/20 text-emerald" : active ? "bg-primary/20 text-primary" : "bg-surface text-muted-foreground"}`}>
                      {done ? <CheckCircle2 size={16} /> : active ? <Loader2 size={16} className="animate-spin" /> : <span className="text-[10px]">{i + 1}</span>}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{s.label}</div>
                      <div className="text-[10px] text-muted-foreground">{s.detail}</div>
                    </div>
                    {done && <div className="text-xs text-emerald">done</div>}
                    {active && <div className="text-xs text-primary animate-pulse">running</div>}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Processing */}
      <div className="glass-panel rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold flex items-center gap-2"><Sparkles size={16} className="text-primary" /> AI Processing</div>
            <p className="text-xs text-muted-foreground">Generate embeddings &amp; extract structured requirements.</p>
          </div>
          <button
            onClick={() => embedCands.mutate()}
            disabled={embedCands.isPending || (stats.data?.candidates ?? 0) === 0}
            className="h-9 px-4 rounded-lg bg-primary/15 border border-primary/30 text-primary text-xs font-medium disabled:opacity-50 flex items-center gap-2 hover:bg-primary/25 transition-colors"
          >
            {embedCands.isPending ? (
              <><Loader2 size={12} className="animate-spin" /> Embedding…</>
            ) : (
              <><Sparkles size={12} /> Embed candidates (next 100)</>
            )}
          </button>
        </div>

        {/* Candidate embedding result */}
        {embedCands.isSuccess && (
          <div className="text-xs text-emerald flex items-center gap-1.5">
            <CheckCircle2 size={12} /> Embedding complete. <Link to="/candidates" className="underline hover:text-emerald/80">View candidates →</Link>
          </div>
        )}

        {/* Jobs embedding list */}
        <div className="space-y-1.5">
          <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Jobs</div>
          {jobs.isLoading ? (
            <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Loading…</div>
          ) : (jobs.data ?? []).length === 0 ? (
            <div className="text-xs text-muted-foreground">No jobs yet. Upload one above.</div>
          ) : (
            (jobs.data ?? []).map((j) => (
              <div key={j.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/60 bg-surface/60 text-sm">
                <Briefcase size={14} className="text-muted-foreground shrink-0" />
                <div className="flex-1 truncate text-sm">{j.title}</div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${j.has_embedding ? "bg-emerald/15 text-emerald border border-emerald/30" : "bg-surface-2 border border-border/60 text-muted-foreground"}`}>
                  {j.has_embedding ? "embedded ✓" : "raw"}
                </span>
                {!j.has_embedding && (
                  <button
                    onClick={() => embedJob.mutate(j.id)}
                    disabled={embedJob.isPending}
                    className="text-xs px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                  >
                    {embedJob.isPending ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                    Parse &amp; embed
                  </button>
                )}
              </div>
            ))
          )}

          {unembeddedJobs.length > 0 && !embedJob.isPending && (
            <p className="text-xs text-amber mt-1 flex items-center gap-1.5">
              <AlertCircle size={11} />
              {unembeddedJobs.length} job{unembeddedJobs.length > 1 ? "s" : ""} need embedding before you can run matching.
            </p>
          )}
        </div>
      </div>

      {/* Activity log */}
      <AnimatePresence>
        {log.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel rounded-2xl p-5 space-y-1.5 max-h-60 overflow-y-auto"
          >
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Activity Log</div>
            {log.map((l, i) => (
              <div key={i} className={`text-xs flex items-start gap-2 ${l.kind === "ok" ? "text-emerald" : "text-destructive"}`}>
                {l.kind === "ok" ? <CheckCircle2 size={12} className="mt-0.5 shrink-0" /> : <AlertCircle size={12} className="mt-0.5 shrink-0" />}
                <span>{l.msg}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Next steps */}
      {(stats.data?.candidates ?? 0) > 0 && (
        <div className="glass-panel rounded-2xl p-5 border border-primary/20">
          <div className="text-xs text-primary uppercase tracking-wider font-semibold mb-3">Next Steps</div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/candidates"
              className="flex items-center gap-2 text-sm px-4 h-9 rounded-lg bg-surface border border-border/60 hover:border-primary/40 transition-colors"
            >
              <Users size={14} /> View Candidates <ArrowRight size={12} />
            </Link>
            <Link
              to="/jobs"
              className="flex items-center gap-2 text-sm px-4 h-9 rounded-lg bg-surface border border-border/60 hover:border-primary/40 transition-colors"
            >
              <Briefcase size={14} /> View Jobs <ArrowRight size={12} />
            </Link>
            <Link
              to="/matching"
              className="flex items-center gap-2 text-sm px-4 h-9 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Sparkles size={14} /> Run AI Matching <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      )}

      {/* Danger zone */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            if (window.confirm("This will permanently delete ALL candidates, jobs, and rankings. Are you sure?")) {
              wipe.mutate();
            }
          }}
          disabled={wipe.isPending}
          className="text-xs px-3 py-2 rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10 flex items-center gap-2 disabled:opacity-50"
        >
          <Trash2 size={12} /> {wipe.isPending ? "Clearing…" : "Clear all data"}
        </button>
      </div>
    </div>
  );
}

function UploadCard({
  icon,
  title,
  hint,
  busy,
  onFile,
  onFiles,
  accept,
  multiple = false,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  hint: React.ReactNode;
  busy: boolean;
  onFile?: (f: File) => void;
  onFiles?: (fs: File[]) => void;
  accept: string;
  multiple?: boolean;
  color: "primary" | "cyan" | "amber";
}) {
  const [dragging, setDragging] = useState(false);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    if (multiple && onFiles) {
      const filesArray = Array.from(fileList);
      onFiles(filesArray);
    } else if (onFile && fileList[0]) {
      onFile(fileList[0]);
    }
  };

  return (
    <label
      className={`glass-panel rounded-2xl p-5 block cursor-pointer transition-all ${
        dragging ? "border-primary/60 bg-primary/5" : "hover:border-primary/40"
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      <div className="flex items-center gap-2 font-semibold">
        <span className={color === "primary" ? "text-primary" : color === "cyan" ? "text-cyan" : "text-amber"}>{icon}</span>
        {title}
      </div>
      <p className="text-xs text-muted-foreground mt-2 leading-relaxed h-16 overflow-hidden">{hint}</p>
      <div className={`mt-4 h-28 rounded-xl border-2 border-dashed ${dragging ? "border-primary/60 bg-primary/5" : "border-border/60 bg-surface/40"} grid place-items-center text-xs text-muted-foreground transition-all`}>
        {busy ? (
          <span className="flex items-center gap-2 text-primary">
            <Loader2 size={14} className="animate-spin" /> Processing…
          </span>
        ) : (
          <span className="flex flex-col items-center gap-1.5">
            <Upload size={18} className={dragging ? "text-primary" : "text-muted-foreground"} />
            <span>{dragging ? "Drop to upload" : "Click to upload or drag & drop"}</span>
            <span className="text-[10px] opacity-60">{multiple ? "Multiple PDFs" : `${accept} file`}</span>
          </span>
        )}
      </div>
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </label>
  );
}
