import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Accordion, useOverlayState } from "@heroui/react";
import { Routes } from "@/routes/routes";
import { DetailSkeleton } from "@/components/ui/detail-skeleton";
import { ActionButtonWithPending } from "@/components/ui/action-button-with-pending";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { ComputerUseSessionReplay } from "@/components/ui/computer-use-session-replay";
import { CrawlRunStatusChip } from "./components/crawl-run-status-chip";
import { CrawlRunOverview } from "./components/crawl-run-overview";
import { WorkflowTypeChip } from "./components/workflow-type-chip";
import {
  useCancelCrawlRun,
  useCrawlRun,
  useDeleteCrawlRun,
  useRerunCrawlRun,
} from "@/features/crawl-runs/hooks/use-crawl-runs";
import {
  CrawlRunStatuses,
  WorkflowTypes,
  type CrawlRunStatus,
} from "@/features/crawl-runs/interfaces/crawl-runs.interfaces";
import { JobStatusChip } from "./components/job-status-chip";
import type { JobStatus } from "@/features/jobs/interfaces/jobs.interfaces";
import { RoleTypes } from "@/features/user/interfaces/user.interface";
import { useAuthStore } from "@/stores/auth";
import { formatDateTime } from "@/lib/date";
import { formatDuration } from "@/lib/duration";


const ACTIVE_STATUSES: CrawlRunStatus[] = [
  CrawlRunStatuses.QUEUED,
  CrawlRunStatuses.RUNNING,
];

export default function CrawlRunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const stopConfirm = useOverlayState();
  const deleteConfirm = useOverlayState();
  const { role } = useAuthStore();
  const canViewDiagnostics =
    role === RoleTypes.ADMIN ||
    role === RoleTypes.SUPER_ADMIN ||
    role === RoleTypes.SUPPORT;

  const { data: run, isPending } = useCrawlRun(id!);
  const rerun = useRerunCrawlRun();
  const cancelRun = useCancelCrawlRun();
  const deleteRun = useDeleteCrawlRun();

  if (isPending || !run) {
    return <DetailSkeleton fieldCount={6} showSubTable subTableRows={3} />;
  }

  const isActive = ACTIVE_STATUSES.includes(run.status);
  const traces = run.execution_traces ?? [];
  const jobLogs = run.job_logs ?? [];
  const pages = run.pages ?? [];
  const steps = run.steps ?? [];
  const extractionResult = run.extraction_result ?? null;
  const isScraper = run.type === WorkflowTypes.SCRAPER;
  const isPlainScrape = run.type === WorkflowTypes.PLAIN_SCRAPE;
  const isBrowserAgent = run.type === WorkflowTypes.BROWSER_AGENT;
  const targetLabel =
    run.website_target?.name ?? run.url ?? run.urls?.[0] ?? run.workflow_config?.name ?? "Crawl run";

  return (
    <div className="flex flex-col gap-6">
      <button
        onClick={() => navigate(Routes.crawlRuns.list)}
        className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to crawl runs
      </button>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-2xl font-semibold tracking-tight text-foreground">{targetLabel}</p>
          <WorkflowTypeChip type={run.type} />
          <CrawlRunStatusChip status={run.status} />
          {isActive && <Loader2 className="h-4 w-4 animate-spin text-muted" />}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isActive ? (
            <ActionButtonWithPending
              variant="secondary"
              isPending={cancelRun.isPending}
              isDisabled={cancelRun.isPending}
              onPress={stopConfirm.open}
            >
              Stop
            </ActionButtonWithPending>
          ) : (
            <ActionButtonWithPending
              variant="secondary"
              isPending={rerun.isPending}
              isDisabled={rerun.isPending}
              onPress={() =>
                rerun.mutate(run.id, {
                  onSuccess: (newRun) => navigate(Routes.crawlRuns.detail(newRun.id)),
                })
              }
            >
              Rerun
            </ActionButtonWithPending>
          )}
          <ActionButtonWithPending
            variant="danger"
            isPending={deleteRun.isPending}
            isDisabled={deleteRun.isPending}
            onPress={deleteConfirm.open}
          >
            Delete
          </ActionButtonWithPending>
        </div>
      </div>

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

      <CrawlRunOverview run={run} />

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
                    {canViewDiagnostics && run.diagnostics_package ? (
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

      {isBrowserAgent && (
        <ComputerUseSessionReplay
          steps={steps}
          isActive={isActive}
          emptyActiveMessage="Waiting for the first agent step..."
          emptyIdleMessage="No agent steps were recorded for this run."
        />
      )}

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

      {extractionResult && (
        <div className="rounded-xl border border-border bg-surface px-6">
          <Accordion defaultExpandedKeys={[]} hideSeparator>
            <Accordion.Item id="extraction-result">
              <Accordion.Heading>
                <Accordion.Trigger className="text-sm font-medium text-foreground">
                  Extraction result
                  <Accordion.Indicator />
                </Accordion.Trigger>
              </Accordion.Heading>
              <Accordion.Panel>
                <Accordion.Body>
                  <div className="flex flex-col gap-3 pb-4">
                    <span className="text-xs text-muted">
                      Structured: {extractionResult.structured_status ?? "—"} · Markdown:{" "}
                      {extractionResult.markdown_status ?? "—"}
                    </span>
                    {extractionResult.structured_data && (
                      <pre className="rounded-lg border border-border bg-background p-3 text-xs overflow-auto max-h-96">
                        {JSON.stringify(extractionResult.structured_data, null, 2)}
                      </pre>
                    )}
                    {Boolean(extractionResult.structured_validation_errors) && (
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-danger">Validation errors</span>
                        <pre className="rounded-lg border border-danger/30 bg-background p-3 text-xs overflow-auto max-h-60 text-danger">
                          {JSON.stringify(extractionResult.structured_validation_errors, null, 2)}
                        </pre>
                      </div>
                    )}
                    {Boolean(extractionResult.structured_raw_ai_output) && (
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-muted">Raw AI output</span>
                        <pre className="rounded-lg border border-border bg-background p-3 text-xs overflow-auto max-h-60">
                          {JSON.stringify(extractionResult.structured_raw_ai_output, null, 2)}
                        </pre>
                      </div>
                    )}
                    {extractionResult.markdown && (
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-muted">Markdown</span>
                        <pre className="rounded-lg border border-border bg-background p-3 text-xs overflow-auto max-h-96 whitespace-pre-wrap">
                          {extractionResult.markdown}
                        </pre>
                      </div>
                    )}
                    {extractionResult.ai_usage && (
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-muted">AI usage</span>
                        <pre className="rounded-lg border border-border bg-background p-3 text-xs overflow-auto max-h-40">
                          {JSON.stringify(extractionResult.ai_usage, null, 2)}
                        </pre>
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
                          onClick={() => navigate(Routes.admin.jobs.detail(job.id))}
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

      <ConfirmationDialog
        state={stopConfirm}
        title="Stop this crawl run?"
        description="The run will be marked cancelled and removed from the queue if possible. An already-running worker may still finish its current scrape work."
        confirmLabel="Stop crawl"
        isPending={cancelRun.isPending}
        onConfirm={async () => {
          await cancelRun.mutateAsync(run.id);
        }}
      />

      <ConfirmationDialog
        state={deleteConfirm}
        title="Delete this crawl run?"
        description="This will permanently delete the crawl run and its execution traces. This cannot be undone."
        confirmLabel="Delete"
        isPending={deleteRun.isPending}
        onConfirm={async () => {
          await deleteRun.mutateAsync(run.id);
          navigate(Routes.crawlRuns.list);
        }}
      />
    </div>
  );
}
