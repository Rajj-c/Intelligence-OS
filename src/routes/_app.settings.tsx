import { createFileRoute } from "@tanstack/react-router";
import { Building2, Globe, Shield, Users, Bell, Eye, EyeOff, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — TalentOS" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  // Org settings
  const [orgName, setOrgName] = useState("Acme Talent Group");
  
  // Security
  const [ssoEnabled, setSsoEnabled] = useState(true);
  const [zeroRetention, setZeroRetention] = useState(true);
  
  // AI Settings
  const [selectedModel, setSelectedModel] = useState("TalentOS v4.2 (Aug 2026)");
  const [biasMitigation, setBiasMitigation] = useState(true);
  const [matchingTemp, setMatchingTemp] = useState(0.3);
  
  // Preferences
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [slackAlerts, setSlackAlerts] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  
  // API settings
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState("tos_live_4a89bc213fe890ad9bcf78e");

  const handleRegenerateKey = () => {
    const newKey = "tos_live_" + Math.random().toString(16).slice(2, 10) + Math.random().toString(16).slice(2, 10);
    setApiKey(newKey);
    toast.success("API key regenerated successfully!");
  };

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Recruiter Workspace Settings</div>
        <h1 className="font-display text-4xl text-gradient mt-1 font-semibold">Settings Console</h1>
      </div>

      <Section icon={Building2} title="Organization Profile">
        <InputRow label="Organization name" value={orgName} onSave={(v) => { setOrgName(v); toast.success(`Org name updated to "${v}"`); }} />
        <CopyRow label="Workspace URL" value="acme.talentos.ai" />
        <div className="flex items-center justify-between py-3 border-t border-border/20">
          <div className="text-sm text-muted-foreground">Subscription Plan</div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald/15 text-emerald border border-emerald/30">Enterprise</span>
            <button onClick={() => toast.info("Seat management is locked by administrator")} className="text-xs px-2.5 py-1 bg-surface border border-border/60 hover:bg-surface-2 rounded-lg transition-colors cursor-pointer font-medium">
              Manage 20 seats
            </button>
          </div>
        </div>
      </Section>

      <Section icon={Shield} title="Security & Compliance">
        <ToggleRow label="Enable Single Sign-On (SSO)" checked={ssoEnabled} onChange={setSsoEnabled} />
        <ToggleRow label="Zero Data Retention mode" checked={zeroRetention} onChange={setZeroRetention} />
        <div className="flex items-center justify-between py-3 border-t border-border/20">
          <div className="text-sm text-muted-foreground">SOC 2 Type II audit</div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan/15 text-cyan border border-cyan/30 font-semibold uppercase tracking-wider">Verified Q1 2026</span>
        </div>
      </Section>

      <Section icon={Globe} title="AI Engine Alignment">
        <div className="flex items-center justify-between py-3">
          <div className="text-sm text-muted-foreground">Primary Matching Model</div>
          <Select 
            value={selectedModel} 
            options={["TalentOS v4.2 (Aug 2026)", "Gemini 2.5 Pro", "Gemini 2.5 Flash"]} 
            onChange={(v) => { setSelectedModel(v); toast.success(`Active AI model set to ${v}`); }} 
          />
        </div>
        <ToggleRow label="Pre-flight Bias Mitigation layer" checked={biasMitigation} onChange={setBiasMitigation} />
        <div className="flex items-center justify-between py-3 border-t border-border/20">
          <div className="text-sm text-muted-foreground">Matching Temperature (Precision)</div>
          <Slider value={matchingTemp} min={0} max={1} step={0.1} onChange={setMatchingTemp} />
        </div>
      </Section>

      <Section icon={Bell} title="Notifications & Team Preferences">
        <ToggleRow label="Email digest summaries" checked={emailAlerts} onChange={setEmailAlerts} />
        <ToggleRow label="Slack candidate triggers" checked={slackAlerts} onChange={(v) => {
          setSlackAlerts(v);
          if (v) toast.info("Slack bot configuration requested. Check admin inbox.");
        }} />
        <ToggleRow label="Use Dark Interface" checked={darkMode} onChange={setDarkMode} />
      </Section>

      <Section icon={Users} title="Developer API Access">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-2">
          <div className="text-sm text-muted-foreground">Public API Key</div>
          <div className="flex items-center gap-2">
            <div className="text-sm font-mono bg-surface-2 px-3 py-1.5 rounded-lg border border-border/40 flex items-center gap-2 select-all">
              {showApiKey ? apiKey : "••••••••••••••••••••••••••••••••"}
              <button onClick={() => setShowApiKey(!showApiKey)} className="text-muted-foreground hover:text-foreground ml-1 cursor-pointer">
                {showApiKey ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
            <button onClick={handleRegenerateKey} className="text-xs px-2.5 py-1.5 border border-border/60 hover:bg-surface-2 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer font-medium">
              <RefreshCw size={12} /> Regenerate
            </button>
          </div>
        </div>
      </Section>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="glass-panel rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-2 pb-1">
        <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 grid place-items-center text-primary">
          <Icon size={14} />
        </div>
        <h3 className="font-semibold text-foreground">{title}</h3>
      </div>
      <div className="divide-y divide-border/20">{children}</div>
    </div>
  );
}

function InputRow({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }) {
  const [val, setVal] = useState(value);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    onSave(val);
    setIsEditing(false);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-2">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="flex items-center gap-2">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              className="bg-surface border border-border/60 rounded-lg px-2.5 py-1 text-xs text-foreground outline-none focus:border-primary/60 w-44"
            />
            <button
              onClick={handleSave}
              className="text-xs px-2.5 py-1 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors cursor-pointer font-medium"
            >
              Save
            </button>
            <button
              onClick={() => { setVal(value); setIsEditing(false); }}
              className="text-xs px-2.5 py-1 border border-border/60 hover:bg-surface-2 rounded-lg transition-colors cursor-pointer font-medium"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium">{val}</div>
            <button
              onClick={() => setIsEditing(true)}
              className="text-[10px] text-primary hover:text-cyan font-bold px-2 py-0.5 rounded border border-primary/20 hover:border-cyan/30 transition-colors cursor-pointer"
            >
              Edit
            </button>
            {isSaved && <span className="text-[10px] text-emerald animate-fade-in">Saved!</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success("Workspace URL copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-between py-3">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="flex items-center gap-2">
        <div className="text-sm font-mono bg-surface-2 px-2.5 py-1 rounded-md text-xs border border-border/40">{value}</div>
        <button
          onClick={handleCopy}
          className="text-xs px-2.5 py-1 border border-border/60 hover:bg-surface-2 rounded-lg transition-colors flex items-center gap-1 cursor-pointer font-medium"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="text-sm text-muted-foreground">{label}</div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-300 relative focus:outline-none cursor-pointer shrink-0 ${
          checked ? "bg-primary" : "bg-surface-3 border border-border/60"
        }`}
      >
        <div
          className={`w-3.5 h-3.5 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function Select({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-surface border border-border/60 rounded-lg px-2.5 py-1 text-xs text-foreground outline-none focus:border-primary/60 transition-colors"
    >
      {options.map((opt) => (
        <option key={opt} value={opt} className="bg-background">
          {opt}
        </option>
      ))}
    </select>
  );
}

function Slider({ value, min, max, step, onChange }: { value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3 w-48 shrink-0">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary h-1 bg-surface-3 rounded-lg appearance-none cursor-pointer"
      />
      <span className="text-xs font-mono text-muted-foreground w-8 text-right font-medium">{value.toFixed(1)}</span>
    </div>
  );
}
