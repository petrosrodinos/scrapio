import { useNavigate, useParams } from "react-router-dom";
import { Modal, EmptyState, useOverlayState } from "@heroui/react";
import { ArrowLeft, Wrench, Activity } from "lucide-react";
import { Routes } from "@/routes/routes";
import { DetailSkeleton } from "@/components/ui/detail-skeleton";
import { ActionButtonWithPending } from "@/components/ui/action-button-with-pending";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { getCrawlIntervalPresetLabel } from "@/config/constants/dropdowns/website-targets/crawl-interval-preset.options";
import { WebsiteTargetForm } from "./components/website-target-form";
import { WebsiteTargetCrawlIntervalPanel } from "./components/website-target-crawl-interval-panel";
import {
  useWebsiteTarget,
  useDeleteWebsiteTarget,
  useUpdateWebsiteTarget,
} from "@/features/website-targets/hooks/use-website-targets";
import { toWebsiteTargetBlockHandlingPayload } from "@/features/website-targets/validation-schemas/website-targets.schema";
import { CrawlRunStatusChip } from "./components/crawl-run-status-chip";
import { ScraperStatusChip } from "./components/scraper-status-chip";
import { useCrawlRuns } from "@/features/crawl-runs/hooks/use-crawl-runs";
import { useScrapers } from "@/features/scrapers/hooks/use-scrapers";
import { formatDateTime } from "@/lib/date";

