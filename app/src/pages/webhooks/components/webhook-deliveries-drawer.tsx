import { useState } from "react";
import {
  Chip,
  Drawer,
  ListBox,
  Pagination,
  Select,
  Table,
  type useOverlayState,
} from "@heroui/react";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { WebhookDeliveryStatusFilterOptions } from "@/config/constants/dropdowns/webhooks/webhook-delivery-status-filter.options";
import { WebhookEventFilterOptions } from "@/config/constants/dropdowns/webhooks/webhook-event-filter.options";
import { formatDateTime } from "@/lib/date";
import { useWebhookDeliveries } from "@/features/webhooks/hooks/use-webhooks";
import {
  WebhookDeliveryStatuses,
  type WebhookDeliveryStatus,
  type WebhookEndpoint,
  type WebhookEventType,
} from "@/features/webhooks/interfaces/webhooks.interfaces";

const statusColor: Record<WebhookDeliveryStatus, "success" | "danger" | "warning"> = {
  [WebhookDeliveryStatuses.SUCCESS]: "success",
  [WebhookDeliveryStatuses.FAILED]: "danger",
  [WebhookDeliveryStatuses.PENDING]: "warning",
};

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

interface WebhookDeliveriesDrawerProps {
  state: ReturnType<typeof useOverlayState>;
  endpoint: WebhookEndpoint | null;
}

export function WebhookDeliveriesDrawer({ state, endpoint }: WebhookDeliveriesDrawerProps) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<WebhookDeliveryStatus | "all">("all");
  const [eventType, setEventType] = useState<WebhookEventType | "all">("all");

  const { data, isPending } = useWebhookDeliveries(endpoint?.id ?? "", {
    page,
    limit: 20,
    ...(status !== "all" && { status }),
    ...(eventType !== "all" && { event_type: eventType }),
  });

  const deliveries = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <Drawer state={state}>
      <Drawer.Backdrop isDismissable>
        <Drawer.Content placement="right" className="h-full">
          <Drawer.Dialog className="flex h-full max-h-dvh w-[min(42rem,100%)] max-w-2xl flex-col overflow-hidden sm:w-[min(42rem,100%)]">
            <Drawer.Header className="shrink-0">
              <Drawer.Heading>Delivery history</Drawer.Heading>
              <Drawer.CloseTrigger />
            </Drawer.Header>
            <Drawer.Body className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
              <p className="shrink-0 break-all text-sm text-muted">{endpoint?.url}</p>

              <div className="flex shrink-0 flex-wrap gap-2">
                <Select
                  aria-label="Filter by status"
                  selectedKey={status}
                  onSelectionChange={(key) => {
                    setPage(1);
                    setStatus(key as WebhookDeliveryStatus | "all");
                  }}
                  className="w-40"
                >
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox items={WebhookDeliveryStatusFilterOptions}>
                      {(option) => <ListBox.Item id={option.id}>{option.label}</ListBox.Item>}
                    </ListBox>
                  </Select.Popover>
                </Select>

                <Select
                  aria-label="Filter by event"
                  selectedKey={eventType}
                  onSelectionChange={(key) => {
                    setPage(1);
                    setEventType(key as WebhookEventType | "all");
                  }}
                  className="min-w-48"
                >
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox items={WebhookEventFilterOptions}>
                      {(option) => <ListBox.Item id={option.id}>{option.label}</ListBox.Item>}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </div>

              {isPending ? (
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <TableSkeleton rows={6} columns={4} />
                </div>
              ) : deliveries.length === 0 ? (
                <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted">
                  No delivery attempts yet.
                </div>
              ) : (
                <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-surface">
                  <Table className="h-full">
                    <Table.ScrollContainer className="h-full max-h-full min-h-0 overflow-auto">
                      <Table.Content aria-label="Webhook deliveries" className="w-full">
                        <Table.Header>
                          <Table.Column isRowHeader>Event</Table.Column>
                          <Table.Column>Status</Table.Column>
                          <Table.Column>Attempt</Table.Column>
                          <Table.Column>Duration</Table.Column>
                        </Table.Header>
                        <Table.Body>
                          {deliveries.map((delivery) => (
                            <Table.Row key={delivery.id} id={delivery.id}>
                              <Table.Cell>
                                <div className="flex min-w-0 flex-col gap-0.5">
                                  <span className="text-sm break-words">{delivery.event_type}</span>
                                  <span className="text-xs text-muted">
                                    {formatDateTime(delivery.created_at)}
                                  </span>
                                  {delivery.is_test ? (
                                    <span className="text-xs text-muted">Test event</span>
                                  ) : null}
                                </div>
                              </Table.Cell>
                              <Table.Cell>
                                <div className="flex min-w-0 flex-col gap-0.5">
                                  <Chip color={statusColor[delivery.status]} size="sm" variant="soft">
                                    <Chip.Label>
                                      {delivery.status}
                                      {delivery.http_status_code
                                        ? ` (${delivery.http_status_code})`
                                        : ""}
                                    </Chip.Label>
                                  </Chip>
                                  {delivery.error_message ? (
                                    <span className="text-xs text-danger break-words">
                                      {delivery.error_message}
                                    </span>
                                  ) : null}
                                </div>
                              </Table.Cell>
                              <Table.Cell className="whitespace-nowrap">
                                {delivery.attempt_number}
                              </Table.Cell>
                              <Table.Cell className="whitespace-nowrap">
                                {formatDuration(delivery.duration_ms)}
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
                <Pagination className="shrink-0">
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
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}
