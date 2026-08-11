import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Table, Input, Modal, Pagination, useOverlayState, Chip } from "@heroui/react";
import { Plus, Search, Trash2, Play, Pencil } from "lucide-react";
import { Routes } from "@/routes/routes";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { ActionButtonWithPending } from "@/components/ui/action-button-with-pending";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  TableRowActionsMenu,
  type TableRowAction,
} from "@/components/ui/table-row-actions-menu";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatDateTime } from "@/lib/date";
import { PlainScrapeForm } from "./components/plain-scrape-form";
import {
  usePlainScrapeConfigs,
  useCreatePlainScrapeConfig,
  useDeletePlainScrapeConfig,
  useRunPlainScrapeConfigNow,
} from "@/features/plain-scrape/hooks/use-plain-scrape";
import {
  plainScrapeFormValuesToPayload,
} from "@/features/plain-scrape/validation-schemas/plain-scrape.schema";
import type {
  PlainScrapeConfig,
  PlainScrapeConfigListQuery,
} from "@/features/plain-scrape/interfaces/plain-scrape.interfaces";
import { OutputFormats } from "@/features/scraper-generation/interfaces/output-config.interfaces";

function getPlainScrapeActions(): TableRowAction[] {
  return [
    { id: "run-now", label: "Run now", icon: Play },
    { id: "edit", label: "Edit", icon: Pencil },
    { id: "delete", label: "Delete", variant: "danger", icon: Trash2 },
  ];
}

export default function PlainScrapeListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const createModal = useOverlayState();
  const deleteConfirm = useOverlayState();
  const didAutoOpen = useRef(false);

  useEffect(() => {
    if (didAutoOpen.current) return;
    if (searchParams.get("create") === "1") {
      didAutoOpen.current = true;
      createModal.open();
      setSearchParams(
        (prev) => {
          prev.delete("create");
          return prev;
        },
        { replace: true },
      );
    }
  });

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  const query = useMemo<PlainScrapeConfigListQuery>(
    () => ({
      page,
      limit: 20,
      ...(debouncedSearch && { search: debouncedSearch }),
    }),
    [page, debouncedSearch],
  );

  const { data, isPending } = usePlainScrapeConfigs(query);
  const createConfig = useCreatePlainScrapeConfig();
  const deleteConfig = useDeletePlainScrapeConfig();
  const runNow = useRunPlainScrapeConfigNow();

  const configs = data?.data ?? [];
  const pagination = data?.pagination;

  const handleAction = (config: PlainScrapeConfig, actionId: string) => {
    if (actionId === "run-now") {
      runNow.mutate(config.id);
      return;
    }
    if (actionId === "edit") {
      navigate(Routes.plainScrape.detail(config.id));
      return;
    }
    if (actionId === "delete") {
      setDeleteId(config.id);
      deleteConfirm.open();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-semibold tracking-tight text-foreground">Plain Scrapes</p>
          <p className="text-sm text-muted">
            Fetch raw HTML or normalized content from a fixed set of URLs — no AI generation
            required.
          </p>
        </div>
        <ActionButtonWithPending onPress={createModal.open} idleLeading={<Plus className="h-4 w-4" />}>
          New plain scrape
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
          placeholder="Search by name"
          className="pl-9"
          fullWidth
        />
      </div>

      {isPending ? (
        <TableSkeleton rows={8} columns={5} />
      ) : configs.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-10 text-center text-sm text-muted">
          No plain scrape configs found.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <Table>
            <Table.ScrollContainer>
              <Table.Content aria-label="Plain scrape configs">
                <Table.Header>
                  <Table.Column isRowHeader>Name</Table.Column>
                  <Table.Column>URLs</Table.Column>
                  <Table.Column>Output</Table.Column>
                  <Table.Column>Schedule</Table.Column>
                  <Table.Column>Updated</Table.Column>
                  <Table.Column>Actions</Table.Column>
                </Table.Header>
                <Table.Body>
                  {configs.map((config) => (
                    <Table.Row
                      key={config.id}
                      id={config.id}
                      onAction={() => navigate(Routes.plainScrape.detail(config.id))}
                      className="cursor-pointer"
                    >
                      <Table.Cell>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{config.name}</span>
                          {config.description && (
                            <span className="text-xs text-muted truncate max-w-xs">
                              {config.description}
                            </span>
                          )}
                        </div>
                      </Table.Cell>
                      <Table.Cell>{config.urls.length}</Table.Cell>
                      <Table.Cell>
                        {config.output_formats.length === 0 ? (
                          <Chip size="sm" variant="soft">
                            <Chip.Label>Raw HTML</Chip.Label>
                          </Chip>
                        ) : (
                          <div className="flex gap-1">
                            {config.output_formats.includes(OutputFormats.STRUCTURED_JSON) && (
                              <Chip size="sm" variant="soft">
                                <Chip.Label>JSON</Chip.Label>
                              </Chip>
                            )}
                            {config.output_formats.includes(OutputFormats.MARKDOWN) && (
                              <Chip size="sm" variant="soft">
                                <Chip.Label>Markdown</Chip.Label>
                              </Chip>
                            )}
                          </div>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        {config.schedule_enabled ? (
                          <span className="font-mono text-xs">{config.schedule_cron}</span>
                        ) : (
                          <span className="text-muted">Manual</span>
                        )}
                      </Table.Cell>
                      <Table.Cell>{formatDateTime(config.updated_at)}</Table.Cell>
                      <Table.Cell>
                        <TableRowActionsMenu
                          actions={getPlainScrapeActions()}
                          onAction={(actionId) => handleAction(config, actionId)}
                          ariaLabel={`Actions for ${config.name}`}
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
        title="Delete this plain scrape config?"
        description="This cannot be undone."
        confirmLabel="Delete"
        isPending={deleteConfig.isPending}
        onConfirm={() => {
          if (!deleteId) return;
          deleteConfig.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
        }}
      />

      <Modal state={createModal}>
        <Modal.Backdrop isDismissable>
          <Modal.Container size="lg">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>New plain scrape</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="max-h-[70vh] overflow-y-auto">
                <PlainScrapeForm
                  submitLabel="Create"
                  isPending={createConfig.isPending}
                  onCancel={createModal.close}
                  onSubmit={(values) => {
                    createConfig.mutate(plainScrapeFormValuesToPayload(values), {
                      onSuccess: (created) => {
                        createModal.close();
                        navigate(Routes.plainScrape.detail(created.id));
                      },
                    });
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
