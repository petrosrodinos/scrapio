import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useOverlayState } from "@heroui/react";
import { ArrowLeft, Pencil, Play, Trash2 } from "lucide-react";
import { Routes } from "@/routes/routes";
import { DetailSkeleton } from "@/components/ui/detail-skeleton";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { TableRowActionsMenu, type TableRowAction } from "@/components/ui/table-row-actions-menu";
import { LatestCrawlRun } from "@/pages/admin/crawl-runs/components/latest-crawl-run";
import { RecentCrawlRuns } from "@/pages/admin/crawl-runs/components/recent-crawl-runs";
import { BrowserAgentForm } from "./components/browser-agent-form";
import {
  useBrowserAgentConfig,
  useUpdateBrowserAgentConfig,
  useDeleteBrowserAgentConfig,
  useRunBrowserAgentConfigNow,
} from "@/features/browser-agent/hooks/use-browser-agent";
import {
  browserAgentConfigToFormValues,
  browserAgentFormValuesToPayload,
} from "@/features/browser-agent/validation-schemas/browser-agent.schema";

export default function BrowserAgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const deleteConfirm = useOverlayState();
  const [isEditing, setIsEditing] = useState(false);

  const { data: config, isPending } = useBrowserAgentConfig(id!);
  const updateConfig = useUpdateBrowserAgentConfig();
  const deleteConfig = useDeleteBrowserAgentConfig();
  const runNow = useRunBrowserAgentConfigNow();

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
            onClick={() => navigate(Routes.browserAgent.list)}
            className="flex items-center gap-1 text-sm text-muted hover:text-foreground w-fit"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Browser agents
          </button>
          <p className="text-2xl font-semibold tracking-tight text-foreground">{config.name}</p>
        </div>
        <TableRowActionsMenu
          triggerLabel="Actions"
          actions={actions}
          onAction={handleAction}
          ariaLabel="Browser agent actions"
        />
      </div>

      {isEditing ? (
        <div className="rounded-xl border border-border bg-surface p-5">
          <BrowserAgentForm
            submitLabel="Save changes"
            isPending={updateConfig.isPending}
            defaultValues={browserAgentConfigToFormValues(config)}
            onCancel={() => setIsEditing(false)}
            onSubmit={(values) => {
              updateConfig.mutate(
                { id: config.id, payload: browserAgentFormValuesToPayload(values) },
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
        title="Delete this browser agent config?"
        description="This cannot be undone."
        confirmLabel="Delete"
        isPending={deleteConfig.isPending}
        onConfirm={() => {
          deleteConfig.mutate(config.id, {
            onSuccess: () => navigate(Routes.browserAgent.list),
          });
        }}
      />
    </div>
  );
}
