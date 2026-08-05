import { useMemo, useState } from "react";
import {
  Button,
  Chip,
  Modal,
  Table,
  useOverlayState,
} from "@heroui/react";
import { Plug, Unplug } from "lucide-react";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { IntegrationConnectForm } from "./components/integration-connect-form";
import { CrawlScheduleTimezonePanel } from "./components/crawl-schedule-timezone-panel";
import { useIntegrations } from "@/features/integrations/hooks/use-integrations";
import type { Integration } from "@/features/integrations/interfaces/integrations.interfaces";
import type { UserIntegration } from "@/features/user-integrations/interfaces/user-integrations.interfaces";
import {
  useConnectUserIntegration,
  useDisconnectUserIntegration,
  useUserIntegrations,
} from "@/features/user-integrations/hooks/use-user-integrations";
import type { ConnectUserIntegrationFormValues } from "@/features/user-integrations/validation-schemas/user-integrations.schema";
import { formatDate } from "@/lib/date";

function getModelLabel(integration: Integration | undefined, modelValue: string | null) {
  if (!integration || !modelValue) return "—";
  return integration.models.find((model) => model.value === modelValue)?.label ?? modelValue;
}

export default function IntegrationsPage() {
  const connectModal = useOverlayState();
  const disconnectConfirm = useOverlayState();

  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [disconnectIntegrationId, setDisconnectIntegrationId] = useState<string | null>(null);

  const { data: integrations = [], isPending: integrationsPending } = useIntegrations();
  const { data: userIntegrationsData, isPending: userIntegrationsPending } = useUserIntegrations({
    page: 1,
    limit: 50,
  });
  const connectIntegration = useConnectUserIntegration();
  const disconnectIntegration = useDisconnectUserIntegration();

  const connectedByType = useMemo(() => {
    const map = new Map<string, UserIntegration>();
    for (const item of userIntegrationsData?.data ?? []) {
      map.set(item.integration_type, item);
    }
    return map;
  }, [userIntegrationsData?.data]);

  const userIntegrations = userIntegrationsData?.data ?? [];
  const isPending = integrationsPending || userIntegrationsPending;

  const openConnectModal = (integration: Integration) => {
    setSelectedIntegration(integration);
    connectModal.open();
  };

  const handleConnect = async (values: ConnectUserIntegrationFormValues) => {
    await connectIntegration.mutateAsync(values);
    connectModal.close();
    setSelectedIntegration(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-2xl font-semibold tracking-tight text-foreground">Integrations</p>
        <p className="text-sm text-muted">
          Connect provider API keys and choose the computer use model for scraper generation.
        </p>
      </div>

      <CrawlScheduleTimezonePanel />

      {isPending ? (
        <TableSkeleton rows={4} columns={4} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {integrations.map((integration) => {
              const connected = connectedByType.get(integration.type);

              return (
                <section
                  key={integration.type}
                  className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-foreground">{integration.name}</p>
                      <p className="text-sm text-muted">{integration.base_url}</p>
                    </div>
                    <Chip size="sm" variant={connected ? "primary" : "secondary"}>
                      {connected ? "Connected" : "Not connected"}
                    </Chip>
                  </div>

                  {connected ? (
                    <div className="text-sm text-muted flex flex-col gap-1">
                      <span>Key: {connected.api_key_masked}</span>
                      {connected.computer_use_model ? (
                        <span>
                          Model: {getModelLabel(integration, connected.computer_use_model)}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-sm text-muted">
                      {integration.models.length > 0
                        ? "Requires API key and a computer use model."
                        : "Requires an API key."}
                    </p>
                  )}

                  <div className="mt-auto">
                    {connected ? (
                      <Button
                        variant="danger-soft"
                        onPress={() => {
                          setDisconnectIntegrationId(connected.id);
                          disconnectConfirm.open();
                        }}
                      >
                        <Unplug className="h-4 w-4" />
                        Disconnect
                      </Button>
                    ) : (
                      <Button variant="primary" onPress={() => openConnectModal(integration)}>
                        <Plug className="h-4 w-4" />
                        Connect
                      </Button>
                    )}
                  </div>
                </section>
              );
            })}
          </div>

          <section className="flex flex-col gap-3">
            <div>
              <p className="text-lg font-semibold text-foreground">Connected accounts</p>
              <p className="text-sm text-muted">Active credentials saved for your user.</p>
            </div>

            <Table aria-label="Connected integrations">
              <Table.ScrollContainer>
                <Table.Content>
                  <Table.Header>
                    <Table.Column isRowHeader>Provider</Table.Column>
                    <Table.Column>Model</Table.Column>
                    <Table.Column>API Key</Table.Column>
                    <Table.Column>Status</Table.Column>
                    <Table.Column>Updated</Table.Column>
                  </Table.Header>
                  <Table.Body items={userIntegrations}>
                    {(item) => {
                      const integration = integrations.find(
                        (entry) => entry.type === item.integration_type,
                      );

                      return (
                        <Table.Row id={item.id}>
                          <Table.Cell>{integration?.name ?? item.integration_type}</Table.Cell>
                          <Table.Cell>
                            {getModelLabel(integration, item.computer_use_model)}
                          </Table.Cell>
                          <Table.Cell>{item.api_key_masked}</Table.Cell>
                          <Table.Cell>
                            <Chip size="sm" variant={item.is_active ? "primary" : "secondary"}>
                              {item.is_active ? "Active" : "Inactive"}
                            </Chip>
                          </Table.Cell>
                          <Table.Cell>{formatDate(item.updated_at)}</Table.Cell>
                        </Table.Row>
                      );
                    }}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          </section>
        </>
      )}

      <Modal state={connectModal}>
        <Modal.Backdrop isDismissable={!connectIntegration.isPending}>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>
                  Connect {selectedIntegration?.name ?? "integration"}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                {selectedIntegration ? (
                  <IntegrationConnectForm
                    integration={selectedIntegration}
                    isPending={connectIntegration.isPending}
                    onSubmit={handleConnect}
                    onCancel={() => {
                      connectModal.close();
                      setSelectedIntegration(null);
                    }}
                  />
                ) : null}
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <ConfirmationDialog
        state={disconnectConfirm}
        title="Disconnect integration?"
        description="Scraper generation will stop working until you connect this provider again."
        confirmLabel="Disconnect"
        onConfirm={async () => {
          if (!disconnectIntegrationId) return;
          await disconnectIntegration.mutateAsync(disconnectIntegrationId);
          setDisconnectIntegrationId(null);
        }}
        isPending={disconnectIntegration.isPending}
      />
    </div>
  );
}
