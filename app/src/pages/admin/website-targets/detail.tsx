import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Modal,
  EmptyState,
  Table,
  useOverlayState,
} from "@heroui/react";
import { ArrowLeft, Wrench, Activity, Plus, Trash2 } from "lucide-react";
import { Routes } from "@/routes/routes";
import { DetailSkeleton } from "@/components/ui/detail-skeleton";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { ActionButtonWithPending } from "@/components/ui/action-button-with-pending";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  TableRowActionsMenu,
  type TableRowAction,
} from "@/components/ui/table-row-actions-menu";
import { WebsiteTargetForm } from "./components/website-target-form";
import { ScraperForm } from "@/pages/admin/scrapers/components/scraper-form";
import { ScraperStatusChip } from "@/pages/admin/scrapers/components/scraper-status-chip";
import { ScraperHealthChip } from "@/pages/admin/scrapers/components/scraper-health-chip";
import {
  useWebsiteTarget,
  useDeleteWebsiteTarget,
  useUpdateWebsiteTarget,
} from "@/features/website-targets/hooks/use-website-targets";
import { toWebsiteTargetBlockHandlingPayload } from "@/features/website-targets/validation-schemas/website-targets.schema";
import { CrawlRunStatusChip } from "./components/crawl-run-status-chip";
import { useCrawlRuns } from "@/features/crawl-runs/hooks/use-crawl-runs";
import {
  useCreateScraper,
  useDeleteScraper,
  useScrapers,
} from "@/features/scrapers/hooks/use-scrapers";
import { formatDate, formatDateTime } from "@/lib/date";

const TargetDetailTabs = {
  TARGET: "target",
  SCRAPERS: "scrapers",
} as const;

type TargetDetailTab = (typeof TargetDetailTabs)[keyof typeof TargetDetailTabs];

const SCRAPER_DELETE_ACTIONS: TableRowAction[] = [
  { id: "delete", label: "Delete", variant: "danger", icon: Trash2 },
];

