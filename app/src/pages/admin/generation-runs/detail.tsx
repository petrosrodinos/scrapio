import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Modal, Label, TextArea, FieldError, useOverlayState } from "@heroui/react";
import { ArrowLeft, Loader2, Pencil, Play, RotateCcw, Trash2 } from "lucide-react";
import { Routes } from "@/routes/routes";
import { DetailSkeleton } from "@/components/ui/detail-skeleton";
import { ActionButtonWithPending } from "@/components/ui/action-button-with-pending";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { ComputerUseSessionReplay } from "@/components/ui/computer-use-session-replay";
import {
  TableRowActionsMenu,
  type TableRowAction,
} from "@/components/ui/table-row-actions-menu";
import { GenerationRunStatusChip } from "./components/generation-run-status-chip";
import { GenerationRunTriggerChip } from "./components/generation-run-trigger-chip";
import { EditGenerationRunForm } from "./components/edit-generation-run-form";
import {
  useApproveGenerationRun,
  useCancelGenerationRun,
  useDeleteGenerationRun,
  useGenerationRun,
  useRejectGenerationRun,
  useRetryGenerationRun,
  useStartGenerationRun,
  useUpdateGenerationRun,
} from "@/features/scraper-generation/hooks/use-scraper-generation";
import {
  GenerationRunStatuses,
  type GenerationRunStatus,
} from "@/features/scraper-generation/interfaces/scraper-generation.interfaces";
import { formatDateTime } from "@/lib/date";
import { formatDuration } from "@/lib/duration";

const ACTIVE_STATUSES: GenerationRunStatus[] = [
  GenerationRunStatuses.QUEUED,
  GenerationRunStatuses.RUNNING,
];

const CONFIG_EDITABLE_STATUSES: GenerationRunStatus[] = [
  GenerationRunStatuses.DRAFT,
  GenerationRunStatuses.FAILED,
  GenerationRunStatuses.CANCELLED,
];

