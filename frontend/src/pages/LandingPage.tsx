import { LandingFooter, LandingNav } from '@/components/landing/LandingChrome';
import {
  CapabilityIndex,
  ClosingCTA,
  Hero,
  HowItWorks,
  RuleList,
  TechnologySection,
  WhatItIs,
} from '@/components/landing/LandingSections';

/* Wireframe 1a — light, flush-left, the artifact as proof. Also the entry point
   of the 1m flow map (landing → sign in → scene library → workspace). */
export function LandingPage() {
  return (
    <div className="gt-landing min-h-full bg-neutral pb-xxl text-on-surface">
      <LandingNav />
      <main>
        <Hero />
        <RuleList />
        <TechnologySection />
        <WhatItIs />
        <HowItWorks />
        <CapabilityIndex />
        <ClosingCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