export default function WebsiteTargetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const editModal = useOverlayState();
  const deleteConfirm = useOverlayState();
  const createScraperModal = useOverlayState();
  const deleteScraperConfirm = useOverlayState();

  const tabParam = searchParams.get("tab");
  const selectedTab: TargetDetailTab =
    tabParam === TargetDetailTabs.SCRAPERS
      ? TargetDetailTabs.SCRAPERS
      : TargetDetailTabs.TARGET;

  const [deleteScraperId, setDeleteScraperId] = useState<string | null>(null);

  const { data: websiteTarget, isPending } = useWebsiteTarget(id!);
  const { data: crawlRunsData } = useCrawlRuns({ website_target_id: id!, limit: 5 });
  const { data: scrapersData, isPending: scrapersPending } = useScrapers({
    website_target_id: id!,
    limit: 100,
  });
  const updateWebsiteTarget = useUpdateWebsiteTarget();
  const deleteWebsiteTarget = useDeleteWebsiteTarget();
  const createScraper = useCreateScraper();
  const deleteScraper = useDeleteScraper();

  const crawlRuns = crawlRunsData?.data ?? [];
  const scrapers = scrapersData?.data ?? [];

  const createScraperRequested = searchParams.get("createScraper") === "1";

  useEffect(() => {
    if (!createScraperRequested) return;
    createScraperModal.open();
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("createScraper");
        next.set("tab", TargetDetailTabs.SCRAPERS);
        return next;
      },
      { replace: true },
    );
  }, [createScraperRequested, createScraperModal.open, setSearchParams]);

  const setTab = (tab: TargetDetailTab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === TargetDetailTabs.TARGET) next.delete("tab");
    else next.set("tab", tab);
    setSearchParams(next, { replace: true });
  };

  if (isPending || !websiteTarget) {
    return <DetailSkeleton fieldCount={6} showSubTable />;
  }

  const dependentCount =
    (websiteTarget._count?.workflow_configs ?? 0) +
    (websiteTarget._count?.workflow_runs ?? 0);
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
        <div className="flex flex-col gap-1">
          <p className="text-2xl font-semibold tracking-tight text-foreground">
            {websiteTarget.name}
          </p>
          <a
            href={websiteTarget.base_url}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-accent hover:underline truncate max-w-xl"
          >
            {websiteTarget.base_url}
          </a>
        </div>
        {selectedTab === TargetDetailTabs.TARGET ? (
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <ActionButtonWithPending variant="secondary" onPress={editModal.open}>
                Edit
              </ActionButtonWithPending>
              <ActionButtonWithPending
                variant="danger"
                isDisabled={!canDelete}
                onPress={deleteConfirm.open}
              >
                Delete
              </ActionButtonWithPending>
            </div>
            {!canDelete && (
              <span className="text-xs text-muted text-right max-w-xs">
                Has {dependentCount} dependent record{dependentCount === 1 ? "" : "s"} — remove them
                before deleting
              </span>
            )}
          </div>
        ) : (
          <ActionButtonWithPending
            onPress={createScraperModal.open}
            idleLeading={<Plus className="h-4 w-4" />}
          >
            New scraper
          </ActionButtonWithPending>
        )}
      </div>

      <div
        role="tablist"
        aria-label="Website target sections"
        className="flex w-fit self-start items-center gap-1 border-b border-border"
      >
        {(
          [
            { id: TargetDetailTabs.TARGET, label: "Target" },
            { id: TargetDetailTabs.SCRAPERS, label: "Scrapers" },
          ] as const
        ).map((tab) => {
          const isSelected = selectedTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setTab(tab.id)}
              className={
                isSelected
                  ? "-mb-px border-b-2 border-foreground px-2.5 pb-2 text-sm font-medium text-foreground"
                  : "-mb-px border-b-2 border-transparent px-2.5 pb-2 text-sm font-medium text-muted hover:text-foreground"
              }
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {selectedTab === TargetDetailTabs.TARGET ? (
        <div className="flex w-full flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 rounded-xl border border-border bg-surface p-6">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted">
                Last success
              </span>
              <span className="text-sm text-foreground">
                {formatDateTime(websiteTarget.last_success_at)}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted">
                Last failure
              </span>
              <span className="text-sm text-foreground">
                {formatDateTime(websiteTarget.last_failure_at)}
              </span>
              {websiteTarget.last_error_message && (
                <span className="text-xs text-danger">{websiteTarget.last_error_message}</span>
              )}
            </div>
            {websiteTarget.notes && (
              <div className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted">Notes</span>
                <span className="text-sm text-foreground">{websiteTarget.notes}</span>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-surface p-6">
            <p className="mb-3 text-sm font-medium text-foreground">Recent crawl runs</p>
            {crawlRuns.length === 0 ? (
              <EmptyState className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                <Activity className="h-6 w-6 text-muted" />
                <p className="text-sm text-muted">No crawl runs yet for this website target</p>
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
                      {run.workflow_config?.name ?? formatDateTime(run.created_at)}
                    </span>
                    <CrawlRunStatusChip status={run.status} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : scrapersPending ? (
        <TableSkeleton rows={6} columns={5} />
      ) : scrapers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface px-6 py-12 text-center">
          <EmptyState className="flex flex-col items-center justify-center gap-2">
            <Wrench className="h-6 w-6 text-muted" />
            <p className="text-sm text-muted">No scrapers for this website target</p>
          </EmptyState>
          <div className="mt-4">
            <ActionButtonWithPending
              onPress={createScraperModal.open}
              idleLeading={<Plus className="h-4 w-4" />}
            >
              New scraper
            </ActionButtonWithPending>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <Table>
            <Table.ScrollContainer>
              <Table.Content aria-label="Scrapers for this website target">
                <Table.Header>
                  <Table.Column isRowHeader>Name</Table.Column>
                  <Table.Column>Status</Table.Column>
                  <Table.Column>Health</Table.Column>
                  <Table.Column>Success rate</Table.Column>
                  <Table.Column>Last success</Table.Column>
                  <Table.Column>Actions</Table.Column>
                </Table.Header>
                <Table.Body>
                  {scrapers.map((scraper) => (
                    <Table.Row
                      key={scraper.id}
                      id={scraper.id}
                      onAction={() => navigate(Routes.scrapers.detail(scraper.id))}
                      className="cursor-pointer"
                    >
                      <Table.Cell>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{scraper.name}</span>
                          <span className="text-xs text-muted">v{scraper.version_count}</span>
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <ScraperStatusChip status={scraper.status} />
                      </Table.Cell>
                      <Table.Cell>
                        <ScraperHealthChip health={scraper.health} />
                      </Table.Cell>
                      <Table.Cell>
                        {scraper.success_rate !== null ? `${scraper.success_rate}%` : "—"}
                      </Table.Cell>
                      <Table.Cell>{formatDate(scraper.last_success_at)}</Table.Cell>
                      <Table.Cell>
                        <TableRowActionsMenu
                          actions={SCRAPER_DELETE_ACTIONS}
                          onAction={(actionId) => {
                            if (actionId !== "delete") return;
                            setDeleteScraperId(scraper.id);
                            deleteScraperConfirm.open();
                          }}
                          ariaLabel={`Actions for scraper ${scraper.name}`}
                        />
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        </div>
      )}

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

      <Modal state={createScraperModal}>
        <Modal.Backdrop isDismissable={!createScraper.isPending}>
          <Modal.Container size="lg">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>New scraper</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="max-h-[70vh] overflow-y-auto">
                <ScraperForm
                  websiteTargetId={websiteTarget.id}
                  websiteTargetName={websiteTarget.name}
                  submitLabel="Create"
                  isPending={createScraper.isPending}
                  onCancel={createScraperModal.close}
                  onSubmit={(values) => {
                    createScraper.mutate(
                      {
                        website_target_id: websiteTarget.id,
                        name: values.name,
                        schedule_cron: values.schedule_cron,
                      },
                      { onSuccess: () => createScraperModal.close() },
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

      <ConfirmationDialog
        state={deleteScraperConfirm}
        title="Delete this scraper?"
        description="This will permanently delete the scraper and its versions. Scrapers with active crawl runs cannot be deleted. This cannot be undone."
        confirmLabel="Delete"
        isPending={deleteScraper.isPending}
        onConfirm={async () => {
          if (!deleteScraperId) return;
          await deleteScraper.mutateAsync(deleteScraperId);
          setDeleteScraperId(null);
        }}
      />
    </div>
  );
}
