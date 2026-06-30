import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useAuthServerFn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Upload, Database, Trash2, Sparkles, FileText, Briefcase, CheckCircle2, AlertCircle } from "lucide-react";
import { clearDataset, datasetStats, ingestCandidates, ingestJobs } from "@/lib/ingest.functions";
import { listJobs, parseAndEmbedJob } from "@/lib/jobs.functions";
import { parseAndEmbedAllCandidates } from "@/lib/candidates.functions";

export const Route = createFileRoute("/_app/datasets")({
  head: () => ({ meta: [{ title: "Datasets — TalentOS" }] }),
  component: DatasetsPage,
});

function DatasetsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const statsFn = useAuthServerFn(datasetStats);
  const ingestCFn = useAuthServerFn(ingestCandidates);
  const ingestJFn = useAuthServerFn(ingestJobs);
  const clearFn = useAuthServerFn(clearDataset);
  const embedCandFn = useAuthServerFn(parseAndEmbedAllCandidates);
  const embedJobFn = useAuthServerFn(parseAndEmbedJob);
  const jobsFn = useAuthServerFn(listJobs);

  const stats = useQuery({ queryKey: ["dataset-stats"], queryFn: () => statsFn() });
  const jobs = useQuery({ queryKey: ["jobs"], queryFn: () => jobsFn() });

  const [log, setLog] = useState<{ kind: "ok" | "err"; msg: string }[]>([]);
  const push = (kind: "ok" | "err", msg: string) =>
    setLog((l) => [{ kind, msg }, ...l].slice(0, 10));

  const uploadCands = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      const format = file.name.endsWith(".json") ? "json" : "csv";
      return ingestCFn({ data: { content: text, format } });
    },
    onSuccess: (r) => {
      push("ok", `Imported ${r.inserted} candidates`);
      r.errors.slice(0, 3).forEach((e) => push("err", e));
      qc.invalidateQueries({ queryKey: ["dataset-stats"] });
    },
    onError: (e) => push("err", (e as Error).message),
  });

  const uploadJobs = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      const format = file.name.endsWith(".json") ? "json" : "csv";
      return ingestJFn({ data: { content: text, format } });
    },
    onSuccess: (r) => {
      push("ok", `Imported ${r.inserted} jobs`);
      qc.invalidateQueries({ queryKey: ["dataset-stats"] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (e) => push("err", (e as Error).message),
  });

  const embedCands = useMutation({
    mutationFn: () => embedCandFn({ data: { limit: 100 } }),
    onSuccess: (r) => {
      push("ok", `Parsed & embedded ${r.processed}/${r.total} candidates`);
      r.errors.slice(0, 2).forEach((e) => push("err", e));
      qc.invalidateQueries();
    },
    onError: (e) => push("err", (e as Error).message),
  });

  const embedJob = useMutation({
    mutationFn: (id: string) => embedJobFn({ data: { id } }),
    onSuccess: () => {
      push("ok", "Job parsed & embedded");
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (e) => push("err", (e as Error).message),
  });

  const wipe = useMutation({
    mutationFn: () => clearFn(),
    onSuccess: () => {
      push("ok", "Dataset cleared");
      qc.invalidateQueries();
      router.invalidate();
    },
  });

  return (
    <div className="p-8 space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Datasets</div>
        <h1 className="font-display text-4xl text-gradient mt-1">Ingest & Process</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload your challenge dataset. TalentOS will parse, embed, and prepare it for ranking.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Candidates" value={stats.data?.candidates ?? 0} />
        <Stat label="Jobs" value={stats.data?.jobs ?? 0} />
        <Stat label="Activity signals" value={stats.data?.signals ?? 0} />
        <Stat label="Ranking runs" value={stats.data?.rankings ?? 0} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <UploadCard
          icon={<FileText size={18} />}
          title="Upload candidates"
          hint="CSV or JSON. Columns: name, headline, location, skills, experience_years, education. Optional signals: engagement_score, response_rate, avg_reply_hours, last_active_at, logins_30d."
          busy={uploadCands.isPending}
          onFile={(f) => uploadCands.mutate(f)}
        />
        <UploadCard
          icon={<Briefcase size={18} />}
          title="Upload jobs"
          hint="CSV or JSON. Columns: title, description (required)."
          busy={uploadJobs.isPending}
          onFile={(f) => uploadJobs.mutate(f)}
        />
      </div>

      <div className="glass-panel rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="font-semibold flex items-center gap-2"><Sparkles size={16} className="text-primary" /> AI Processing</div>
            <p className="text-xs text-muted-foreground">Generate embeddings & extract structured requirements.</p>
          </div>
          <button
            onClick={() => embedCands.mutate()}
            disabled={embedCands.isPending}
            className="h-9 px-3 rounded-lg bg-primary/15 border border-primary/30 text-primary text-xs font-medium disabled:opacity-50"
          >
            {embedCands.isPending ? "Embedding..." : "Embed candidates (next 100)"}
          </button>
        </div>
        <div className="space-y-1.5">
          {(jobs.data ?? []).map((j) => (
            <div key={j.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/60 bg-surface/60 text-sm">
              <Briefcase size={14} className="text-muted-foreground" />
              <div className="flex-1 truncate">{j.title}</div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${j.has_embedding ? "bg-emerald/15 text-emerald border border-emerald/30" : "bg-surface-2 border border-border/60 text-muted-foreground"}`}>
                {j.has_embedding ? "embedded" : "raw"}
              </span>
              <button
                onClick={() => embedJob.mutate(j.id)}
                disabled={embedJob.isPending}
                className="text-xs px-2 py-1 rounded-md border border-border/60 hover:border-primary/40 disabled:opacity-50"
              >
                Parse & embed
              </button>
            </div>
          ))}
          {jobs.data?.length === 0 && <div className="text-xs text-muted-foreground">No jobs yet. Upload one above.</div>}
        </div>
      </div>

      {log.length > 0 && (
        <div className="glass-panel rounded-2xl p-5 space-y-1.5">
          {log.map((l, i) => (
            <div key={i} className={`text-xs flex items-center gap-2 ${l.kind === "ok" ? "text-emerald" : "text-destructive"}`}>
              {l.kind === "ok" ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />} {l.msg}
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => wipe.mutate()}
          disabled={wipe.isPending}
          className="text-xs px-3 py-2 rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10 flex items-center gap-2"
        >
          <Trash2 size={12} /> Clear all data
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass-panel rounded-2xl p-4">
      <div className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5"><Database size={11} /> {label}</div>
      <div className="text-3xl font-display text-gradient mt-1 tabular-nums">{value}</div>
    </div>
  );
}

function UploadCard({
  icon,
  title,
  hint,
  busy,
  onFile,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  busy: boolean;
  onFile: (f: File) => void;
}) {
  return (
    <label className="glass-panel rounded-2xl p-5 block cursor-pointer hover:border-primary/40 transition-colors">
      <div className="flex items-center gap-2 font-semibold">{icon} {title}</div>
      <p className="text-xs text-muted-foreground mt-1">{hint}</p>
      <div className="mt-4 h-24 rounded-xl border border-dashed border-border/60 bg-surface/40 grid place-items-center text-xs text-muted-foreground">
        {busy ? "Processing..." : (<><Upload size={14} className="inline mr-1.5" /> Click to upload .csv or .json</>)}
      </div>
      <input
        type="file"
        accept=".csv,.json,application/json,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </label>
  );
}
