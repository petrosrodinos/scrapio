import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Chip,
  Form,
  Label,
  Input,
  FieldError,
  Modal,
  Switch,
  useOverlayState,
} from "@heroui/react";
import { KeyRound, Pencil, Trash2 } from "lucide-react";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { ActionButtonWithPending } from "@/components/ui/action-button-with-pending";
import { CreateApiKeyForm } from "./components/create-api-key-form";
import { RevealApiKeyModal } from "./components/reveal-api-key-modal";
import {
  useApiKeys,
  useCreateApiKey,
  useUpdateApiKey,
  useRevokeApiKey,
} from "@/features/api-keys/hooks/use-api-keys";
import type { ApiKey } from "@/features/api-keys/interfaces/api-keys.interfaces";
import type { CreateApiKeyFormValues } from "@/features/api-keys/validation-schemas/api-keys.schema";
import {
  renameApiKeySchema,
  type RenameApiKeyFormValues,
} from "@/features/api-keys/validation-schemas/api-keys.schema";

function getStatus(key: ApiKey): {
  label: string;
  variant: "primary" | "secondary" | "soft";
  color?: "danger";
} {
  if (key.revoked_at) return { label: "Revoked", variant: "secondary" };
  if (key.expires_at && new Date(key.expires_at) < new Date()) {
    return { label: "Expired", variant: "soft", color: "danger" };
  }
  if (!key.is_active) return { label: "Disabled", variant: "secondary" };
  return { label: "Active", variant: "primary" };
}

function formatDate(value: string | null): string {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
}

function RenameApiKeyForm({
  apiKey,
  isPending,
  onSubmit,
  onCancel,
}: {
  apiKey: ApiKey;
  isPending: boolean;
  onSubmit: (values: RenameApiKeyFormValues) => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RenameApiKeyFormValues>({
    resolver: zodResolver(renameApiKeySchema) as Resolver<RenameApiKeyFormValues>,
    defaultValues: { name: apiKey.name },
  });

  return (
    <Form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="rename-api-key-name">Name</Label>
        <Input id="rename-api-key-name" {...register("name")} disabled={isPending} fullWidth />
        {errors.name && <FieldError>{errors.name.message}</FieldError>}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <ActionButtonWithPending type="button" variant="secondary" onPress={onCancel}>
          Cancel
        </ActionButtonWithPending>
        <ActionButtonWithPending type="submit" isPending={isPending}>
          Save
        </ActionButtonWithPending>
      </div>
    </Form>
  );
}

export default function ApiKeysPage() {
  const createModal = useOverlayState();
  const revealModal = useOverlayState();
  const renameModal = useOverlayState();
  const revokeConfirm = useOverlayState();

  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [renamingKey, setRenamingKey] = useState<ApiKey | null>(null);
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);

  const { data: apiKeys = [], isPending } = useApiKeys();
  const createApiKey = useCreateApiKey();
  const updateApiKey = useUpdateApiKey();
  const revokeApiKey = useRevokeApiKey();

  const handleCreate = async (values: CreateApiKeyFormValues) => {
    const created = await createApiKey.mutateAsync({
      name: values.name,
      ...(values.expires_at ? { expires_at: values.expires_at } : {}),
    });
    createModal.close();
    setRevealedKey(created.api_key);
    revealModal.open();
  };

  const handleRename = async (values: RenameApiKeyFormValues) => {
    if (!renamingKey) return;
    await updateApiKey.mutateAsync({ id: renamingKey.id, payload: values });
    renameModal.close();
    setRenamingKey(null);
  };

  const handleToggleActive = (key: ApiKey, isActive: boolean) => {
    updateApiKey.mutate({ id: key.id, payload: { is_active: isActive } });
  };

  return (
    <div className="flex flex-col gap-6 min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold tracking-tight text-foreground">API Keys</p>
          <p className="text-sm text-muted">
            Generate keys for programmatic access to your account. Each key grants full account
            access — treat it like a password.
          </p>
        </div>
        <Button variant="primary" onPress={createModal.open}>
          <KeyRound className="h-4 w-4" />
          Generate key
        </Button>
      </div>

      {isPending ? (
        <TableSkeleton rows={3} columns={4} />
      ) : apiKeys.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted">
          No API keys yet. Generate one to access your account programmatically.
        </div>
      ) : (
        <div className="flex flex-col gap-3 min-w-0">
          {apiKeys.map((key) => {
            const status = getStatus(key);
            const isRevoked = Boolean(key.revoked_at);

            return (
              <section
                key={key.id}
                className="min-w-0 overflow-hidden rounded-xl border border-border bg-surface p-4 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1 flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">{key.name}</p>
                    <Chip size="sm" variant={status.variant} color={status.color}>
                      {status.label}
                    </Chip>
                  </div>
                  <p className="font-mono text-xs text-muted">{key.key_prefix}…</p>
                  <p className="text-xs text-muted">
                    Created {formatDate(key.created_at)} · Last used{" "}
                    {formatDate(key.last_used_at)}
                    {key.expires_at ? ` · Expires ${formatDate(key.expires_at)}` : ""}
                  </p>
                </div>

                {!isRevoked ? (
                  <div className="flex shrink-0 items-center gap-3">
                    <Switch
                      isSelected={key.is_active}
                      isDisabled={updateApiKey.isPending}
                      onChange={(isSelected) => handleToggleActive(key, isSelected)}
                    >
                      <Switch.Control>
                        <Switch.Thumb />
                      </Switch.Control>
                      <Switch.Content>Enabled</Switch.Content>
                    </Switch>
                    <Button
                      variant="secondary"
                      onPress={() => {
                        setRenamingKey(key);
                        renameModal.open();
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                      Rename
                    </Button>
                    <Button
                      variant="danger-soft"
                      onPress={() => {
                        setRevokingKeyId(key.id);
                        revokeConfirm.open();
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Revoke
                    </Button>
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}

      <Modal state={createModal}>
        <Modal.Backdrop isDismissable={!createApiKey.isPending}>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Generate API key</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <CreateApiKeyForm
                  isPending={createApiKey.isPending}
                  onSubmit={handleCreate}
                  onCancel={createModal.close}
                />
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <RevealApiKeyModal
        state={revealModal}
        apiKey={revealedKey}
        onClose={() => {
          revealModal.close();
          setRevealedKey(null);
        }}
      />

      <Modal state={renameModal}>
        <Modal.Backdrop isDismissable={!updateApiKey.isPending}>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Rename API key</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                {renamingKey ? (
                  <RenameApiKeyForm
                    key={renamingKey.id}
                    apiKey={renamingKey}
                    isPending={updateApiKey.isPending}
                    onSubmit={handleRename}
                    onCancel={() => {
                      renameModal.close();
                      setRenamingKey(null);
                    }}
                  />
                ) : null}
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <ConfirmationDialog
        state={revokeConfirm}
        title="Revoke API key?"
        description="Anything using this key will immediately lose access. This cannot be undone."
        confirmLabel="Revoke"
        onConfirm={async () => {
          if (!revokingKeyId) return;
          await revokeApiKey.mutateAsync(revokingKeyId);
          setRevokingKeyId(null);
        }}
        isPending={revokeApiKey.isPending}
      />
    </div>
  );
}
