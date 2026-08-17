import type { FC } from "react";
import { Reveal } from "./reveal";

const STAGES = [
  {
    step: "01",
    tag: "target",
    title: "Point it at a URL",
    body: "Hand it one page, or a whole domain to crawl on a schedule. No config file to hand-write first.",
  },
  {
    step: "02",
    tag: "agent",
    title: "Watch it browse",
    body: "A computer-use agent opens a real browser — scrolling, clicking through pagination, logging in — and reads the page like a visitor would.",
  },
  {
    step: "03",
    tag: "extract",
    title: "Get structured output",
    body: "Every run is checked against a schema you version, and returned as JSON, Markdown, or both — with screenshots and traces to back it up.",
  },
  {
    step: "04",
    tag: "heal",
    title: "Let it fix itself",
    body: "When a scraper's success rate drops, the agent re-diagnoses the page and rebuilds the config — before you notice the gap in your data.",
  },
];

export const PipelineSection: FC = () => {
  return (
    <section className="border-t border-border px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <Reveal className="max-w-2xl">
          <span className="landing-display text-[11px] uppercase tracking-wider text-accent">
            how a run works
          </span>
          <h2 className="landing-display mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            One pipeline, every time.
          </h2>
        </Reveal>

        <div className="relative mt-12">
          <div
            aria-hidden
            className="absolute left-0 right-0 top-6 hidden h-px bg-border lg:block"
          />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STAGES.map((stage, i) => (
              <Reveal key={stage.step} delayMs={i * 90}>
                <div className="relative h-full rounded-2xl border border-border bg-surface p-5">
                  <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border border-accent/40 bg-background">
                    <span className="landing-display text-sm text-accent">{stage.step}</span>
                  </div>
                  <p className="landing-display mt-4 text-[11px] uppercase tracking-wider text-muted">
                    {stage.tag}
                  </p>
                  <p className="mt-1 text-base font-medium text-foreground">{stage.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{stage.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
