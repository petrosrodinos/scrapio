import type { FC } from "react";
import { Reveal } from "./reveal";

export const CodeProofSection: FC = () => {
  return (
    <section className="border-t border-border px-6 py-20">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <span className="landing-display text-[11px] uppercase tracking-wider text-accent">
            api-first
          </span>
          <h2 className="landing-display mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Built to be called, not just clicked.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted sm:text-base">
            Every scraper, run, and webhook is a documented endpoint. Trigger a run from your own
            code, or let a signed webhook tell you the moment one finishes.
          </p>
        </Reveal>

        <Reveal delayMs={100}>
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow)]">
            <div className="flex items-center gap-1.5 border-b border-border bg-surface-secondary px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
              <span className="landing-display ml-3 text-[11px] text-muted">
                run.completed webhook
              </span>
            </div>
            <pre className="landing-display overflow-x-auto p-5 text-[13px] leading-relaxed">
              <code>
                <span className="text-muted">POST </span>
                <span className="text-foreground">https://your-app.com/hooks/scrapio</span>
                {"\n"}
                <span className="text-muted">X-Scrapio-Signature: </span>
                <span className="text-foreground">sha256=...</span>
                {"\n\n"}
                <span className="text-muted">{"{"}</span>
                {"\n"}
                <span className="pl-4 block">
                  <span className="text-accent">{'"event"'}</span>
                  <span className="text-muted">: </span>
                  <span className="text-foreground">{'"run.completed"'}</span>
                  <span className="text-muted">,</span>
                </span>
                <span className="pl-4 block">
                  <span className="text-accent">{'"scraper_id"'}</span>
                  <span className="text-muted">: </span>
                  <span className="text-foreground">{'"scr_8f2e1c"'}</span>
                  <span className="text-muted">,</span>
                </span>
                <span className="pl-4 block">
                  <span className="text-accent">{'"success_rate"'}</span>
                  <span className="text-muted">: </span>
                  <span className="text-foreground">0.98</span>
                  <span className="text-muted">,</span>
                </span>
                <span className="pl-4 block">
                  <span className="text-accent">{'"records_extracted"'}</span>
                  <span className="text-muted">: </span>
                  <span className="text-foreground">214</span>
                </span>
                <span className="text-muted">{"}"}</span>
              </code>
            </pre>
          </div>
        </Reveal>
      </div>
    </section>
  );
};
