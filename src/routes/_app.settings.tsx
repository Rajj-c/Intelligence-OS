import { createFileRoute } from "@tanstack/react-router";
import { Building2, Globe, Shield, Users } from "lucide-react";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — TalentOS" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="p-8 max-w-4xl space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Organization Settings</div>
        <h1 className="font-display text-4xl text-gradient mt-1">Workspace</h1>
      </div>

      <Section icon={Building2} title="Organization">
        <Row label="Organization name" value="Acme Talent Group" />
        <Row label="Workspace URL" value="acme.talentos.ai" />
        <Row label="Plan" value="Enterprise · 200 seats" badge="Active" />
      </Section>

      <Section icon={Shield} title="Security & Compliance">
        <Row label="SSO" value="Okta SAML 2.0" badge="Enabled" />
        <Row label="Data residency" value="EU (Frankfurt)" />
        <Row label="SOC 2 Type II" value="Audit passed — Q1 2026" badge="Verified" />
        <Row label="AI data retention" value="Zero retention mode" />
      </Section>

      <Section icon={Users} title="Team">
        <Row label="Active recruiters" value="38 / 200" />
        <Row label="Hiring managers" value="124" />
        <Row label="Roles & permissions" value="3 custom roles" />
      </Section>

      <Section icon={Globe} title="AI Engine">
        <Row label="Model version" value="TalentOS v4.2 (Aug 2026)" badge="Latest" />
        <Row label="Bias audit" value="Last run 4 days ago" />
        <Row label="Custom skill ontology" value="847 entities" />
      </Section>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="glass-panel rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 grid place-items-center text-primary">
          <Icon size={14} />
        </div>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="divide-y divide-border/40">{children}</div>
    </div>
  );
}

function Row({ label, value, badge }: { label: string; value: string; badge?: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="flex items-center gap-2">
        <div className="text-sm">{value}</div>
        {badge && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald/15 text-emerald border border-emerald/30 uppercase tracking-wider">{badge}</span>}
      </div>
    </div>
  );
}
