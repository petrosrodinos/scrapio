import { useEffect, useMemo, useState } from "react";
import { Label, Select, ListBox } from "@heroui/react";
import { ActionButtonWithPending } from "@/components/ui/action-button-with-pending";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useIntegrations } from "@/features/integrations/hooks/use-integrations";
import { IntegrationTypes } from "@/features/integrations/interfaces/integrations.interfaces";
import {
  useCurrentUserProfile,
  useUpdateCurrentUserProfile,
} from "@/features/user/hooks/use-user-profile";
import { useUserIntegrations } from "@/features/user-integrations/hooks/use-user-integrations";

const AI_INTEGRATION_TYPES = new Set([
  IntegrationTypes.OPENAI,
  IntegrationTypes.GEMINI,
  IntegrationTypes.DEEPSEEK,
]);

export function DefaultAiModelPanel() {
  const { data: profile, isPending: profilePending } = useCurrentUserProfile();
  const { data: integrations = [], isPending: integrationsPending } = useIntegrations();
  const { data: userIntegrationsData, isPending: userIntegrationsPending } =
    useUserIntegrations({ page: 1, limit: 50 });
  const updateProfile = useUpdateCurrentUserProfile();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const options = useMemo(() => {
    const catalogByType = new Map(integrations.map((item) => [item.type, item]));
    return (userIntegrationsData?.data ?? [])
      .filter(
        (item) =>
          item.is_active &&
          item.ai_model &&
          AI_INTEGRATION_TYPES.has(item.integration_type),
      )
      .map((item) => {
        const catalog = catalogByType.get(item.integration_type);
        const modelLabel =
          catalog?.ai_models.find((model) => model.value === item.ai_model)?.label ??
          item.ai_model;
        const providerName = catalog?.name ?? item.integration_type;
        return {
          id: item.id,
          label: `${providerName} — ${modelLabel}`,
        };
      });
  }, [integrations, userIntegrationsData?.data]);

  useEffect(() => {
    if (profile?.default_ai_user_integration_id) {
      setSelectedId(profile.default_ai_user_integration_id);
      return;
    }
    if (options.length > 0) {
      setSelectedId(options[0].id);
    } else {
      setSelectedId(null);
    }
  }, [profile?.default_ai_user_integration_id, options]);

  const isPending = profilePending || integrationsPending || userIntegrationsPending;
  const hasOptions = options.length > 0;
  const hasChanges =
    !!profile &&
    !!selectedId &&
    selectedId !== profile.default_ai_user_integration_id;

  if (isPending) {
    return <TableSkeleton rows={2} columns={2} />;
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
      <div>
        <p className="text-base font-semibold text-foreground">Default AI model</p>
        <p className="text-sm text-muted">
          Used for normalisation and other AI functionality across your scrapers.
        </p>
      </div>

      <div className="flex flex-col gap-1 max-w-md">
        <Select
          selectedKey={selectedId ?? undefined}
          onSelectionChange={(key) => setSelectedId(String(key))}
          isDisabled={!hasOptions || updateProfile.isPending}
        >
          <Label>AI connection</Label>
          <Select.Trigger>
            <Select.Value />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {options.map((option) => (
                <ListBox.Item key={option.id} id={option.id} textValue={option.label}>
                  {option.label}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
        {!hasOptions ? (
          <p className="text-sm text-muted">
            Connect OpenAI, Gemini, or DeepSeek with an AI model to set a default.
          </p>
        ) : null}
      </div>

      <div>
        <ActionButtonWithPending
          isPending={updateProfile.isPending}
          isDisabled={!hasChanges || !selectedId || !hasOptions}
          onPress={() => {
            if (!selectedId) return;
            updateProfile.mutate({ default_ai_user_integration_id: selectedId });
          }}
        >
          Save default AI model
        </ActionButtonWithPending>
      </div>
    </section>
  );
}
