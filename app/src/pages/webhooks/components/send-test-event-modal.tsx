import { useState } from "react";
import { Modal, Button, Select, ListBox, type useOverlayState } from "@heroui/react";
import { ActionButtonWithPending } from "@/components/ui/action-button-with-pending";
import { useSendTestWebhookEvent } from "@/features/webhooks/hooks/use-webhooks";
import type { WebhookEndpoint, WebhookEventType } from "@/features/webhooks/interfaces/webhooks.interfaces";
import { cn } from "@/lib/utils";

interface SendTestEventModalProps {
  state: ReturnType<typeof useOverlayState>;
  endpoint: WebhookEndpoint | null;
  onClose: () => void;
}

export function SendTestEventModal({ state, endpoint, onClose }: SendTestEventModalProps) {
  const [eventType, setEventType] = useState<WebhookEventType | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const sendTestEvent = useSendTestWebhookEvent();

  const events = endpoint?.subscribed_events ?? [];

  const handleSend = async () => {
    if (!endpoint || !eventType) return;
    setResult(null);
    try {
      const delivery = await sendTestEvent.mutateAsync({ id: endpoint.id, eventType });
      setResult({
        success: delivery.status === "SUCCESS",
        message:
          delivery.status === "SUCCESS"
            ? `Delivered successfully (HTTP ${delivery.http_status_code})`
            : (delivery.error_message ??
              `Endpoint responded with HTTP ${delivery.http_status_code ?? "—"}`),
      });
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "Failed to send test event",
      });
    }
  };

  const handleClose = () => {
    setEventType(null);
    setResult(null);
    state.close();
    onClose();
  };

  return (
    <Modal state={state}>
      <Modal.Backdrop isDismissable={!sendTestEvent.isPending}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Send test event</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-3">
              <p className="text-sm text-muted">
                Sends a synthetic payload to <span className="font-mono">{endpoint?.url}</span>{" "}
                immediately, signed the same way as real events.
              </p>

              <Select
                aria-label="Event to send"
                placeholder="Select an event"
                selectedKey={eventType}
                onSelectionChange={(key) => {
                  setEventType(key as WebhookEventType);
                  setResult(null);
                }}
              >
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {events.map((event) => (
                      <ListBox.Item key={event} id={event}>
                        {event}
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>

              {result ? (
                <div
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm",
                    result.success ? "border-success/30 text-success" : "border-danger/30 text-danger",
                  )}
                >
                  {result.message}
                </div>
              ) : null}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={handleClose}>
                Close
              </Button>
              <ActionButtonWithPending
                isPending={sendTestEvent.isPending}
                isDisabled={!eventType}
                onPress={handleSend}
              >
                Send test
              </ActionButtonWithPending>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
