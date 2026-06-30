import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Sparkles,
  Network,
  BarChart3,
  Settings,
  Search,
  Bell,
  Upload,
  Brain,
  Database,
  Download,
  Trophy,
  LogOut,
  Loader2,
} from "lucide-react";

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/datasets", label: "Datasets", icon: Database },
  { to: "/candidates", label: "Candidates", icon: Users },
  { to: "/jobs", label: "Jobs", icon: Briefcase },
  { to: "/matching", label: "AI Rankings", icon: Sparkles },
  { to: "/exports", label: "Exports & API", icon: Download },
  { to: "/insights", label: "Talent Intelligence", icon: Network },
  { to: "/resumes", label: "Resume Processing", icon: Upload },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

const HACKATHON_NAV = [
  { to: "/hackathon", label: "Hackathon Demo", icon: Trophy },
];


export default function AppShell() {
  const loc = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate({ to: "/login" });
      } else {
        setUser(session.user);
        setLoading(false);
      }
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate({ to: "/login" });
      } else {
        setUser(session.user);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background grid place-items-center text-muted-foreground text-sm font-medium">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-primary" size={24} />
          <span>Securing workspace...</span>
        </div>
      </div>
    );
  }

  const userInitials = user?.email
    ? user.email.split("@")[0].substring(0, 2).toUpperCase()
    : "US";

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-border/40 bg-sidebar/80 backdrop-blur-xl flex flex-col">
        <Link to="/" className="flex items-center gap-2 px-6 h-16 border-b border-border/40">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-cyan flex items-center justify-center">
            <Brain size={18} className="text-white" />
          </div>
          <span className="font-semibold tracking-tight">TalentOS</span>
        </Link>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground">Workspace</div>
          {NAV.map((n) => {
            const active = loc.pathname === n.to || (n.to !== "/dashboard" && loc.pathname.startsWith(n.to));
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                  active
                    ? "bg-primary/15 text-foreground border border-primary/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                }`}
              >
                <n.icon size={16} className={active ? "text-primary" : ""} />
                <span>{n.label}</span>
              </Link>
            );
          })}
          <div className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-widest text-amber-500/70 flex items-center gap-1.5">
            <Trophy size={10} className="text-amber-500/70" />
            India Runs Challenge
          </div>
          {HACKATHON_NAV.map((n) => {
            const active = loc.pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                  active
                    ? "bg-amber-500/15 text-foreground border border-amber-500/30"
                    : "text-amber-500/70 hover:text-amber-400 hover:bg-amber-500/10"
                }`}
              >
                <n.icon size={16} className={active ? "text-amber-400" : "text-amber-500/70"} />
                <span>{n.label}</span>
                {!active && (
                  <span className="ml-auto text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                    NEW
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border/40">
          <div className="glass-panel rounded-xl p-3 text-xs">
            <div className="flex items-center gap-2 text-emerald">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald pulse-ring" />
              <span className="font-medium">AI Engine</span>
            </div>
            <div className="mt-1 text-muted-foreground">All models healthy · v4.2</div>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 px-6 border-b border-border/40 bg-background/60 backdrop-blur-xl flex items-center gap-4 sticky top-0 z-30">
          <div className="flex-1 max-w-xl">
            <div className="flex items-center gap-2 px-3 h-9 rounded-lg bg-surface/60 border border-border/60 text-sm text-muted-foreground">
              <Search size={14} />
              <input
                placeholder="Search candidates, jobs, skills..."
                className="bg-transparent outline-none flex-1 text-foreground placeholder:text-muted-foreground"
              />
              <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface-2 border border-border/60">⌘K</kbd>
            </div>
          </div>
          <button className="w-9 h-9 rounded-lg border border-border/60 bg-surface/60 grid place-items-center text-muted-foreground hover:text-foreground relative">
            <Bell size={16} />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-destructive" />
          </button>
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-cyan grid place-items-center text-[11px] font-semibold text-white">
            {userInitials}
          </div>
          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="w-9 h-9 rounded-lg border border-border/60 bg-surface/60 grid place-items-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
          >
            <LogOut size={16} />
          </button>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
        <footer className="h-10 border-t border-border/40 px-6 flex items-center justify-between bg-surface/20 backdrop-blur-xl text-[10px] text-muted-foreground select-none">
          <div className="flex items-center gap-1">
            <span>Built by</span>
            <a 
              href="https://rajeswar.tech" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:text-cyan font-bold transition-all duration-300 hover:scale-105"
            >
              Raj
            </a>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-cyan animate-pulse mr-1" />
            <a 
              href="https://rajeswar.tech" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-primary transition-all duration-300 flex items-center gap-0.5 hover:translate-x-0.5"
            >
              Visit <span className="font-semibold underline decoration-cyan/30 hover:decoration-primary/60">rajeswar.tech</span> →
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
