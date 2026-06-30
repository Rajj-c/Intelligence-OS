import { createFileRoute } from "@tanstack/react-router";
import HeroLanding from "@/components/landing/HeroLanding";
import {
  TrustSection,
  FeaturesSection,
  IntelligenceSection,
  CTASection,
} from "@/components/landing/LandingSections";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TalentOS — AI Talent Intelligence Platform" },
      { name: "description", content: "Discover hidden talent with semantic AI, explainable ranking, and predictive hiring success. The intelligence operating system for modern recruiting teams." },
      { property: "og:title", content: "TalentOS — Hire Beyond Keywords" },
      { property: "og:description", content: "Enterprise-grade AI recruitment intelligence." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <HeroLanding />
      <TrustSection />
      <FeaturesSection />
      <IntelligenceSection />
      <CTASection />
    </div>
  );
}
