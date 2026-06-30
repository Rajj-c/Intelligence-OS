import { Bot, Send, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const SUGGESTIONS = [
  "Find top 5 ML engineers with NLP experience",
  "Explain why Aarav Mehta scored 96 for Senior ML role",
  "Generate interview questions for staff data scientist",
  "Compare candidate pipelines across open roles",
];

type Msg = { role: "user" | "ai"; text: string };

export default function AIAssistant({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "ai",
      text: "Hi — I'm your TalentOS intelligence assistant. Ask me about candidates, rankings, or hiring strategy.",
    },
  ]);
  const [input, setInput] = useState("");

  const send = (text: string) => {
    if (!text.trim()) return;
    setMessages((m) => [
      ...m,
      { role: "user", text },
      {
        role: "ai",
        text:
          "Based on your active pipeline, the strongest match is Aarav Mehta (96% semantic fit). Key signals: 4 transformer-based production deployments, 3 published papers on retrieval-augmented generation, and a strong overlap with your team's current tech stack. Want me to surface 4 similar profiles?",
      },
    ]);
    setInput("");
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ type: "spring", damping: 24, stiffness: 220 }}
            className="fixed top-0 right-0 h-full w-full max-w-md z-50 glass-panel border-l border-border/60 flex flex-col"
          >
            <div className="h-16 px-5 flex items-center justify-between border-b border-border/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-cyan grid place-items-center">
                  <Bot size={16} />
                </div>
                <div>
                  <div className="text-sm font-semibold">TalentOS Assistant</div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-emerald" /> Online · GPT-class model
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-surface grid place-items-center">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-surface border border-border/60"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-border/40 space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-[11px] px-2.5 py-1 rounded-full border border-border/60 bg-surface/60 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors flex items-center gap-1"
                  >
                    <Sparkles size={10} /> {s}
                  </button>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="flex items-center gap-2 px-3 h-11 rounded-xl bg-surface border border-border/60 focus-within:border-primary/60 transition-colors"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything about your talent pipeline..."
                  className="flex-1 bg-transparent outline-none text-sm"
                />
                <button
                  type="submit"
                  className="w-8 h-8 rounded-lg bg-primary text-primary-foreground grid place-items-center hover:bg-primary/90 transition-colors"
                >
                  <Send size={14} />
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
