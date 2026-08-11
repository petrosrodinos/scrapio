import { useNavigate, useParams } from "react-router-dom";
import { Table, useOverlayState } from "@heroui/react";
import { ArrowLeft, Play, Trash2 } from "lucide-react";
import { Routes } from "@/routes/routes";
import { DetailSkeleton } from "@/components/ui/detail-skeleton";
import { ActionButtonWithPending } from "@/components/ui/action-button-with-pending";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { formatDateTime } from "@/lib/date";
import { CrawlRunStatusChip } from "@/pages/admin/website-targets/components/crawl-run-status-chip";
import { useCrawlRuns } from "@/features/crawl-runs/hooks/use-crawl-runs";
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

  const { data: config, isPending } = useBrowserAgentConfig(id!);
  const { data: runsData } = useCrawlRuns({ workflow_config_id: id!, limit: 10 });
  const updateConfig = useUpdateBrowserAgentConfig();
  const deleteConfig = useDeleteBrowserAgentConfig();
  const runNow = useRunBrowserAgentConfigNow();

  const runs = runsData?.data ?? [];

  if (isPending || !config) {
    return <DetailSkeleton />;
  }

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
        <div className="flex gap-2">
          <ActionButtonWithPending
            variant="secondary"
            idleLeading={<Play className="h-4 w-4" />}
            isPending={runNow.isPending}
            onPress={() => runNow.mutate(config.id)}
          >
            Run now
          </ActionButtonWithPending>
          <ActionButtonWithPending
            variant="danger"
            idleLeading={<Trash2 className="h-4 w-4" />}
            onPress={deleteConfirm.open}
          >
            Delete
          </ActionButtonWithPending>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <BrowserAgentForm
          submitLabel="Save changes"
          isPending={updateConfig.isPending}
          defaultValues={browserAgentConfigToFormValues(config)}
          onSubmit={(values) => {
            updateConfig.mutate({ id: config.id, payload: browserAgentFormValuesToPayload(values) });
          }}
        />
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-lg font-semibold text-foreground">Recent runs</p>
        {runs.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted">
            No runs yet.
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <Table>
              <Table.ScrollContainer>
                <Table.Content aria-label="Recent runs">
                  <Table.Header>
                    <Table.Column isRowHeader>Status</Table.Column>
                    <Table.Column>Started</Table.Column>
                    <Table.Column>Duration</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {runs.map((run) => (
                      <Table.Row
                        key={run.id}
                        id={run.id}
                        onAction={() => navigate(Routes.crawlRuns.detail(run.id))}
                        className="cursor-pointer"
                      >
                        <Table.Cell>
                          <CrawlRunStatusChip status={run.status} />
                        </Table.Cell>
                        <Table.Cell>{formatDateTime(run.started_at)}</Table.Cell>
                        <Table.Cell>
                          {run.duration_ms ? `${(run.duration_ms / 1000).toFixed(1)}s` : "—"}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          </div>
        )}
      </div>

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
