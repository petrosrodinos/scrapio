import type { FC } from "react";
import type { LucideIcon } from "lucide-react";
import { MousePointerClick, RefreshCw, Braces, Clock, Webhook, KeyRound, ShieldAlert, Gauge, FileCode2 } from "lucide-react";
import { Reveal } from "./reveal";

interface Capability {
  icon: LucideIcon;
  title: string;
  body: string;
}

const CAPABILITIES: Capability[] = [
  {
    icon: MousePointerClick,
    title: "Computer-use browsing",
    body: "Clicks, scrolls, types, and screenshots like a real visitor — not a hand-written XPath that breaks on the first redesign.",
  },
  {
    icon: RefreshCw,
    title: "Self-healing scrapers",
    body: "Health and success rate are tracked per scraper. When it drifts, the agent rebuilds the config — not you.",
  },
  {
    icon: FileCode2,
    title: "API specs from traffic",
    body: "Run a browser agent with capture on and every request it makes is distilled into a ready-to-use OpenAPI spec — no manual reverse engineering.",
  },
  {
    icon: Braces,
    title: "Schema-validated output",
    body: "Extractions are checked against a schema you version, returned as JSON, Markdown, or both.",
  },
  {
    icon: Clock,
    title: "Scheduled crawls",
    body: "Cron-based recurring runs with a watchdog that catches jobs stuck mid-crawl.",
  },
  {
    icon: Webhook,
    title: "Signed webhooks",
    body: "HMAC-signed events on run completion — wire results straight into your own pipeline.",
  },
  {
    icon: KeyRound,
    title: "API-first",
    body: "Everything in the dashboard is also an endpoint, Swagger-documented and built to be called.",
  },
  {
    icon: ShieldAlert,
    title: "Block & CAPTCHA detection",
    body: "Regex and selector rules flag blocks before they silently corrupt a run's data.",
  },
  {
    icon: Gauge,
    title: "Per-run cost tracking",
    body: "See exactly what each AI call cost, broken down by model and operation.",
  },
];

export const CapabilitiesSection: FC = () => {
  return (
    <section className="border-t border-border bg-surface/40 px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <Reveal className="max-w-2xl">
          <span className="landing-display text-[11px] uppercase tracking-wider text-accent">
            what's under the hood
          </span>
          <h2 className="landing-display mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Built for the whole job, not just the fetch.
          </h2>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((cap, i) => (
            <Reveal key={cap.title} delayMs={(i % 3) * 80}>
              <div className="h-full rounded-2xl border border-border bg-surface p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <cap.icon className="h-5 w-5" />
                </span>
                <p className="mt-4 text-sm font-medium text-foreground">{cap.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{cap.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};
