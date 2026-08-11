import { useNavigate } from "react-router-dom";
import { ArrowRight, Bot, FileCode2, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Routes } from "@/routes/routes";

interface WorkflowOption {
  id: string;
  title: string;
  description: string;
  bullets: string[];
  icon: LucideIcon;
  href: string;
}

const workflowOptions: WorkflowOption[] = [
  {
    id: "plain-scrape",
    title: "Plain scrape",
    description:
      "Fetch a fixed list of URLs and return raw HTML and cleaned content. Optionally add AI normalization to structured JSON or Markdown.",
    bullets: [
      "Fastest, cheapest option",
      "No AI required for raw HTML/content",
      "Great for known, stable page structures",
    ],
    icon: FileCode2,
    href: `${Routes.plainScrape.list}?create=1`,
  },
  {
    id: "reusable-scraper",
    title: "Generate reusable scraper",
    description:
      "Use an AI computer-use session to design a repeatable scraper for a website target, then run it on a schedule with selectors it discovered.",
    bullets: [
      "Best for sites you'll crawl repeatedly",
      "AI figures out selectors once, reuses them cheaply",
      "Self-healing via re-generation when the site changes",
    ],
    icon: Sparkles,
    href: `${Routes.generationRuns.list}?create=1`,
  },
  {
    id: "browser-agent",
    title: "Browser agent",
    description:
      "Let a computer-use agent visually explore a site in real time — clicking, scrolling, and navigating — to find and return normalized information.",
    bullets: [
      "No selectors or generation step needed",
      "Handles dynamic, exploratory tasks",
      "Best for one-off or loosely structured lookups",
    ],
    icon: Bot,
    href: `${Routes.browserAgent.list}?create=1`,
  },
];

function WorkflowCard({ option }: { option: WorkflowOption }) {
  const navigate = useNavigate();
  const Icon = option.icon;

  return (
    <button
      onClick={() => navigate(option.href)}
      className="group flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 text-left transition-all hover:border-accent/50 hover:shadow-lg hover:-translate-y-0.5"
    >
      <div className="flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <Icon className="h-5 w-5" />
        </div>
        <ArrowRight className="h-4 w-4 text-muted opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-lg font-semibold text-foreground">{option.title}</p>
        <p className="text-sm text-muted leading-relaxed">{option.description}</p>
      </div>

      <ul className="flex flex-col gap-1.5 border-t border-border pt-4">
        {option.bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-2 text-xs text-muted">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
            {bullet}
          </li>
        ))}
      </ul>
    </button>
  );
}

export default function NewWorkflowPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-2xl font-semibold tracking-tight text-foreground">New workflow</p>
        <p className="text-sm text-muted mt-1">
          Choose how you want to extract data from a website.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {workflowOptions.map((option) => (
          <WorkflowCard key={option.id} option={option} />
        ))}
      </div>
    </div>
  );
}
