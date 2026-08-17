import type { FC } from "react";
import "./landing.css";
import { LandingNavbar } from "./components/landing-navbar";
import { HeroSection } from "./components/hero-section";
import { PipelineSection } from "./components/pipeline-section";
import { CapabilitiesSection } from "./components/capabilities-section";
import { CodeProofSection } from "./components/code-proof-section";
import { FinalCtaSection } from "./components/final-cta-section";
import { LandingFooter } from "./components/landing-footer";

const LandingPage: FC = () => {
  return (
    <div className="landing-page h-full min-h-0 overflow-y-auto bg-background">
      <LandingNavbar />
      <main>
        <HeroSection />
        <PipelineSection />
        <CapabilitiesSection />
        <CodeProofSection />
        <FinalCtaSection />
      </main>
      <LandingFooter />
    </div>
  );
};

export default LandingPage;
