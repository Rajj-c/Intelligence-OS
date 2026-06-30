import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuthServerFn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Briefcase, Plus, Sparkles, Loader2, CheckCircle2, Clock } from "lucide-react";
import { listJobs, createJob, parseAndEmbedJob } from "@/lib/jobs.functions";
import { useState } from "react";

export const Route = createFileRoute("/_app/jobs")({
  head: () => ({ meta: [{ title: "Jobs — TalentOS" }] }),
  component: JobsPage,
});

function JobsPage() {
  const listFn = useAuthServerFn(listJobs);
  const createFn = useAuthServerFn(createJob);
  const embedFn = useAuthServerFn(parseAndEmbedJob);
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [embeddingId, setEmbeddingId] = useState<string | null>(null);

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => listFn(),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const result = await createFn({ data: { title, description } });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      setShowForm(false);
      setTitle("");
      setDescription("");
    },
  });

  const embedMutation = useMutation({
    mutationFn: async (id: string) => {
      setEmbeddingId(id);
      return embedFn({ data: { id } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      setEmbeddingId(null);
    },
    onError: () => setEmbeddingId(null),
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Open Roles</div>
          <h1 className="font-display text-4xl text-gradient mt-1">Jobs</h1>
          <p className="text-sm text-muted-foreground mt-1">{jobs.length} job{jobs.length !== 1 ? "s" : ""} loaded</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2"
        >
          <Plus size={14} /> New Job
        </button>
      </div>

      {showForm && (
        <div className="glass-panel rounded-2xl p-6 space-y-4 border border-primary/20">
          <h3 className="font-semibold text-sm">Add New Job</h3>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Job Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior ML Engineer"
              className="w-full h-10 px-3 rounded-lg bg-surface border border-border/60 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Job Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Paste the full job description here..."
              rows={6}
              className="w-full px-3 py-2 rounded-lg bg-surface border border-border/60 text-sm text-foreground outline-none focus:border-primary resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => createMutation.mutate()}
              disabled={!title.trim() || !description.trim() || createMutation.isPending}
              className="px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {createMutation.isPending && <Loader2 size={12} className="animate-spin" />}
              Save Job
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 h-9 rounded-lg bg-surface border border-border/60 text-sm">
              Cancel
            </button>
          </div>
          {createMutation.isError && (
            <p className="text-xs text-destructive">{(createMutation.error as Error).message}</p>
          )}
        </div>
      )}

      <div className="glass-panel rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border/40">
              <th className="py-3 px-5">Role</th>
              <th className="py-3 px-5">Description</th>
              <th className="py-3 px-5">Status</th>
              <th className="py-3 px-5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-muted-foreground text-sm">
                  <Loader2 size={16} className="animate-spin inline mr-2" /> Loading jobs…
                </td>
              </tr>
            ) : jobs.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-muted-foreground text-sm">
                  No jobs yet. Upload a CSV from the <Link to="/resumes" className="text-primary hover:underline">Datasets page</Link> or add one above.
                </td>
              </tr>
            ) : (
              jobs.map((j) => (
                <tr key={j.id} className="border-b border-border/40 hover:bg-surface/60 transition-colors">
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 grid place-items-center text-primary">
                        <Briefcase size={14} />
                      </div>
                      <span className="font-medium">{j.title}</span>
                    </div>
                  </td>
                  <td className="py-4 px-5 text-muted-foreground text-xs max-w-xs truncate">
                    {j.description?.slice(0, 80)}…
                  </td>
                  <td className="py-4 px-5">
                    {j.has_embedding ? (
                      <span className="flex items-center gap-1 text-emerald text-xs">
                        <CheckCircle2 size={12} /> Embedded
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber text-xs">
                        <Clock size={12} /> Not embedded
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-5">
                    {!j.has_embedding && (
                      <button
                        onClick={() => embedMutation.mutate(j.id)}
                        disabled={embeddingId === j.id}
                        className="text-xs px-3 h-7 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {embeddingId === j.id ? (
                          <><Loader2 size={10} className="animate-spin" /> Parsing…</>
                        ) : (
                          <><Sparkles size={10} /> Parse & Embed</>
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
