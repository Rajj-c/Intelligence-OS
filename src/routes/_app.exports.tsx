import { createFileRoute } from "@tanstack/react-router";
import { useAuthServerFn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Download, Play, Sparkles, FileJson, FileText } from "lucide-react";
import { listJobs } from "@/lib/jobs.functions";
import { exportRanking, listRankings, runRanking } from "@/lib/ranking.functions";

export const Route = createFileRoute("/_app/exports")({
  head: () => ({ meta: [{ title: "Ranking Exports — TalentOS" }] }),
  component: ExportsPage,
});

function ExportsPage() {
  const qc = useQueryClient();
  const jobsFn = useAuthServerFn(listJobs);
  const runFn = useAuthServerFn(runRanking);
  const listFn = useAuthServerFn(listRankings);
  const exportFn = useAuthServerFn(exportRanking);

  const jobs = useQuery({ queryKey: ["jobs"], queryFn: () => jobsFn() });
  const runs = useQuery({ queryKey: ["rankings"], queryFn: () => listFn() });
  const [jobId, setJobId] = useState<string>("");
  const [topK, setTopK] = useState(20);

  const run = useMutation({
    mutationFn: () => runFn({ data: { jobId, topK } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rankings"] }),
  });

  const download = useMutation({
    mutationFn: async ({ runId, format }: { runId: string; format: "csv" | "json" }) => {
      const res = await exportFn({ data: { runId, format } });
      const blob = new Blob([res.body], { type: res.mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `talentos-ranking-${runId.slice(0, 8)}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });

  const embeddedJobs = (jobs.data ?? []).filter((j) => j.has_embedding);

  return (
    <div className="p-8 space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Ranking & Exports</div>
        <h1 className="font-display text-4xl text-gradient mt-1">Run & Download Shortlists</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Execute the semantic + behavioral ranking pipeline and export the ranked candidate shortlist.
        </p>
      </div>

      <div className="glass-panel rounded-2xl p-5">
        <div className="font-semibold flex items-center gap-2 mb-3"><Sparkles size={16} className="text-primary" /> New ranking run</div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            className="h-10 px-3 rounded-lg bg-surface border border-border/60 text-sm min-w-[260px]"
          >
            <option value="">Select job…</option>
            {embeddedJobs.map((j) => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </select>
          <label className="text-xs text-muted-foreground flex items-center gap-2">
            Top K
            <input
              type="number"
              value={topK}
              onChange={(e) => setTopK(Math.min(100, Math.max(1, Number(e.target.value))))}
              className="w-20 h-10 px-2 rounded-lg bg-surface border border-border/60 text-sm tabular-nums"
            />
          </label>
          <button
            onClick={() => run.mutate()}
            disabled={!jobId || run.isPending}
            className="h-10 px-4 rounded-lg bg-gradient-to-r from-primary to-cyan text-primary-foreground text-sm font-medium flex items-center gap-2 disabled:opacity-50"
          >
            <Play size={14} /> {run.isPending ? "Running..." : "Run ranking"}
          </button>
          {embeddedJobs.length === 0 && (
            <div className="text-xs text-muted-foreground">Embed at least one job in Datasets first.</div>
          )}
        </div>
        {run.data && (
          <div className="mt-3 text-xs text-emerald">
            Ranked {run.data.count} of {run.data.evaluated} candidates. Run id: {run.data.runId}
          </div>
        )}
        {run.error && <div className="mt-3 text-xs text-destructive">{(run.error as Error).message}</div>}
      </div>

      <div className="glass-panel rounded-2xl p-5">
        <div className="font-semibold mb-3">Ranking runs</div>
        <div className="space-y-2">
          {(runs.data ?? []).map((r) => (
            <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-surface/60">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{r.job_title}</div>
                <div className="text-[11px] text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()} · {r.candidates_evaluated} evaluated · run {r.id.slice(0, 8)}
                </div>
              </div>
              <button
                onClick={() => download.mutate({ runId: r.id, format: "csv" })}
                className="text-xs h-8 px-2.5 rounded-md border border-border/60 hover:border-primary/40 flex items-center gap-1.5"
              >
                <FileText size={12} /> CSV
              </button>
              <button
                onClick={() => download.mutate({ runId: r.id, format: "json" })}
                className="text-xs h-8 px-2.5 rounded-md border border-border/60 hover:border-primary/40 flex items-center gap-1.5"
              >
                <FileJson size={12} /> JSON
              </button>
            </div>
          ))}
          {runs.data?.length === 0 && (
            <div className="text-xs text-muted-foreground">No runs yet. Trigger one above.</div>
          )}
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-5">
        <div className="font-semibold flex items-center gap-2"><Download size={16} className="text-primary" /> Reproducible API</div>
        <p className="text-xs text-muted-foreground mt-1">
          Judges can call the ranking engine directly with their own dataset:
        </p>
        <pre className="mt-3 text-[11px] bg-surface/80 border border-border/60 rounded-lg p-3 overflow-x-auto font-mono">
{`POST /api/public/rank
{
  "job":  { "title": "...", "description": "..." },
  "candidates": [
    { "id": "c1", "name": "...", "skills": ["..."], "experience_years": 5,
      "signals": { "engagement_score": 0.8, "response_rate": 0.7 } }
  ],
  "weights": { "semantic": 0.5, "skill": 0.25, "experience": 0.1, "behavioral": 0.15 },
  "top_k": 20
}`}
        </pre>
      </div>
    </div>
  );
}
