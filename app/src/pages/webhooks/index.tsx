import { useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Chip, Form, Label, Input, FieldError, Modal, Switch, useOverlayState } from "@heroui/react";
import { Webhook, Pencil, Trash2, History, Send } from "lucide-react";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { ActionButtonWithPending } from "@/components/ui/action-button-with-pending";
import { formatDateTime } from "@/lib/date";
import { CreateWebhookEndpointForm } from "./components/create-webhook-endpoint-form";
import { EventCatalogPicker } from "./components/event-catalog-picker";
import { WebhookDeliveriesDrawer } from "./components/webhook-deliveries-drawer";
import { SendTestEventModal } from "./components/send-test-event-modal";
import {
  useWebhookEndpoints,
  useWebhookEventCatalog,
  useCreateWebhookEndpoint,
  useUpdateWebhookEndpoint,
  useDeleteWebhookEndpoint,
} from "@/features/webhooks/hooks/use-webhooks";
import type { WebhookEndpoint, WebhookEventType } from "@/features/webhooks/interfaces/webhooks.interfaces";
import {
  updateWebhookEndpointSchema,
  type CreateWebhookEndpointFormValues,
  type UpdateWebhookEndpointFormValues,
} from "@/features/webhooks/validation-schemas/webhooks.schema";

function EditWebhookEndpointForm({
  endpoint,
  isPending,
  onSubmit,
  onCancel,
}: {
  endpoint: WebhookEndpoint;
  isPending: boolean;
  onSubmit: (values: UpdateWebhookEndpointFormValues) => void;
  onCancel: () => void;
}) {
  const { data: catalog = [] } = useWebhookEventCatalog();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateWebhookEndpointFormValues>({
    resolver: zodResolver(updateWebhookEndpointSchema) as Resolver<UpdateWebhookEndpointFormValues>,
    defaultValues: {
      name: endpoint.name ?? "",
      url: endpoint.url,
      secret: "",
      subscribed_events: endpoint.subscribed_events,
    },
  });

  return (
    <Form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="edit-webhook-name">Name</Label>
        <Input id="edit-webhook-name" {...register("name")} disabled={isPending} fullWidth />
        {errors.name && <FieldError>{errors.name.message}</FieldError>}
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="edit-webhook-url">Endpoint URL</Label>
        <Input id="edit-webhook-url" {...register("url")} disabled={isPending} fullWidth />
        {errors.url && <FieldError>{errors.url.message}</FieldError>}
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="edit-webhook-secret">Rotate secret (optional)</Label>
        <Input
          id="edit-webhook-secret"
          {...register("secret")}
          placeholder="Leave blank to keep the current secret"
          disabled={isPending}
          fullWidth
        />
        {errors.secret && <FieldError>{errors.secret.message}</FieldError>}
      </div>

      <Controller
        name="subscribed_events"
        control={control}
        render={({ field }) => (
          <EventCatalogPicker
            catalog={catalog}
            value={field.value as WebhookEventType[]}
            onChange={field.onChange}
            isDisabled={isPending}
            error={errors.subscribed_events?.message}
          />
        )}
      />

      <div className="flex justify-end gap-2 pt-2">
        <ActionButtonWithPending type="button" variant="secondary" onPress={onCancel}>
          Cancel
        </ActionButtonWithPending>
        <ActionButtonWithPending type="submit" isPending={isPending}>
          Save changes
        </ActionButtonWithPending>
      </div>
    </Form>
  );
}

function formatDate(value: string | null): string {
  if (!value) return "Never";
  return formatDateTime(value);
}

