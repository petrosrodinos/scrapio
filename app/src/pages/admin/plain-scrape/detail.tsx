import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useOverlayState } from "@heroui/react";
import { ArrowLeft, ExternalLink, Pencil, Play, Trash2 } from "lucide-react";
import { Routes } from "@/routes/routes";
import { DetailSkeleton } from "@/components/ui/detail-skeleton";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { TableRowActionsMenu, type TableRowAction } from "@/components/ui/table-row-actions-menu";
import { LatestCrawlRun } from "@/pages/admin/crawl-runs/components/latest-crawl-run";
import { RecentCrawlRuns } from "@/pages/admin/crawl-runs/components/recent-crawl-runs";
import { useCrawlRuns } from "@/features/crawl-runs/hooks/use-crawl-runs";
import { PlainScrapeForm } from "./components/plain-scrape-form";
import {
  usePlainScrapeConfig,
  useUpdatePlainScrapeConfig,
  useDeletePlainScrapeConfig,
  useRunPlainScrapeConfigNow,
} from "@/features/plain-scrape/hooks/use-plain-scrape";
import {
  plainScrapeConfigToFormValues,
  plainScrapeFormValuesToPayload,
} from "@/features/plain-scrape/validation-schemas/plain-scrape.schema";

export default function PlainScrapeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const deleteConfirm = useOverlayState();
  const [isEditing, setIsEditing] = useState(false);

  const { data: config, isPending } = usePlainScrapeConfig(id!);
  const { data: runsData } = useCrawlRuns({ workflow_config_id: id!, limit: 10 });
  const updateConfig = useUpdatePlainScrapeConfig();
  const deleteConfig = useDeletePlainScrapeConfig();
  const runNow = useRunPlainScrapeConfigNow();
  const latestRunId = runsData?.data[0]?.id;

  if (isPending || !config) {
    return <DetailSkeleton />;
  }

  const actions: TableRowAction[] = [
    ...(!isEditing
      ? [{ id: "edit", label: "Edit", icon: Pencil } satisfies TableRowAction]
      : []),
    {
      id: "run-now",
      label: "Run now",
      icon: Play,
      isDisabled: runNow.isPending,
    },
    {
      id: "view-run",
      label: "View run",
      icon: ExternalLink,
      isDisabled: !latestRunId,
    },
    {
      id: "delete",
      label: "Delete",
      variant: "danger",
      icon: Trash2,
    },
  ];

  const handleAction = (actionId: string) => {
    switch (actionId) {
      case "edit":
        setIsEditing(true);
        return;
      case "run-now":
        runNow.mutate(config.id, {
          onSuccess: (run) => navigate(Routes.crawlRuns.detail(run.id)),
        });
        return;
      case "view-run":
        if (latestRunId) navigate(Routes.crawlRuns.detail(latestRunId));
        return;
      case "delete":
        deleteConfirm.open();
        return;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <button
            onClick={() => navigate(Routes.plainScrape.list)}
            className="flex items-center gap-1 text-sm text-muted hover:text-foreground w-fit"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Plain scrapes
          </button>
          <p className="text-2xl font-semibold tracking-tight text-foreground">{config.name}</p>
        </div>
        <TableRowActionsMenu
          triggerLabel="Actions"
          actions={actions}
          onAction={handleAction}
          ariaLabel="Plain scrape actions"
        />
      </div>

      {isEditing ? (
        <div className="rounded-xl border border-border bg-surface p-5">
          <PlainScrapeForm
            submitLabel="Save changes"
            isPending={updateConfig.isPending}
            defaultValues={plainScrapeConfigToFormValues(config)}
            onCancel={() => setIsEditing(false)}
            onSubmit={(values) => {
              updateConfig.mutate(
                { id: config.id, payload: plainScrapeFormValuesToPayload(values) },
                { onSuccess: () => setIsEditing(false) },
              );
            }}
          />
        </div>
      ) : null}

      <LatestCrawlRun workflowConfigId={config.id} />
      <RecentCrawlRuns workflowConfigId={config.id} />

      <ConfirmationDialog
        state={deleteConfirm}
        title="Delete this plain scrape config?"
        description="This cannot be undone."
        confirmLabel="Delete"
        isPending={deleteConfig.isPending}
        onConfirm={() => {
          deleteConfig.mutate(config.id, {
            onSuccess: () => navigate(Routes.plainScrape.list),
          });
        }}
      />
    </div>
  );
}