export default function WebsiteTargetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const editModal = useOverlayState();
  const deleteConfirm = useOverlayState();

  const { data: websiteTarget, isPending } = useWebsiteTarget(id!);
  const { data: crawlRunsData } = useCrawlRuns({ website_target_id: id!, limit: 5 });
  const { data: scrapersData } = useScrapers({ website_target_id: id!, limit: 5 });
  const updateWebsiteTarget = useUpdateWebsiteTarget();
  const deleteWebsiteTarget = useDeleteWebsiteTarget();

  const crawlRuns = crawlRunsData?.data ?? [];
  const scrapers = scrapersData?.data ?? [];

  if (isPending || !websiteTarget) {
    return <DetailSkeleton fieldCount={6} showSubTable />;
  }

  const dependentCount =
    (websiteTarget._count?.scrapers ?? 0) + (websiteTarget._count?.crawl_runs ?? 0);
  const canDelete = dependentCount === 0;

  return (
    <div className="flex flex-col gap-6">
      <button
        onClick={() => navigate(Routes.websiteTargets.list)}
        className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to website targets
      </button>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-2xl font-semibold tracking-tight text-foreground">
            {websiteTarget.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ActionButtonWithPending variant="secondary" onPress={editModal.open}>
            Edit
          </ActionButtonWithPending>
          <div className="flex flex-col items-end gap-1">
            <ActionButtonWithPending
              variant="danger"
              isDisabled={!canDelete}
              onPress={deleteConfirm.open}
            >
              Delete
            </ActionButtonWithPending>
            {!canDelete && (
              <span className="text-xs text-muted">
                Has {dependentCount} dependent record{dependentCount === 1 ? "" : "s"} — remove
                them before deleting
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 rounded-xl border border-border bg-surface p-6">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">Website</span>
          <a
            href={websiteTarget.base_url}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-accent hover:underline truncate"
          >
            {websiteTarget.base_url}
          </a>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">Last success</span>
          <span className="text-sm text-foreground">
            {formatDateTime(websiteTarget.last_success_at)}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">Last failure</span>
          <span className="text-sm text-foreground">
            {formatDateTime(websiteTarget.last_failure_at)}
          </span>
          {websiteTarget.last_error_message && (
            <span className="text-xs text-danger">{websiteTarget.last_error_message}</span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">Crawl interval</span>
          <span className="text-sm text-foreground">
            {getCrawlIntervalPresetLabel(websiteTarget.crawl_interval)}
          </span>
          <span className="font-mono text-xs text-muted">{websiteTarget.crawl_interval}</span>
        </div>
        {websiteTarget.notes && (
          <div className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">Notes</span>
            <span className="text-sm text-foreground">{websiteTarget.notes}</span>
          </div>
        )}
      </div>

      <WebsiteTargetCrawlIntervalPanel
        crawlInterval={websiteTarget.crawl_interval}
        isPending={updateWebsiteTarget.isPending}
        onSave={(crawl_interval) =>
          updateWebsiteTarget.mutate({ id: websiteTarget.id, payload: { crawl_interval } })
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-6">
          <p className="mb-3 text-sm font-medium text-foreground">Scrapers</p>
          {scrapers.length === 0 ? (
            <EmptyState>
              <Wrench className="h-6 w-6 text-muted" />
              <p className="text-sm text-muted mt-2">No scrapers for this website target</p>
            </EmptyState>
          ) : (
            <div className="flex flex-col gap-2">
              {scrapers.map((scraper) => (
                <button
                  key={scraper.id}
                  onClick={() => navigate(Routes.scrapers.detail(scraper.id))}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-left hover:border-accent/50 transition-colors"
                >
                  <span className="text-xs text-muted truncate">{scraper.name}</span>
                  <ScraperStatusChip status={scraper.status} />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-xl border border-border bg-surface p-6">
          <p className="mb-3 text-sm font-medium text-foreground">Recent crawl runs</p>
          {crawlRuns.length === 0 ? (
            <EmptyState>
              <Activity className="h-6 w-6 text-muted" />
              <p className="text-sm text-muted mt-2">No crawl runs yet for this website target</p>
            </EmptyState>
          ) : (
            <div className="flex flex-col gap-2">
              {crawlRuns.map((run) => (
                <button
                  key={run.id}
                  onClick={() => navigate(Routes.crawlRuns.detail(run.id))}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-left hover:border-accent/50 transition-colors"
                >
                  <span className="text-xs text-muted truncate">
                    {run.scraper?.name ?? formatDateTime(run.created_at)}
                  </span>
                  <CrawlRunStatusChip status={run.status} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal state={editModal}>
        <Modal.Backdrop isDismissable={!updateWebsiteTarget.isPending}>
          <Modal.Container size="lg">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Edit website target</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="max-h-[70vh] overflow-y-auto">
                <WebsiteTargetForm
                  submitLabel="Save"
                  isPending={updateWebsiteTarget.isPending}
                  onCancel={editModal.close}
                  defaultValues={{
                    name: websiteTarget.name,
                    base_url: websiteTarget.base_url,
                    notes: websiteTarget.notes ?? "",
                    crawl_interval: websiteTarget.crawl_interval,
                    block_handling_wait_timeout_ms:
                      websiteTarget.block_handling_wait_timeout_ms ?? undefined,
                    block_handling_min_ready_body_length:
                      websiteTarget.block_handling_min_ready_body_length ?? undefined,
                    block_rules: websiteTarget.block_rules ?? [],
                  }}
                  onSubmit={(values) => {
                    updateWebsiteTarget.mutate(
                      {
                        id: websiteTarget.id,
                        payload: {
                          name: values.name,
                          base_url: values.base_url,
                          notes: values.notes,
                          crawl_interval: values.crawl_interval,
                          ...toWebsiteTargetBlockHandlingPayload(values),
                        },
                      },
                      { onSuccess: () => editModal.close() },
                    );
                  }}
                />
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <ConfirmationDialog
        state={deleteConfirm}
        title="Delete this website target?"
        description="This cannot be undone."
        confirmLabel="Delete"
        isPending={deleteWebsiteTarget.isPending}
        onConfirm={() =>
          deleteWebsiteTarget.mutate(websiteTarget.id, {
            onSuccess: () => navigate(Routes.websiteTargets.list),
          })
        }
      />
    </div>
  );
}