export default function WebhooksPage() {
  const createModal = useOverlayState();
  const editModal = useOverlayState();
  const deleteConfirm = useOverlayState();
  const deliveriesDrawer = useOverlayState();
  const testEventModal = useOverlayState();

  const [editingEndpoint, setEditingEndpoint] = useState<WebhookEndpoint | null>(null);
  const [deletingEndpointId, setDeletingEndpointId] = useState<string | null>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState<WebhookEndpoint | null>(null);

  const { data: catalog = [] } = useWebhookEventCatalog();
  const { data: endpoints = [], isPending } = useWebhookEndpoints();
  const createEndpoint = useCreateWebhookEndpoint();
  const updateEndpoint = useUpdateWebhookEndpoint();
  const deleteEndpoint = useDeleteWebhookEndpoint();

  const handleCreate = async (values: CreateWebhookEndpointFormValues) => {
    await createEndpoint.mutateAsync({
      url: values.url,
      secret: values.secret,
      subscribed_events: values.subscribed_events as WebhookEventType[],
      ...(values.name ? { name: values.name } : {}),
    });
    createModal.close();
  };

  const handleEdit = async (values: UpdateWebhookEndpointFormValues) => {
    if (!editingEndpoint) return;
    await updateEndpoint.mutateAsync({
      id: editingEndpoint.id,
      payload: {
        name: values.name || undefined,
        url: values.url,
        subscribed_events: values.subscribed_events as WebhookEventType[],
        ...(values.secret ? { secret: values.secret } : {}),
      },
    });
    editModal.close();
    setEditingEndpoint(null);
  };

  const handleToggleActive = (endpoint: WebhookEndpoint, isActive: boolean) => {
    updateEndpoint.mutate({ id: endpoint.id, payload: { is_active: isActive } });
  };

  return (
    <div className="flex flex-col gap-6 min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold tracking-tight text-foreground">Webhooks</p>
          <p className="text-sm text-muted">
            Get notified at your own URL when your scraping runs change state. Each request is
            signed with the secret you choose so you can verify it came from us.
          </p>
        </div>
        <Button variant="primary" onPress={createModal.open}>
          <Webhook className="h-4 w-4" />
          Add endpoint
        </Button>
      </div>

      {isPending ? (
        <TableSkeleton rows={3} columns={4} />
      ) : endpoints.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted">
          No webhook endpoints yet. Add one to start receiving events.
        </div>
      ) : (
        <div className="flex flex-col gap-3 min-w-0">
          {endpoints.map((endpoint) => (
            <section
              key={endpoint.id}
              className="min-w-0 overflow-hidden rounded-xl border border-border bg-surface p-4 flex flex-wrap items-center justify-between gap-3"
            >
              <div className="min-w-0 flex-1 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {endpoint.name || endpoint.url}
                  </p>
                  <Chip size="sm" variant={endpoint.is_active ? "primary" : "secondary"}>
                    {endpoint.is_active ? "Active" : "Disabled"}
                  </Chip>
                </div>
                <p className="font-mono text-xs text-muted truncate" title={endpoint.url}>
                  {endpoint.url}
                </p>
                <p className="text-xs text-muted">
                  {endpoint.subscribed_events.length} event
                  {endpoint.subscribed_events.length === 1 ? "" : "s"} · Last triggered{" "}
                  {formatDate(endpoint.last_triggered_at)}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-3">
                <Switch
                  isSelected={endpoint.is_active}
                  isDisabled={updateEndpoint.isPending}
                  onChange={(isSelected) => handleToggleActive(endpoint, isSelected)}
                >
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                  <Switch.Content>Enabled</Switch.Content>
                </Switch>
                <Button
                  variant="secondary"
                  onPress={() => {
                    setSelectedEndpoint(endpoint);
                    deliveriesDrawer.open();
                  }}
                >
                  <History className="h-4 w-4" />
                  Deliveries
                </Button>
                <Button
                  variant="secondary"
                  isDisabled={endpoint.subscribed_events.length === 0}
                  onPress={() => {
                    setSelectedEndpoint(endpoint);
                    testEventModal.open();
                  }}
                >
                  <Send className="h-4 w-4" />
                  Send test
                </Button>
                <Button
                  variant="secondary"
                  onPress={() => {
                    setEditingEndpoint(endpoint);
                    editModal.open();
                  }}
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="danger-soft"
                  onPress={() => {
                    setDeletingEndpointId(endpoint.id);
                    deleteConfirm.open();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </section>
          ))}
        </div>
      )}

      <Modal state={createModal}>
        <Modal.Backdrop isDismissable={!createEndpoint.isPending}>
          <Modal.Container size="lg" scroll="inside">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Add webhook endpoint</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <CreateWebhookEndpointForm
                  catalog={catalog}
                  isPending={createEndpoint.isPending}
                  onSubmit={handleCreate}
                  onCancel={createModal.close}
                />
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal state={editModal}>
        <Modal.Backdrop isDismissable={!updateEndpoint.isPending}>
          <Modal.Container size="lg" scroll="inside">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Edit webhook endpoint</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                {editingEndpoint ? (
                  <EditWebhookEndpointForm
                    key={editingEndpoint.id}
                    endpoint={editingEndpoint}
                    isPending={updateEndpoint.isPending}
                    onSubmit={handleEdit}
                    onCancel={() => {
                      editModal.close();
                      setEditingEndpoint(null);
                    }}
                  />
                ) : null}
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <WebhookDeliveriesDrawer state={deliveriesDrawer} endpoint={selectedEndpoint} />

      <SendTestEventModal
        state={testEventModal}
        endpoint={selectedEndpoint}
        onClose={() => setSelectedEndpoint(null)}
      />

      <ConfirmationDialog
        state={deleteConfirm}
        title="Delete webhook endpoint?"
        description="We'll stop sending events to this URL immediately. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!deletingEndpointId) return;
          await deleteEndpoint.mutateAsync(deletingEndpointId);
          setDeletingEndpointId(null);
        }}
        isPending={deleteEndpoint.isPending}
      />
    </div>
  );
}
