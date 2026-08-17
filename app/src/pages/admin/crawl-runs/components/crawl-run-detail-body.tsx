import { useNavigate } from "react-router-dom";
import { Accordion } from "@heroui/react";
import { Download, Loader2 } from "lucide-react";
import { Routes } from "@/routes/routes";
import { ComputerUseSessionReplay } from "@/components/ui/computer-use-session-replay";
import { formatDateTime } from "@/lib/date";
import { formatDuration } from "@/lib/duration";
import {
  CrawlRunStatuses,
  WorkflowTypes,
  type CrawlRunDetail,
  type CrawlRunStatus,
} from "@/features/crawl-runs/interfaces/crawl-runs.interfaces";
import type { JobStatus } from "@/features/jobs/interfaces/jobs.interfaces";
import { CrawlRunOverview } from "./crawl-run-overview";
import { ExtractionMarkdownPreview } from "./extraction-markdown-preview";
import { JobStatusChip } from "./job-status-chip";

const ACTIVE_STATUSES: CrawlRunStatus[] = [
  CrawlRunStatuses.QUEUED,
  CrawlRunStatuses.RUNNING,
];

interface CrawlRunDetailBodyProps {
  run: CrawlRunDetail;
}

export function CrawlRunDetailBody({ run }: CrawlRunDetailBodyProps) {
  const navigate = useNavigate();
  const isActive = ACTIVE_STATUSES.includes(run.status);
  const traces = run.execution_traces ?? [];
  const jobLogs = run.job_logs ?? [];
  const pages = run.pages ?? [];
  const steps = run.steps ?? [];
  const extractionResult = run.extraction_result ?? null;
  const isScraper = run.type === WorkflowTypes.SCRAPER;
  const isPlainScrape = run.type === WorkflowTypes.PLAIN_SCRAPE;
  const isBrowserAgent = run.type === WorkflowTypes.BROWSER_AGENT;

  return (
    <div className="flex flex-col gap-6">
      {run.status === CrawlRunStatuses.QUEUED && (
        <div className="rounded-xl border border-border bg-surface-secondary/60 p-6 flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted shrink-0" />
          <p className="text-sm text-foreground">Queued — waiting for a worker to pick this up.</p>
        </div>
      )}

      {run.status === CrawlRunStatuses.RUNNING && (
        <div className="rounded-xl border border-accent/30 bg-accent/10 p-6 flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-accent shrink-0" />
          <p className="text-sm text-foreground">Running — live updates every few seconds.</p>
        </div>
      )}

      {extractionResult?.markdown ? (
        <ExtractionMarkdownPreview markdown={extractionResult.markdown} />
      ) : null}

      <CrawlRunOverview run={run} />

      {isBrowserAgent && run.collected_data && (
        <div className="rounded-xl border border-border bg-surface px-6">
          <Accordion defaultExpandedKeys={[]} hideSeparator>
            <Accordion.Item id="collected-data">
              <Accordion.Heading>
                <Accordion.Trigger className="text-sm font-medium text-foreground">
                  Collected data
                  <Accordion.Indicator />
                </Accordion.Trigger>
              </Accordion.Heading>
              <Accordion.Panel>
                <Accordion.Body>
                  <pre className="rounded-lg border border-border bg-background p-3 text-xs overflow-auto max-h-96 mb-4">
                    {JSON.stringify(run.collected_data, null, 2)}
                  </pre>
                </Accordion.Body>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </div>
      )}

      {(isScraper || traces.length > 0) && (
        <div className="rounded-xl border border-border bg-surface px-6">
          <Accordion defaultExpandedKeys={[]} hideSeparator>
            <Accordion.Item id="execution-traces">
              <Accordion.Heading>
                <Accordion.Trigger className="text-sm font-medium text-foreground">
                  Execution traces ({traces.length})
                  <Accordion.Indicator />
                </Accordion.Trigger>
              </Accordion.Heading>
              <Accordion.Panel>
                <Accordion.Body>
                  <div className="flex flex-col gap-4 pb-4">
                    {run.diagnostics_package ? (
                      <button
                        className="text-sm text-accent hover:underline self-start"
                        onClick={() =>
                          navigate(Routes.diagnostics.detail(run.diagnostics_package!.id))
                        }
                      >
                        View diagnostics
                      </button>
                    ) : null}
                    {traces.length === 0 ? (
                      <p className="text-sm text-muted">No execution traces recorded.</p>
                    ) : (
                      traces.map((trace) => (
                        <div key={trace.id} className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 text-sm">
                            <span className={trace.success ? "text-success" : "text-danger"}>
                              {trace.success ? "Success" : "Failed"}
                            </span>
                            <span className="text-muted">{formatDateTime(trace.created_at)}</span>
                            {trace.error_summary ? (
                              <span className="text-danger text-xs">{trace.error_summary}</span>
                            ) : null}
                          </div>
                          <pre className="rounded-lg border border-border bg-background p-3 text-xs overflow-auto max-h-96">
                            {JSON.stringify(trace.steps, null, 2)}
                          </pre>
                        </div>
                      ))
                    )}
                  </div>
                </Accordion.Body>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </div>
      )}

      {isPlainScrape && (
        <div className="rounded-xl border border-border bg-surface px-6">
          <Accordion defaultExpandedKeys={[]} hideSeparator>
            <Accordion.Item id="scraped-pages">
              <Accordion.Heading>
                <Accordion.Trigger className="text-sm font-medium text-foreground">
                  Scraped pages ({pages.length})
                  <Accordion.Indicator />
                </Accordion.Trigger>
              </Accordion.Heading>
              <Accordion.Panel>
                <Accordion.Body>
                  <div className="flex flex-col gap-4 pb-4">
                    {pages.length === 0 ? (
                      <p className="text-sm text-muted">No pages recorded yet.</p>
                    ) : (
                      pages.map((page) => (
                        <div
                          key={page.id}
                          className="flex flex-col gap-2 rounded-lg border border-border p-3"
                        >
                          <div className="flex items-center gap-2 text-sm flex-wrap">
                            <span className={page.success ? "text-success" : "text-danger"}>
                              {page.success ? "Success" : "Failed"}
                            </span>
                            <span className="text-foreground truncate" title={page.requested_url}>
                              {page.requested_url}
                            </span>
                            {page.http_status !== null && (
                              <span className="text-muted">HTTP {page.http_status}</span>
                            )}
                          </div>
                          {page.title && (
                            <span className="text-sm text-muted">{page.title}</span>
                          )}
                          {page.error_message && (
                            <span className="text-xs text-danger">{page.error_message}</span>
                          )}
                          {page.cleaned_content && (
                            <Accordion defaultExpandedKeys={[]} hideSeparator>
                              <Accordion.Item id={`cleaned-${page.id}`}>
                                <Accordion.Heading>
                                  <Accordion.Trigger className="text-xs font-medium text-foreground">
                                    Cleaned content
                                    <Accordion.Indicator />
                                  </Accordion.Trigger>
                                </Accordion.Heading>
                                <Accordion.Panel>
                                  <Accordion.Body>
                                    <pre className="rounded-lg border border-border bg-background p-3 text-xs overflow-auto max-h-80 whitespace-pre-wrap">
                                      {page.cleaned_content}
                                    </pre>
                                  </Accordion.Body>
                                </Accordion.Panel>
                              </Accordion.Item>
                            </Accordion>
                          )}
                          {page.raw_html && (
                            <Accordion defaultExpandedKeys={[]} hideSeparator>
                              <Accordion.Item id={`raw-${page.id}`}>
                                <Accordion.Heading>
                                  <Accordion.Trigger className="text-xs font-medium text-foreground">
                                    Raw HTML
                                    <Accordion.Indicator />
                                  </Accordion.Trigger>
                                </Accordion.Heading>
                                <Accordion.Panel>
                                  <Accordion.Body>
                                    <pre className="rounded-lg border border-border bg-background p-3 text-xs overflow-auto max-h-80 whitespace-pre-wrap">
                                      {page.raw_html}
                                    </pre>
                                  </Accordion.Body>
                                </Accordion.Panel>
                              </Accordion.Item>
                            </Accordion>
                          )}
                          {page.extraction_result && (
                            <div className="flex flex-col gap-1 text-xs text-muted">
                              <span>
                                Structured: {page.extraction_result.structured_status ?? "—"} · Markdown:{" "}
                                {page.extraction_result.markdown_status ?? "—"}
                              </span>
                              {page.extraction_result.structured_data && (
                                <pre className="rounded-lg border border-border bg-background p-3 text-xs overflow-auto max-h-60">
                                  {JSON.stringify(page.extraction_result.structured_data, null, 2)}
                                </pre>
                              )}
                              {page.extraction_result.markdown && (
                                <pre className="rounded-lg border border-border bg-background p-3 text-xs overflow-auto max-h-60 whitespace-pre-wrap">
                                  {page.extraction_result.markdown}
                                </pre>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </Accordion.Body>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </div>
      )}

      {isBrowserAgent && (
        <div className="rounded-xl border border-border bg-surface px-6">
          <Accordion defaultExpandedKeys={[]} hideSeparator>
            <Accordion.Item id="visited-urls">
              <Accordion.Heading>
                <Accordion.Trigger className="text-sm font-medium text-foreground">
                  Visited URLs ({run.visited_urls?.length ?? 0})
                  <Accordion.Indicator />
                </Accordion.Trigger>
              </Accordion.Heading>
              <Accordion.Panel>
                <Accordion.Body>
                  <div className="flex flex-col gap-1 pb-4">
                    {!run.visited_urls || run.visited_urls.length === 0 ? (
                      <p className="text-sm text-muted">No URLs visited yet.</p>
                    ) : (
                      run.visited_urls.map((visitedUrl, index) => (
                        <span
                          key={`${visitedUrl}-${index}`}
                          className="text-sm text-foreground truncate"
                          title={visitedUrl}
                        >
                          {index + 1}. {visitedUrl}
                        </span>
                      ))
                    )}
                  </div>
                </Accordion.Body>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </div>
      )}

      {isBrowserAgent && run.capture_api && (
        <div className="rounded-xl border border-border bg-surface px-6">
          <Accordion defaultExpandedKeys={[]} hideSeparator>
            <Accordion.Item id="captured-api-traffic">
              <Accordion.Heading>
                <Accordion.Trigger className="text-sm font-medium text-foreground">
                  Captured API traffic ({run.captured_requests?.length ?? 0})
                  <Accordion.Indicator />
                </Accordion.Trigger>
              </Accordion.Heading>
              <Accordion.Panel>
                <Accordion.Body>
                  <div className="flex flex-col gap-3 pb-4">
                    {run.openapi_spec_url ? (
                      <a
                        href={run.openapi_spec_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-sm text-accent hover:underline self-start"
                      >
                        <Download className="h-4 w-4" />
                        Download OpenAPI spec
                      </a>
                    ) : (
                      <p className="text-sm text-muted">
                        {isActive
                          ? "The OpenAPI spec is generated once the run finishes."
                          : "No OpenAPI spec was generated for this run."}
                      </p>
                    )}
                    {!run.captured_requests || run.captured_requests.length === 0 ? (
                      <p className="text-sm text-muted">No requests captured yet.</p>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {run.captured_requests.map((entry) => (
                          <span
                            key={entry.id}
                            className="text-sm text-foreground truncate font-mono"
                            title={entry.request.path}
                          >
                            {entry.request.method} {entry.request.path}
                            {entry.response ? ` — ${entry.response.status}` : entry.failed ? " — failed" : ""}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Accordion.Body>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface px-6">
        <Accordion defaultExpandedKeys={[]} hideSeparator>
          <Accordion.Item id="linked-jobs">
            <Accordion.Heading>
              <Accordion.Trigger className="text-sm font-medium text-foreground">
                Linked jobs ({jobLogs.length})
                <Accordion.Indicator />
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body>
                <div className="pb-4">
                  {jobLogs.length === 0 ? (
                    <p className="text-sm text-muted">No linked job logs.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {jobLogs.map((job) => (
                        <button
                          key={job.id}
                          onClick={() => navigate(Routes.jobs.detail(job.id))}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-left hover:border-accent/50 transition-colors"
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm text-foreground">
                              {job.job_name ?? job.queue_name}
                            </span>
                            <span className="text-xs text-muted">
                              attempt {job.attempt}
                              {job.max_attempts !== null ? ` / ${job.max_attempts}` : ""}
                              {job.duration_ms !== null
                                ? ` · ${formatDuration(job.duration_ms)}`
                                : ""}
                            </span>
                          </div>
                          <JobStatusChip status={job.status as JobStatus} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </div>

      {isBrowserAgent && (
        <div className="rounded-xl border border-border bg-surface px-6">
          <Accordion defaultExpandedKeys={[]} hideSeparator>
            <Accordion.Item id="session-replay">
              <Accordion.Heading>
                <Accordion.Trigger className="text-sm font-medium text-foreground">
                  Session replay ({steps.length})
                  <Accordion.Indicator />
                </Accordion.Trigger>
              </Accordion.Heading>
              <Accordion.Panel>
                <Accordion.Body>
                  <div className="pb-4">
                    <ComputerUseSessionReplay
                      embedded
                      steps={steps}
                      isActive={isActive}
                      emptyActiveMessage="Waiting for the first agent step..."
                      emptyIdleMessage="No agent steps were recorded for this run."
                    />
                  </div>
                </Accordion.Body>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </div>
      )}
    </div>
  );
}
