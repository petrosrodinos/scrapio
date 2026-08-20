import type { FC } from "react";
import { Modal, Tabs, type useOverlayState } from "@heroui/react";
import { JsonCodeBlock } from "@/components/ui/json-code-block";
import type { WebhookDelivery } from "@/features/webhooks/interfaces/webhooks.interfaces";

function formatResponseBody(body: string | null): string {
  if (!body) return "—";
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

interface WebhookDeliveryPayloadModalProps {
  state: ReturnType<typeof useOverlayState>;
  delivery: WebhookDelivery | null;
}

export const WebhookDeliveryPayloadModal: FC<WebhookDeliveryPayloadModalProps> = ({
  state,
  delivery,
}) => {
  return (
    <Modal state={state}>
      <Modal.Backdrop isDismissable>
        <Modal.Container size="lg" scroll="outside">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Delivery payload</Modal.Heading>
              <Modal.CloseTrigger />
            </Modal.Header>
            <Modal.Body>
              {delivery ? (
                <Tabs defaultSelectedKey="request">
                  <Tabs.ListContainer>
                    <Tabs.List aria-label="Payload view">
                      <Tabs.Tab id="request">
                        Request
                        <Tabs.Indicator />
                      </Tabs.Tab>
                      <Tabs.Tab id="response">
                        Response
                        <Tabs.Indicator />
                      </Tabs.Tab>
                    </Tabs.List>
                  </Tabs.ListContainer>
                  <Tabs.Panel id="request" className="pt-3">
                    <JsonCodeBlock
                      json={JSON.stringify(delivery.payload, null, 2)}
                      maxHeightClassName="max-h-[60vh]"
                    />
                  </Tabs.Panel>
                  <Tabs.Panel id="response" className="pt-3">
                    <JsonCodeBlock
                      json={formatResponseBody(delivery.response_body)}
                      maxHeightClassName="max-h-[60vh]"
                    />
                  </Tabs.Panel>
                </Tabs>
              ) : null}
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
