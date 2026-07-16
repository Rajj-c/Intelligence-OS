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
  LogOut,
  Loader2,
  Menu,
  Trash2,
  BellOff,
  Shield,
  Info,
} from "lucide-react";

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

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



interface SidebarContentProps {
  onClose?: () => void;
}

function SidebarContent({ onClose }: SidebarContentProps) {
  const loc = useLocation();
  return (
    <div className="flex flex-col h-full bg-sidebar/80 backdrop-blur-xl">
      <Link to="/" className="flex items-center gap-2 px-6 h-16 border-b border-border/40" onClick={onClose}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-cyan flex items-center justify-center">
          <Brain size={18} className="text-white" />
        </div>
        <span className="font-semibold tracking-tight text-white">TalentOS</span>
      </Link>
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground">Workspace</div>
        {NAV.map((n) => {
          const active = loc.pathname === n.to || (n.to !== "/dashboard" && loc.pathname.startsWith(n.to));
          return (
            <Link
              key={n.to}
              to={n.to}
              onClick={onClose}
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

      </nav>

      <div className="p-3 border-t border-border/40">
        <div className="glass-panel rounded-xl p-3 text-xs">
          <div className="flex items-center gap-2 text-emerald">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald pulse-ring" />
            <span className="font-medium text-emerald">AI Engine</span>
          </div>
          <div className="mt-1 text-muted-foreground">All models healthy · v4.2</div>
        </div>
      </div>
    </div>
  );
}

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  unread: boolean;
  type: 'match' | 'system' | 'security' | 'database';
}

export default function AppShell() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "1",
      title: "High-Precision Match Found",
      description: "Sarah Jenkins scored 96% for Backend Architect role matching 8/10 core skills.",
      time: "10m ago",
      unread: true,
      type: "match",
    },
    {
      id: "2",
      title: "Resume Ingestion Complete",
      description: "Ingested and parsed 12 candidate profiles. Experience matrices updated.",
      time: "1h ago",
      unread: true,
      type: "database",
    },
    {
      id: "3",
      title: "Tenant context secured",
      description: "Successfully validated JWT session and active organization Row-Level Security policies.",
      time: "2h ago",
      unread: false,
      type: "security",
    },
    {
      id: "4",
      title: "AI scoring settings updated",
      description: "Increased semantic weight to 55% and reduced experience weight deviation.",
      time: "1d ago",
      unread: false,
      type: "system",
    },
  ]);

  useEffect(() => {
    // Add a dynamic notification after 20 seconds to showcase live engine updates
    const timer = setTimeout(() => {
      setNotifications(prev => {
        if (prev.some(n => n.id === "dynamic-1")) return prev;
        toast.info("New matching intelligence signal received!");
        return [
          {
            id: "dynamic-1",
            title: "Live Match Engine Alert",
            description: "New active candidate signup matched your Frontend Developer requisition (91%).",
            time: "Just now",
            unread: true,
            type: "match",
          },
          ...prev,
        ];
      });
    }, 20000);
    return () => clearTimeout(timer);
  }, []);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const toggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: !n.unread } : n))
    );
  };

  const deleteNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

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
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-border/40 bg-sidebar/80 backdrop-blur-xl flex-col">
        <SidebarContent />
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 px-4 lg:px-6 border-b border-border/40 bg-background/60 backdrop-blur-xl flex items-center gap-3 sticky top-0 z-30">
          {/* Mobile hamburger menu toggle */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <button className="lg:hidden p-2 rounded-lg border border-border/60 bg-surface/60 text-muted-foreground hover:text-foreground cursor-pointer shrink-0">
                <Menu size={16} />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 bg-sidebar border-r border-border/40">
              <SidebarContent onClose={() => setIsOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="flex-1 max-w-xl">
            <div className="flex items-center gap-2 px-3 h-9 rounded-lg bg-surface/60 border border-border/60 text-sm text-muted-foreground">
              <Search size={14} />
              <input
                placeholder="Search candidates, jobs, skills..."
                className="bg-transparent outline-none flex-1 text-foreground placeholder:text-muted-foreground text-xs sm:text-sm"
              />
              <kbd className="hidden sm:inline-block font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface-2 border border-border/60">⌘K</kbd>
            </div>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <button className="w-9 h-9 rounded-lg border border-border/60 bg-surface/60 grid place-items-center text-muted-foreground hover:text-foreground relative shrink-0 cursor-pointer">
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-destructive animate-pulse" />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 sm:w-96 p-0 bg-surface border border-border/60 shadow-2xl rounded-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-border/60 bg-surface-2/40">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={markAllAsRead}
                      className="text-[11px] text-primary hover:underline cursor-pointer bg-transparent border-none outline-none font-medium"
                    >
                      Mark all as read
                    </button>
                    <button 
                      onClick={clearAll}
                      className="text-[11px] text-muted-foreground hover:text-destructive cursor-pointer bg-transparent border-none outline-none font-medium animate-fade-in"
                      title="Clear all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
                {notifications.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center px-4">
                    <div className="w-10 h-10 rounded-full bg-surface-2 border border-border/60 flex items-center justify-center text-muted-foreground/60 mb-3">
                      <BellOff size={18} />
                    </div>
                    <p className="text-xs font-semibold text-foreground mb-0.5">All caught up!</p>
                    <p className="text-[10px] text-muted-foreground max-w-[200px]">You have no new recruitment alerts or matching signals.</p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    let Icon = Info;
                    let iconColor = "text-amber-500 bg-amber-500/10 border-amber-500/20";
                    
                    if (n.type === 'match') {
                      Icon = Sparkles;
                      iconColor = "text-primary bg-primary/10 border-primary/20";
                    } else if (n.type === 'security') {
                      Icon = Shield;
                      iconColor = "text-cyan bg-cyan/10 border-cyan/20";
                    } else if (n.type === 'database') {
                      Icon = Database;
                      iconColor = "text-purple-400 bg-purple-400/10 border-purple-400/20";
                    }
                    
                    return (
                      <div 
                        key={n.id}
                        onClick={() => toggleRead(n.id)}
                        className={`p-3.5 flex items-start gap-3 hover:bg-surface-2/30 cursor-pointer transition-colors relative group ${n.unread ? 'bg-primary/5' : ''}`}
                      >
                        {n.unread && (
                          <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        )}
                        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${iconColor}`}>
                          <Icon size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-xs font-medium truncate ${n.unread ? 'text-foreground' : 'text-muted-foreground'}`}>{n.title}</p>
                            <span className="text-[10px] text-muted-foreground shrink-0">{n.time}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed break-words">{n.description}</p>
                        </div>
                        <button
                          onClick={(e) => deleteNotification(n.id, e)}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1 rounded hover:bg-surface-2 transition-all shrink-0 cursor-pointer self-center"
                          title="Dismiss"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </PopoverContent>
          </Popover>
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-cyan grid place-items-center text-[11px] font-semibold text-white shrink-0">
            {userInitials}
          </div>
          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="w-9 h-9 rounded-lg border border-border/60 bg-surface/60 grid place-items-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer shrink-0"
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
