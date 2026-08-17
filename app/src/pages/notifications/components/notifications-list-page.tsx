import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Button,
  Checkbox,
  ListBox,
  Pagination,
  Select,
  Table,
  useOverlayState,
  type Selection,
} from "@heroui/react";
import { MailOpen, Trash2 } from "lucide-react";
import { Routes } from "@/routes/routes";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { ActionButtonWithPending } from "@/components/ui/action-button-with-pending";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  TableRowActionsMenu,
  type TableRowAction,
} from "@/components/ui/table-row-actions-menu";
import { NotificationSeverityChip } from "./notification-severity-chip";
import { NotificationTypeChip } from "./notification-type-chip";
import {
  useDeleteNotification,
  useDeleteNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/features/notifications/hooks/use-notifications";
import {
  type Notification,
  type NotificationListQuery,
  type NotificationSeverity,
  type NotificationType,
} from "@/features/notifications/interfaces/notifications.interfaces";
import { useUsers } from "@/features/users/hooks/use-users";
import { NotificationTypeFilterOptions } from "@/config/constants/dropdowns/notifications/notification-type-filter.options";
import { NotificationSeverityFilterOptions } from "@/config/constants/dropdowns/notifications/notification-severity-filter.options";
import { ReadFilterOptions } from "@/config/constants/dropdowns/notifications/read-filter.options";

function resolveNotificationLink(notification: Notification): string | null {
  if (notification.website_target_id) {
    return Routes.websiteTargets.detail(notification.website_target_id);
  }
  if (notification.workflow_config_id) {
    return Routes.scrapers.detail(notification.workflow_config_id);
  }
  if (notification.workflow_run_id) {
    return Routes.crawlRuns.detail(notification.workflow_run_id);
  }
  return null;
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString();
}

function getNotificationActions(isRead: boolean): TableRowAction[] {
  const actions: TableRowAction[] = [];
  if (!isRead) {
    actions.push({ id: "mark-read", label: "Mark read", icon: MailOpen });
  }
  actions.push({ id: "delete", label: "Delete", variant: "danger", icon: Trash2 });
  return actions;
}

interface NotificationsListPageProps {
  isAdmin: boolean;
}

export function NotificationsListPage({ isAdmin }: NotificationsListPageProps) {
  const deleteConfirm = useOverlayState();
  const bulkDeleteConfirm = useOverlayState();

  const [type, setType] = useState<NotificationType | "all">("all");
  const [severity, setSeverity] = useState<NotificationSeverity | "all">("all");
  const [readState, setReadState] = useState<"all" | "true" | "false">("all");
  const [userId, setUserId] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set());
  const [deleteNotificationId, setDeleteNotificationId] = useState<string | null>(null);

  const query = useMemo<NotificationListQuery>(
    () => ({
      page,
      limit: 20,
      ...(type !== "all" && { type }),
      ...(severity !== "all" && { severity }),
      ...(readState !== "all" && { is_read: readState === "true" }),
      ...(isAdmin && userId !== "all" && { user_id: userId }),
    }),
    [page, type, severity, readState, isAdmin, userId],
  );

  const { data, isPending } = useNotifications(query);
  const { data: users } = useUsers(isAdmin);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();
  const deleteNotifications = useDeleteNotifications();

  const notifications = data?.data ?? [];
  const pagination = data?.pagination;
  const selectedIds = useMemo(() => {
    if (selectedKeys === "all") {
      return new Set(notifications.map((notification) => notification.id));
    }
    return new Set([...selectedKeys].map(String));
  }, [selectedKeys, notifications]);
  const selectedCount = selectedIds.size;

  const clearSelection = () => setSelectedKeys(new Set());

  const handleDelete = async () => {
    if (!deleteNotificationId) return;
    await deleteNotification.mutateAsync(deleteNotificationId);
    setSelectedKeys((prev) => {
      if (prev === "all") {
        return new Set(
          notifications
            .map((notification) => notification.id)
            .filter((id) => id !== deleteNotificationId),
        );
      }
      const next = new Set(prev);
      next.delete(deleteNotificationId);
      return next;
    });
    setDeleteNotificationId(null);
  };

  const handleBulkDelete = async () => {
    await deleteNotifications.mutateAsync({ ids: Array.from(selectedIds) });
    clearSelection();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-2xl font-semibold tracking-tight text-foreground">Notifications</p>
          <p className="text-sm text-muted">
            System alerts for scraper failures, crawl issues, and queue problems.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="danger"
            isDisabled={selectedCount < 1}
            onPress={bulkDeleteConfirm.open}
          >
            Delete selected ({selectedCount})
          </Button>
          <ActionButtonWithPending
            variant="secondary"
            onPress={() => markAllRead.mutateAsync()}
            isPending={markAllRead.isPending}
          >
            Mark all read
          </ActionButtonWithPending>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select
          aria-label="Filter by notification type"
          selectedKey={type}
          onSelectionChange={(key) => {
            setPage(1);
            clearSelection();
            setType(key as NotificationType | "all");
          }}
          className="w-64"
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {NotificationTypeFilterOptions.map((option) => (
                <ListBox.Item key={option.id} id={option.id}>
                  {option.label}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        <Select
          aria-label="Filter by severity"
          selectedKey={severity}
          onSelectionChange={(key) => {
            setPage(1);
            clearSelection();
            setSeverity(key as NotificationSeverity | "all");
          }}
          className="w-44"
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {NotificationSeverityFilterOptions.map((option) => (
                <ListBox.Item key={option.id} id={option.id}>
                  {option.label}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        <Select
          aria-label="Filter by read status"
          selectedKey={readState}
          onSelectionChange={(key) => {
            setPage(1);
            clearSelection();
            setReadState(key as "all" | "true" | "false");
          }}
          className="w-36"
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {ReadFilterOptions.map((option) => (
                <ListBox.Item key={option.id} id={option.id}>
                  {option.label}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        {isAdmin && (
          <Select
            aria-label="Filter by user"
            selectedKey={userId}
            onSelectionChange={(key) => {
              setPage(1);
              clearSelection();
              setUserId(key as string);
            }}
            className="w-56"
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item key="all" id="all">
                  All users
                </ListBox.Item>
                {(users ?? []).map((user) => (
                  <ListBox.Item key={user.id} id={user.id}>
                    {user.email}
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        )}
      </div>

      {isPending ? (
        <TableSkeleton rows={8} columns={7} />
      ) : notifications.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-10 text-center text-sm text-muted">
          No notifications found.
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <Table>
              <Table.ScrollContainer>
                <Table.Content
                  aria-label="Notifications"
                  selectionMode="multiple"
                  selectedKeys={selectedKeys}
                  onSelectionChange={setSelectedKeys}
                >
                  <Table.Header>
                    <Table.Column className="pr-0">
                      <Checkbox aria-label="Select all notifications on this page" slot="selection">
                        <Checkbox.Content>
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                        </Checkbox.Content>
                      </Checkbox>
                    </Table.Column>
                    <Table.Column isRowHeader>Title</Table.Column>
                    <Table.Column>Type</Table.Column>
                    <Table.Column>Severity</Table.Column>
                    <Table.Column>Created</Table.Column>
                    <Table.Column>Status</Table.Column>
                    <Table.Column>Actions</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {notifications.map((notification) => {
                      const link = resolveNotificationLink(notification);

                      return (
                        <Table.Row key={notification.id} id={notification.id}>
                          <Table.Cell className="pr-0">
                            <Checkbox
                              aria-label={`Select ${notification.title}`}
                              slot="selection"
                              variant="secondary"
                            >
                              <Checkbox.Content>
                                <Checkbox.Control>
                                  <Checkbox.Indicator />
                                </Checkbox.Control>
                              </Checkbox.Content>
                            </Checkbox>
                          </Table.Cell>
                          <Table.Cell>
                            <div className="flex flex-col gap-1 max-w-md">
                              {link ? (
                                <Link
                                  to={link}
                                  className="font-medium text-foreground hover:text-accent transition-colors"
                                >
                                  {notification.title}
                                </Link>
                              ) : (
                                <span className="font-medium text-foreground">{notification.title}</span>
                              )}
                              <span className="text-xs text-muted line-clamp-2">{notification.message}</span>
                            </div>
                          </Table.Cell>
                          <Table.Cell>
                            <NotificationTypeChip type={notification.type} />
                          </Table.Cell>
                          <Table.Cell>
                            <NotificationSeverityChip severity={notification.severity} />
                          </Table.Cell>
                          <Table.Cell className="text-sm text-muted whitespace-nowrap">
                            {formatTimestamp(notification.created_at)}
                          </Table.Cell>
                          <Table.Cell>
                            <span className={notification.is_read ? "text-muted" : "text-foreground font-medium"}>
                              {notification.is_read ? "Read" : "Unread"}
                            </span>
                          </Table.Cell>
                          <Table.Cell>
                            <TableRowActionsMenu
                              actions={getNotificationActions(notification.is_read)}
                              onAction={(actionId) => {
                                if (actionId === "mark-read") {
                                  markRead.mutate(notification.id);
                                  return;
                                }
                                if (actionId !== "delete") return;
                                setDeleteNotificationId(notification.id);
                                deleteConfirm.open();
                              }}
                              ariaLabel={`Actions for ${notification.title}`}
                            />
                          </Table.Cell>
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          </div>

          {pagination && pagination.total_pages > 1 ? (
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
          ) : null}
        </>
      )}

      <ConfirmationDialog
        state={deleteConfirm}
        title="Delete notification?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        isPending={deleteNotification.isPending}
      />

      <ConfirmationDialog
        state={bulkDeleteConfirm}
        title={`Delete ${selectedCount} notification${selectedCount === 1 ? "" : "s"}?`}
        description="This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleBulkDelete}
        isPending={deleteNotifications.isPending}
      />
    </div>
  );
}
