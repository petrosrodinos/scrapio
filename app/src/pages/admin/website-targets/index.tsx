import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  Input,
  Modal,
  Pagination,
  useOverlayState,
} from "@heroui/react";
import { Plus, Search, Trash2 } from "lucide-react";
import { Routes } from "@/routes/routes";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { ActionButtonWithPending } from "@/components/ui/action-button-with-pending";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  TableRowActionsMenu,
  type TableRowAction,
} from "@/components/ui/table-row-actions-menu";
import { WebsiteTargetForm } from "./components/website-target-form";
import {
  useWebsiteTargets,
  useCreateWebsiteTarget,
  useDeleteWebsiteTarget,
} from "@/features/website-targets/hooks/use-website-targets";
import { toWebsiteTargetBlockHandlingPayload } from "@/features/website-targets/validation-schemas/website-targets.schema";
import type {
  WebsiteTargetListQuery,
  WebsiteTarget,
} from "@/features/website-targets/interfaces/website-targets.interfaces";
import { formatDate } from "@/lib/date";
import { useDebouncedValue } from "./hooks/use-debounced-value";

function getWebsiteTargetActions(websiteTarget: WebsiteTarget): TableRowAction[] {
  const dependentCount =
    (websiteTarget._count?.scrapers ?? 0) + (websiteTarget._count?.crawl_runs ?? 0);

  return [
    {
      id: "delete",
      label: "Delete",
      variant: "danger",
      icon: Trash2,
      isDisabled: dependentCount > 0,
    },
  ];
}

export default function WebsiteTargetsListPage() {
  const navigate = useNavigate();
  const createModal = useOverlayState();
  const deleteConfirm = useOverlayState();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteWebsiteTargetId, setDeleteWebsiteTargetId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  const query = useMemo<WebsiteTargetListQuery>(
    () => ({
      page,
      limit: 20,
      ...(debouncedSearch && { search: debouncedSearch }),
    }),
    [page, debouncedSearch],
  );

  const { data, isPending } = useWebsiteTargets(query);
  const createWebsiteTarget = useCreateWebsiteTarget();
  const deleteWebsiteTarget = useDeleteWebsiteTarget();

  const websiteTargets = data?.data ?? [];
  const pagination = data?.pagination;

  const handleWebsiteTargetAction = (websiteTarget: WebsiteTarget, actionId: string) => {
    if (actionId === "delete") {
      setDeleteWebsiteTargetId(websiteTarget.id);
      deleteConfirm.open();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-semibold tracking-tight text-foreground">Website Targets</p>
          <p className="text-sm text-muted">Source websites configured for scraping.</p>
        </div>
        <ActionButtonWithPending onPress={createModal.open} idleLeading={<Plus className="h-4 w-4" />}>
          New website target
        </ActionButtonWithPending>
      </div>

      <div className="relative max-w-sm w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          placeholder="Search by name or URL"
          className="pl-9"
          fullWidth
        />
      </div>

      {isPending ? (
        <TableSkeleton rows={8} columns={4} />
      ) : websiteTargets.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-10 text-center text-sm text-muted">
          No website targets found.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <Table>
            <Table.ScrollContainer>
              <Table.Content aria-label="Website targets">
                <Table.Header>
                  <Table.Column isRowHeader>Name</Table.Column>
                  <Table.Column>Last success</Table.Column>
                  <Table.Column>Last failure</Table.Column>
                  <Table.Column>Actions</Table.Column>
                </Table.Header>
                <Table.Body>
                  {websiteTargets.map((websiteTarget) => (
                    <Table.Row
                      key={websiteTarget.id}
                      id={websiteTarget.id}
                      onAction={() =>
                        navigate(Routes.admin.websiteTargets.detail(websiteTarget.id))
                      }
                      className="cursor-pointer"
                    >
                      <Table.Cell>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{websiteTarget.name}</span>
                          <span className="text-xs text-muted truncate max-w-xs">
                            {websiteTarget.base_url}
                          </span>
                        </div>
                      </Table.Cell>
                      <Table.Cell>{formatDate(websiteTarget.last_success_at)}</Table.Cell>
                      <Table.Cell>{formatDate(websiteTarget.last_failure_at)}</Table.Cell>
                      <Table.Cell>
                        <TableRowActionsMenu
                          actions={getWebsiteTargetActions(websiteTarget)}
                          onAction={(actionId) =>
                            handleWebsiteTargetAction(websiteTarget, actionId)
                          }
                          ariaLabel={`Actions for ${websiteTarget.name}`}
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

      {pagination && pagination.total_pages > 1 && (
        <Pagination>
          <Pagination.Content>
            <Pagination.Item>
              <Pagination.Previous
                isDisabled={!pagination.has_prev}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Pagination.Previous>
            </Pagination.Item>
            <Pagination.Item>
              <Pagination.Summary>
                Page {pagination.page} of {pagination.total_pages}
              </Pagination.Summary>
            </Pagination.Item>
            <Pagination.Item>
              <Pagination.Next
                isDisabled={!pagination.has_next}
                onPress={() => setPage((p) => p + 1)}
              >
                Next
              </Pagination.Next>
            </Pagination.Item>
          </Pagination.Content>
        </Pagination>
      )}

      <ConfirmationDialog
        state={deleteConfirm}
        title="Delete this website target?"
        description="This cannot be undone."
        confirmLabel="Delete"
        isPending={deleteWebsiteTarget.isPending}
        onConfirm={() => {
          if (!deleteWebsiteTargetId) return;
          deleteWebsiteTarget.mutate(deleteWebsiteTargetId, {
            onSuccess: () => setDeleteWebsiteTargetId(null),
          });
        }}
      />

      <Modal state={createModal}>
        <Modal.Backdrop isDismissable>
          <Modal.Container size="lg">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>New website target</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="max-h-[70vh] overflow-y-auto">
                <WebsiteTargetForm
                  submitLabel="Create"
                  isPending={createWebsiteTarget.isPending}
                  onCancel={createModal.close}
                  onSubmit={(values) => {
                    const blockHandling = toWebsiteTargetBlockHandlingPayload(values);
                    createWebsiteTarget.mutate(
                      {
                        name: values.name,
                        base_url: values.base_url,
                        notes: values.notes,
                        crawl_interval: values.crawl_interval,
                        ...(blockHandling.block_handling_wait_timeout_ms != null && {
                          block_handling_wait_timeout_ms:
                            blockHandling.block_handling_wait_timeout_ms,
                        }),
                        ...(blockHandling.block_handling_min_ready_body_length !=
                          null && {
                          block_handling_min_ready_body_length:
                            blockHandling.block_handling_min_ready_body_length,
                        }),
                        ...(blockHandling.block_rules.length > 0 && {
                          block_rules: blockHandling.block_rules,
                        }),
                      },
                      { onSuccess: () => createModal.close() },
                    );
                  }}
                />
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
