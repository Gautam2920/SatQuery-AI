import { LinkButton } from '@/components/ui/Button';
import { Divider } from '@/components/ui/Divider';
import { ProvenanceChip } from '@/components/ui/ProvenanceChip';
import { AnalysisArtifact } from './AnalysisArtifact';
import { TechMarquee } from './TechMarquee';
import { Wrap } from './LandingChrome';
import { ANSWER_CARRIES, CAPABILITIES, HOW_STEPS } from '@/data/landing';

function Kicker({ children }: { children: React.ReactNode }) {
  return <span className="label-caps text-primary-ink">{children}</span>;
}

export function Hero() {
  return (
    <Wrap className="flex flex-col gap-lg pb-xl pt-[48px]">
      <div className="flex flex-col items-start gap-lg">
        <span className="data-sm text-secondary">Satellite imagery analysis · optical + SAR</span>
        <h1 className="display max-w-[15ch] text-balance">
          Ask the scene a question. Read the working.
        </h1>
        <p className="body-lg max-w-[60ch] text-pretty text-on-surface">
          Plain-language questions become geospatial pipelines. Answers arrive with spatial
          evidence, a confidence figure, deterministic measurements and a full execution trace.
        </p>
        <p className="body-sm max-w-[62ch] text-secondary">
          AI interprets. Deterministic geospatial software calculates. The interface keeps that
          separation visible.
        </p>
        <div className="flex flex-wrap gap-md pt-xs">
          <LinkButton to="/library" icon="upload">
            Load a scene
          </LinkButton>
          <LinkButton to="/workspace?run=0f3a91" variant="secondary" iconEnd="arrow-right">
            See a run
          </LinkButton>
        </div>
      </div>

      <div className="pt-lg">
        <AnalysisArtifact />
      </div>
    </Wrap>
  );
}

const RULES = [
  {
    h: 'Visual question answering',
    p: 'Answers a question about one scene, with the region it read.',
  },
  { h: 'Spatial grounding', p: 'Outlines the pixels the answer rests on.' },
  { h: 'Geospatial computation', p: 'Areas, distances and transects computed, not estimated.' },
  { h: 'Change detection', p: 'Will compare two registered scenes and outline differing regions.' },
];

export function RuleList() {
  return (
    <Wrap className="pt-xxl">
      <div className="grid grid-cols-4 gap-gutter max-[900px]:grid-cols-2 max-[560px]:grid-cols-1">
        {RULES.map((r) => (
          <div key={r.h} className="border-t border-border pt-md">
            <div className="title-sm text-[length:var(--text-body-sm-size)]">{r.h}</div>
            <p className="body-sm mt-[6px] text-secondary">{r.p}</p>
          </div>
        ))}
      </div>
    </Wrap>
  );
}

export function TechnologySection() {
  return (
    <Wrap id="technology" className="flex flex-col items-start gap-md pt-xxl">
      <Kicker>Technology</Kicker>
      <h2 className="headline-lg max-w-[24ch]">The stack under the answer.</h2>
      <div className="flex w-full items-baseline gap-md">
        <p className="body-sm max-w-[64ch] text-secondary">
          Interpretation and calculation run on separate stacks. Every model name, version and
          parameter that touched a run is written into that run&rsquo;s trace and its export.
        </p>
        <span className="flex-1" />
        <span className="data-sm shrink-0 text-secondary max-[720px]:hidden">
          auto-scrolling · hover to slow
        </span>
      </div>
      <TechMarquee />
    </Wrap>
  );
}

export function WhatItIs() {
  return (
    <Wrap
      id="what"
      className="grid grid-cols-[minmax(0,560px)_1fr] items-start gap-xl pt-xxl max-[900px]:grid-cols-1"
    >
      <div className="flex flex-col items-start gap-md">
        <Kicker>What SatQuery AI is</Kicker>
        <h2 className="headline-lg max-w-[22ch]">An agentic instrument for satellite imagery.</h2>
        <p className="body-lg text-pretty text-on-surface">
          You provide a scene and a question in plain language. SatQuery interprets the question,
          decides what analysis it requires, orchestrates the models and geospatial operations that
          answer it, and executes them.
        </p>
        <p className="body-lg text-pretty text-on-surface">
          What comes back is an answer with spatial evidence, a confidence figure, provenance on
          every value, deterministic measurements and an execution trace you can open stage by
          stage.
        </p>
      </div>
      <div className="flex flex-col gap-md border-l border-border pl-lg max-[900px]:border-l-0 max-[900px]:pl-0">
        <span className="label-caps text-secondary">What every answer carries</span>
        <div className="data-sm flex flex-col">
          {ANSWER_CARRIES.map((row) => (
            <div
              key={row.k}
              className="flex justify-between border-b border-border py-[3px] last:border-b-0"
            >
              <span className="text-on-surface">{row.k}</span>
              <span className="text-secondary">{row.v}</span>
            </div>
          ))}
        </div>
      </div>
    </Wrap>
  );
}

