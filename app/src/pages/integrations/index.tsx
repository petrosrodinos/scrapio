import { useMemo, useState } from "react";
import {
  Button,
  Chip,
  Modal,
  useOverlayState,
} from "@heroui/react";
import { Pencil, Plug, Unplug } from "lucide-react";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { IntegrationConnectForm } from "./components/integration-connect-form";
import { IntegrationEditForm } from "./components/integration-edit-form";
import { CrawlScheduleTimezonePanel } from "./components/crawl-schedule-timezone-panel";
import { useIntegrations } from "@/features/integrations/hooks/use-integrations";
import type { Integration } from "@/features/integrations/interfaces/integrations.interfaces";
import type { UserIntegration } from "@/features/user-integrations/interfaces/user-integrations.interfaces";
import {
  useConnectUserIntegration,
  useDisconnectUserIntegration,
  useUpdateUserIntegration,
  useUserIntegrations,
} from "@/features/user-integrations/hooks/use-user-integrations";
import type {
  ConnectUserIntegrationFormValues,
  UpdateUserIntegrationFormValues,
} from "@/features/user-integrations/validation-schemas/user-integrations.schema";
import { getIntegrationTypeDescription } from "@/config/constants/dropdowns/integrations/integration-type-description.options";

function getModelLabel(integration: Integration | undefined, modelValue: string | null) {
  if (!integration || !modelValue) return null;
  return (
    integration.computer_use_models?.find((model) => model.value === modelValue)?.label ??
    integration.ai_models?.find((model) => model.value === modelValue)?.label ??
    modelValue
  );
}

function getRequirementCopy(integration: Integration) {
  const needsComputerUse = (integration.computer_use_models?.length ?? 0) > 0;
  const needsAi = (integration.ai_models?.length ?? 0) > 0;

  if (needsComputerUse && needsAi) {
    return "Requires API key, computer use model, and AI model.";
  }
  if (needsComputerUse) {
    return "Requires API key and a computer use model.";
  }
  if (needsAi) {
    return "Requires API key and an AI model.";
  }
  return "Requires an API key.";
}

export default function IntegrationsPage() {
  const connectModal = useOverlayState();
  const editModal = useOverlayState();
  const disconnectConfirm = useOverlayState();

  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [editingConnection, setEditingConnection] = useState<{
    integration: Integration;
    userIntegration: UserIntegration;
  } | null>(null);
  const [disconnectIntegrationId, setDisconnectIntegrationId] = useState<string | null>(null);

  const { data: integrations = [], isPending: integrationsPending } = useIntegrations();
  const { data: userIntegrationsData, isPending: userIntegrationsPending } = useUserIntegrations({
    page: 1,
    limit: 50,
  });
  const connectIntegration = useConnectUserIntegration();
  const updateIntegration = useUpdateUserIntegration();
  const disconnectIntegration = useDisconnectUserIntegration();

  const connectedByType = useMemo(() => {
    const map = new Map<string, UserIntegration>();
    for (const item of userIntegrationsData?.data ?? []) {
      map.set(item.integration_type, item);
    }
    return map;
  }, [userIntegrationsData?.data]);

  const isPending = integrationsPending || userIntegrationsPending;

  const openConnectModal = (integration: Integration) => {
    setSelectedIntegration(integration);
    connectModal.open();
  };

  const openEditModal = (integration: Integration, userIntegration: UserIntegration) => {
    setEditingConnection({ integration, userIntegration });
    editModal.open();
  };

  const handleConnect = async (values: ConnectUserIntegrationFormValues) => {
    await connectIntegration.mutateAsync(values);
    connectModal.close();
    setSelectedIntegration(null);
  };

  const handleEdit = async (values: UpdateUserIntegrationFormValues) => {
    if (!editingConnection) return;

    const payload = {
      ...(values.api_key ? { api_key: values.api_key } : {}),
      ...(values.computer_use_model
        ? { computer_use_model: values.computer_use_model }
        : {}),
      ...(values.ai_model ? { ai_model: values.ai_model } : {}),
    };

    await updateIntegration.mutateAsync({
      id: editingConnection.userIntegration.id,
      payload,
    });
    editModal.close();
    setEditingConnection(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-2xl font-semibold tracking-tight text-foreground">Integrations</p>
        <p className="text-sm text-muted">
          Connect provider API keys. Anthropic computer use powers scraper generation; AI models
          power normalization and other AI features.
        </p>
      </div>

      <CrawlScheduleTimezonePanel />

      {isPending ? (
        <TableSkeleton rows={4} columns={4} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {integrations.map((integration) => {
            const connected = connectedByType.get(integration.type);
            const computerUseLabel = getModelLabel(
              integration,
              connected?.computer_use_model ?? null,
            );
            const aiLabel = getModelLabel(integration, connected?.ai_model ?? null);

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

                <p className="text-sm text-muted">
                  {getIntegrationTypeDescription(integration.type)}
                </p>

                {connected ? (
                  <div className="text-sm text-muted flex flex-col gap-1">
                    <span>Key: {connected.api_key_masked}</span>
                    {computerUseLabel ? <span>Computer use: {computerUseLabel}</span> : null}
                    {aiLabel ? <span>AI model: {aiLabel}</span> : null}
                  </div>
                ) : (
                  <p className="text-sm text-muted">{getRequirementCopy(integration)}</p>
                )}

                <div className="mt-auto flex flex-wrap gap-2">
                  {connected ? (
                    <>
                      <Button
                        variant="secondary"
                        onPress={() => openEditModal(integration, connected)}
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
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
                    </>
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

      <Modal state={editModal}>
        <Modal.Backdrop isDismissable={!updateIntegration.isPending}>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>
                  Edit {editingConnection?.integration.name ?? "integration"}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                {editingConnection ? (
                  <IntegrationEditForm
                    key={editingConnection.userIntegration.id}
                    integration={editingConnection.integration}
                    userIntegration={editingConnection.userIntegration}
                    isPending={updateIntegration.isPending}
                    onSubmit={handleEdit}
                    onCancel={() => {
                      editModal.close();
                      setEditingConnection(null);
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
