import { useNavigate } from "react-router-dom";
import { Chip } from "@heroui/react";
import { ExternalLink, Link2 } from "lucide-react";
import { Routes } from "@/routes/routes";
import { formatDateTime } from "@/lib/date";
import { formatDuration } from "@/lib/duration";
import { getOutputFormatLabel } from "@/config/constants/dropdowns/scrapers/output-format-form.options";
import {
  WorkflowTypes,
  type CrawlRunDetail,
} from "@/features/crawl-runs/interfaces/crawl-runs.interfaces";

interface CrawlRunOverviewProps {
  run: CrawlRunDetail;
}

function Metric({ label, value }: { label: string; value: string }) {
  const empty = value === "—";
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</span>
      <span
        className={
          empty
            ? "text-sm text-muted/70 tabular-nums"
            : "text-sm font-medium text-foreground tabular-nums"
        }
      >
        {value}
      </span>
    </div>
  );
}

export function CrawlRunOverview({ run }: CrawlRunOverviewProps) {
  const navigate = useNavigate();
  const isScraper = run.type === WorkflowTypes.SCRAPER;
  const isPlainScrape = run.type === WorkflowTypes.PLAIN_SCRAPE;
  const urls = run.urls?.filter(Boolean) ?? [];
  const hasMultipleUrls = isPlainScrape && urls.length > 1;
  const primaryUrl = run.website_target_id
    ? null
    : hasMultipleUrls
      ? null
      : (run.url ?? urls[0] ?? null);

  const openConfig = () => {
    if (!run.workflow_config_id) return;
    if (isScraper) {
      navigate(Routes.scrapers.detail(run.workflow_config_id));
      return;
    }
    if (isPlainScrape) {
      navigate(Routes.plainScrape.detail(run.workflow_config_id));
      return;
    }
    navigate(Routes.browserAgent.detail(run.workflow_config_id));
  };

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="grid gap-5 p-5 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)] sm:gap-8">
        <div className="flex flex-col gap-4 min-w-0">
          <div className="flex flex-col gap-1.5 min-w-0">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
              {isScraper ? "Scraper" : "Config"}
            </span>
            {run.workflow_config_id ? (
              <button
                type="button"
                className="text-base font-semibold text-accent hover:underline text-left truncate w-fit max-w-full"
                onClick={openConfig}
              >
                {run.workflow_config?.name ?? run.workflow_config_id}
              </button>
            ) : (
              <span className="text-sm text-muted">—</span>
            )}
          </div>

          {run.website_target_id ? (
            <div className="flex flex-col gap-1.5 min-w-0">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
                Website target
              </span>
              <button
                type="button"
                className="text-sm font-medium text-accent hover:underline text-left truncate w-fit max-w-full"
                onClick={() => navigate(Routes.websiteTargets.detail(run.website_target_id!))}
              >
                {run.website_target?.name ?? run.website_target_id}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 min-w-0">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
                {hasMultipleUrls ? "URLs" : "URL"}
              </span>
              {hasMultipleUrls ? (
                <ul className="flex flex-col gap-1.5 rounded-lg border border-border bg-background/60 p-3">
                  {urls.slice(0, 4).map((u) => (
                    <li key={u} className="flex items-start gap-2 min-w-0">
                      <Link2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted" />
                      <span className="text-sm text-foreground break-all" title={u}>
                        {u}
                      </span>
                    </li>
                  ))}
                  {urls.length > 4 && (
                    <li className="text-xs text-muted pl-6">+{urls.length - 4} more</li>
                  )}
                </ul>
              ) : primaryUrl ? (
                <a
                  href={primaryUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex items-start gap-2 max-w-full rounded-lg border border-border bg-background/60 px-3 py-2 transition-colors hover:border-accent/40 hover:bg-accent/5"
                  title={primaryUrl}
                >
                  <Link2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted group-hover:text-accent" />
                  <span className="text-sm text-foreground break-all flex-1 min-w-0">
                    {primaryUrl}
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                </a>
              ) : (
                <span className="text-sm text-muted">—</span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 min-w-0 sm:border-l sm:border-border sm:pl-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Metric label="Started" value={formatDateTime(run.started_at)} />
            <Metric label="Finished" value={formatDateTime(run.finished_at)} />
            <Metric label="Duration" value={formatDuration(run.duration_ms)} />
          </div>

          {run.output_formats && run.output_formats.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
                Output formats
              </span>
              <div className="flex flex-wrap gap-1.5">
                {run.output_formats.map((format) => (
                  <Chip key={format} size="sm" variant="soft">
                    <Chip.Label>{getOutputFormatLabel(format)}</Chip.Label>
                  </Chip>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {run.error_message && (
        <div className="border-t border-danger/20 bg-danger/5 px-5 py-3">
          <span className="text-[11px] font-medium uppercase tracking-wider text-danger">
            Error
          </span>
          <p className="mt-1 text-sm text-danger whitespace-pre-wrap">{run.error_message}</p>
        </div>
      )}
    </div>
  );
}