export function HowItWorks() {
  return (
    <Wrap id="how" className="flex flex-col items-start gap-lg pt-xxl">
      <Kicker>How it works</Kicker>
      <h2 className="headline-lg max-w-[24ch]">One question, seven stages, nothing hidden.</h2>
      <div className="flex w-full flex-wrap">
        {HOW_STEPS.map((step) => (
          <div
            key={step.n}
            className={`min-w-[130px] flex-1 border-t px-[14px] pb-[14px] pt-md ${
              'edge' in step && step.edge ? 'border-primary-ink' : 'border-border'
            }`}
          >
            <div
              className={`data-sm ${'edge' in step && step.edge ? 'text-primary-ink' : 'text-secondary'}`}
            >
              {step.n}
            </div>
            <div className="title-sm mt-xs text-[length:var(--text-body-sm-size)]">{step.s}</div>
            <p className="body-sm mt-xs text-secondary">{step.p}</p>
          </div>
        ))}
      </div>
      <p className="body-sm max-w-[70ch] text-secondary">
        Stages advance one at a time in the workspace. A halted chain names the operation that
        stopped it and produces no answer.
      </p>
    </Wrap>
  );
}

export function CapabilityIndex() {
  return (
    <Wrap id="capabilities" className="flex flex-col items-start gap-lg pt-xxl">
      <Kicker>Capability index</Kicker>
      <h2 className="headline-lg max-w-[24ch]">Nine capabilities, and what produces each.</h2>
      <div className="w-full">
        <div className="label-caps grid grid-cols-[240px_1fr_120px_78px] gap-gutter border-b border-border py-sm text-secondary max-[760px]:grid-cols-1 max-[760px]:gap-xs">
          <span>Capability</span>
          <span className="max-[760px]:hidden">What it does</span>
          <span className="max-[760px]:hidden">Produced by</span>
          <span className="text-right max-[760px]:hidden">State</span>
        </div>
        {CAPABILITIES.map((c) => (
          <div
            key={c.capability}
            className="body-sm grid grid-cols-[240px_1fr_120px_78px] items-baseline gap-gutter border-b border-border py-md max-[760px]:grid-cols-1 max-[760px]:gap-xs"
          >
            <span className="title-sm text-[length:var(--text-body-sm-size)]">{c.capability}</span>
            <span className="text-on-surface">{c.what}</span>
            <span
              className={`data-sm ${c.producedBy === 'measured' ? 'text-verified' : 'text-primary-ink'}`}
            >
              {c.producedBy}
            </span>
            <span
              className={`data-sm text-right max-[760px]:text-left ${
                c.state === 'roadmap' ? 'text-primary-ink' : 'text-secondary'
              }`}
            >
              {c.state}
            </span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-sm">
        <ProvenanceChip kind="measured">bi-temporal change detection · roadmap</ProvenanceChip>
        <ProvenanceChip kind="interpreted">SAR analysis &amp; fusion · roadmap</ProvenanceChip>
      </div>
    </Wrap>
  );
}

export function ClosingCTA() {
  return (
    <Wrap className="flex flex-col items-start gap-lg pt-xxl">
      <h2 className="headline-lg max-w-[22ch]">Load a scene and ask one question.</h2>
      <p className="body-lg max-w-[60ch] text-on-surface">
        A run takes about eleven seconds and leaves a record you can hand to a reviewer.
      </p>
      <div className="flex flex-wrap gap-md">
        <LinkButton to="/library" icon="upload">
          Load a scene
        </LinkButton>
        <LinkButton to="/workspace?run=0f3a91" variant="secondary" iconEnd="arrow-right">
          See a run
        </LinkButton>
      </div>
      <Divider className="mt-lg" />
    </Wrap>
  );
}