export default function GenerationRunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const rejectModal = useOverlayState();
  const retryModal = useOverlayState();
  const editConfigModal = useOverlayState();
  const editStagedModal = useOverlayState();
  const cancelConfirm = useOverlayState();
  const deleteConfirm = useOverlayState();

  const [rejectReason, setRejectReason] = useState("");
  const [retryError, setRetryError] = useState("");
  const [retryPrompt, setRetryPrompt] = useState("");
  const [stagedConfigJson, setStagedConfigJson] = useState("");
  const [stagedConfigError, setStagedConfigError] = useState<string | null>(null);

  const { data: run, isPending } = useGenerationRun(id!);
  const approveRun = useApproveGenerationRun();
  const rejectRun = useRejectGenerationRun();
  const cancelRun = useCancelGenerationRun();
  const deleteRun = useDeleteGenerationRun();
  const retryRun = useRetryGenerationRun();
  const startRun = useStartGenerationRun();
  const updateRun = useUpdateGenerationRun();

  if (isPending || !run) {
    return <DetailSkeleton fieldCount={4} showSubTable subTableRows={3} />;
  }

  const isActive = ACTIVE_STATUSES.includes(run.status);
  const isDraft = run.status === GenerationRunStatuses.DRAFT;
  const canEditConfig = CONFIG_EDITABLE_STATUSES.includes(run.status);
  const canEditStaged = run.status === GenerationRunStatuses.AWAITING_REVIEW;
  const canRetry =
    run.status === GenerationRunStatuses.FAILED ||
    run.status === GenerationRunStatuses.CANCELLED;
  const steps = run.steps ?? [];

  const headerActions: TableRowAction[] = [
    ...(canEditConfig || canEditStaged
      ? [{ id: "edit", label: "Edit", icon: Pencil } satisfies TableRowAction]
      : []),
    ...(isDraft
      ? [
          {
            id: "start",
            label: "Start",
            icon: Play,
            isDisabled: startRun.isPending,
          } satisfies TableRowAction,
        ]
      : []),
    ...(canRetry
      ? [
          {
            id: "retry",
            label: "Retry",
            icon: RotateCcw,
            isDisabled: retryRun.isPending,
          } satisfies TableRowAction,
        ]
      : []),
    {
      id: "delete",
      label: "Delete",
      variant: "danger",
      icon: Trash2,
      isDisabled: deleteRun.isPending,
    },
  ];

  const handleHeaderAction = (actionId: string) => {
    switch (actionId) {
      case "edit":
        if (canEditStaged) {
          setStagedConfigJson(JSON.stringify(run.staged_config ?? {}, null, 2));
          setStagedConfigError(null);
          editStagedModal.open();
          return;
        }
        editConfigModal.open();
        return;
      case "start":
        startRun.mutate(run.id);
        return;
      case "retry":
        setRetryError(run.error_message ?? "");
        setRetryPrompt("");
        retryModal.open();
        return;
      case "delete":
        deleteConfirm.open();
        return;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <button
        onClick={() => navigate(Routes.generationRuns.list)}
        className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to generation runs
      </button>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-2xl font-semibold tracking-tight text-foreground">
            {run.website_target?.name ?? run.website_target_id}
          </p>
          <GenerationRunTriggerChip trigger={run.trigger} />
          <GenerationRunStatusChip status={run.status} />
          {isActive && <Loader2 className="h-4 w-4 animate-spin text-muted" />}
        </div>

        {isActive ? (
          <ActionButtonWithPending
            variant="danger"
            isPending={cancelRun.isPending}
            isDisabled={cancelRun.isPending}
            onPress={cancelConfirm.open}
          >
            Cancel
          </ActionButtonWithPending>
        ) : (
          <TableRowActionsMenu
            actions={headerActions}
            onAction={handleHeaderAction}
            ariaLabel="Generation run actions"
            triggerClassName="bg-surface-secondary hover:bg-surface-secondary/80 border border-border"
          />
        )}
      </div>

      {isDraft && (
        <div className="rounded-xl border border-border bg-surface-secondary/60 p-6 flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-foreground">
            Saved as draft — not running yet. Start when ready.
          </p>
          <ActionButtonWithPending
            isPending={startRun.isPending}
            isDisabled={startRun.isPending}
            onPress={() => startRun.mutate(run.id)}
          >
            Start generation
          </ActionButtonWithPending>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 rounded-xl border border-border bg-surface p-6">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">Scraper</span>
          {run.scraper_id ? (
            <button
              className="text-sm text-accent hover:underline text-left"
              onClick={() => navigate(Routes.scrapers.detail(run.scraper_id!))}
            >
              {run.scraper?.name ?? run.scraper_id}
            </button>
          ) : (
            <span className="text-sm text-foreground">New scraper (none yet)</span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">
            Created / finished
          </span>
          <span className="text-sm text-foreground">
            {formatDateTime(run.created_at)} / {formatDateTime(run.finished_at)}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">Duration</span>
          <span className="text-sm text-foreground">{formatDuration(run.duration_ms)}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">Steps</span>
          <span
            className={
              run.max_steps != null && steps.length > run.max_steps
                ? "text-sm text-danger"
                : "text-sm text-foreground"
            }
          >
            {run.max_steps == null
              ? `${steps.length} used / unlimited`
              : `${steps.length} used / ${run.max_steps} max`}
          </span>
        </div>
        {run.prompt && (
          <div className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">Prompt</span>
            <span className="text-sm text-foreground">{run.prompt}</span>
          </div>
        )}
      </div>

      {run.status === GenerationRunStatuses.SUCCESS && run.scraper_id && (
        <div className="rounded-xl border border-success/30 bg-success/10 p-6 flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-foreground">Approved — a new scraper version is now active.</p>
          <ActionButtonWithPending
            variant="secondary"
            onPress={() => navigate(Routes.scrapers.detail(run.scraper_id!))}
          >
            View scraper
          </ActionButtonWithPending>
        </div>
      )}

      {(run.status === GenerationRunStatuses.FAILED ||
        run.status === GenerationRunStatuses.CANCELLED) && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 p-6">
          <p className="text-sm font-medium text-foreground mb-1">
            {run.status === GenerationRunStatuses.FAILED
              ? "Generation failed"
              : "Generation cancelled"}
          </p>
          {run.error_message && <p className="text-sm text-danger">{run.error_message}</p>}
        </div>
      )}

      {run.status === GenerationRunStatuses.AWAITING_REVIEW && (
        <div className="rounded-xl border border-warning/30 bg-warning/10 p-6 flex flex-col gap-4">
          <p className="text-sm font-medium text-foreground">Staged config — review before approving</p>
          <pre className="rounded-lg border border-border bg-background p-3 text-xs overflow-auto max-h-96">
            {JSON.stringify(run.staged_config, null, 2)}
          </pre>
          <div className="flex justify-end gap-2">
            <ActionButtonWithPending
              variant="secondary"
              onPress={() => {
                setStagedConfigJson(JSON.stringify(run.staged_config ?? {}, null, 2));
                setStagedConfigError(null);
                editStagedModal.open();
              }}
            >
              Edit staged config
            </ActionButtonWithPending>
            <ActionButtonWithPending variant="secondary" onPress={rejectModal.open}>
              Reject
            </ActionButtonWithPending>
            <ActionButtonWithPending
              isPending={approveRun.isPending}
              isDisabled={approveRun.isPending}
              onPress={() => approveRun.mutate(run.id)}
            >
              Approve
            </ActionButtonWithPending>
          </div>
        </div>
      )}

      <ComputerUseSessionReplay steps={steps} isActive={isActive} />

      <Modal state={editConfigModal}>
        <Modal.Backdrop isDismissable={!updateRun.isPending}>
          <Modal.Container size="lg">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Edit generation run</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <EditGenerationRunForm
                  run={run}
                  isPending={updateRun.isPending}
                  onCancel={editConfigModal.close}
                  onSubmit={(payload) =>
                    updateRun.mutate(
                      { id: run.id, payload },
                      { onSuccess: () => editConfigModal.close() },
                    )
                  }
                />
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal state={editStagedModal}>
        <Modal.Backdrop isDismissable={!updateRun.isPending}>
          <Modal.Container size="lg">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Edit staged config</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="staged-config-json">Staged config (JSON)</Label>
                    <TextArea
                      id="staged-config-json"
                      value={stagedConfigJson}
                      onChange={(e) => {
                        setStagedConfigJson(e.target.value);
                        setStagedConfigError(null);
                      }}
                      rows={16}
                      fullWidth
                      className="font-mono text-xs"
                    />
                    {stagedConfigError && <FieldError>{stagedConfigError}</FieldError>}
                  </div>
                  <div className="flex justify-end gap-2">
                    <ActionButtonWithPending
                      variant="secondary"
                      isDisabled={updateRun.isPending}
                      onPress={editStagedModal.close}
                    >
                      Cancel
                    </ActionButtonWithPending>
                    <ActionButtonWithPending
                      isPending={updateRun.isPending}
                      isDisabled={updateRun.isPending}
                      onPress={() => {
                        let parsed: unknown;
                        try {
                          parsed = JSON.parse(stagedConfigJson);
                        } catch {
                          setStagedConfigError("Invalid JSON");
                          return;
                        }
                        if (
                          !parsed ||
                          typeof parsed !== "object" ||
                          Array.isArray(parsed)
                        ) {
                          setStagedConfigError("Staged config must be a JSON object");
                          return;
                        }
                        updateRun.mutate(
                          {
                            id: run.id,
                            payload: {
                              staged_config: parsed as Record<string, unknown>,
                            },
                          },
                          { onSuccess: () => editStagedModal.close() },
                        );
                      }}
                    >
                      Save
                    </ActionButtonWithPending>
                  </div>
                </div>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal state={rejectModal}>
        <Modal.Backdrop isDismissable={!rejectRun.isPending}>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Reject this run</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="reject-reason">Reason (optional)</Label>
                    <TextArea
                      id="reject-reason"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={3}
                      fullWidth
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <ActionButtonWithPending
                      variant="secondary"
                      isDisabled={rejectRun.isPending}
                      onPress={rejectModal.close}
                    >
                      Cancel
                    </ActionButtonWithPending>
                    <ActionButtonWithPending
                      variant="danger"
                      isPending={rejectRun.isPending}
                      isDisabled={rejectRun.isPending}
                      onPress={() =>
                        rejectRun.mutate(
                          { id: run.id, payload: { reason: rejectReason || undefined } },
                          {
                            onSuccess: () => {
                              rejectModal.close();
                              setRejectReason("");
                            },
                          },
                        )
                      }
                    >
                      Reject
                    </ActionButtonWithPending>
                  </div>
                </div>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal state={retryModal}>
        <Modal.Backdrop isDismissable={!retryRun.isPending}>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Retry this run</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-muted">
                    {steps.length > 0
                      ? `Resumes from step ${steps.length} using the recorded browser actions and conversation history.`
                      : "No recorded steps yet — this will restart the generation loop."}
                  </p>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="retry-error">Error context (optional)</Label>
                    <TextArea
                      id="retry-error"
                      value={retryError}
                      onChange={(e) => setRetryError(e.target.value)}
                      rows={3}
                      fullWidth
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="retry-prompt">Additional prompt (optional)</Label>
                    <TextArea
                      id="retry-prompt"
                      value={retryPrompt}
                      onChange={(e) => setRetryPrompt(e.target.value)}
                      rows={3}
                      fullWidth
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <ActionButtonWithPending
                      variant="secondary"
                      isDisabled={retryRun.isPending}
                      onPress={retryModal.close}
                    >
                      Cancel
                    </ActionButtonWithPending>
                    <ActionButtonWithPending
                      isPending={retryRun.isPending}
                      isDisabled={retryRun.isPending}
                      onPress={() =>
                        retryRun.mutate(
                          {
                            id: run.id,
                            payload: {
                              error: retryError.trim() || undefined,
                              prompt: retryPrompt.trim() || undefined,
                            },
                          },
                          {
                            onSuccess: () => {
                              retryModal.close();
                              setRetryError("");
                              setRetryPrompt("");
                            },
                          },
                        )
                      }
                    >
                      Retry run
                    </ActionButtonWithPending>
                  </div>
                </div>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <ConfirmationDialog
        state={cancelConfirm}
        title="Cancel this generation run?"
        description="The run will stop and no further steps will be recorded. You can delete it afterward."
        confirmLabel="Cancel run"
        isPending={cancelRun.isPending}
        onConfirm={async () => {
          await cancelRun.mutateAsync(run.id);
        }}
      />

      <ConfirmationDialog
        state={deleteConfirm}
        title="Delete this generation run?"
        description="This permanently removes the run, its steps, and all screenshot files from storage."
        confirmLabel="Delete"
        isPending={deleteRun.isPending}
        onConfirm={() =>
          deleteRun.mutateAsync(run.id).then(() => navigate(Routes.generationRuns.list))
        }
      />
    </div>
  );
}
