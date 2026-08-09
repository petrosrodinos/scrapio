import { Controller, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Checkbox, Form, Label, FieldError, Select, ListBox } from "@heroui/react";
import { ActionButtonWithPending } from "@/components/ui/action-button-with-pending";
import { PasswordInput } from "@/components/ui/password-input";
import type { Integration } from "@/features/integrations/interfaces/integrations.interfaces";
import {
  connectUserIntegrationSchema,
  type ConnectUserIntegrationFormValues,
} from "@/features/user-integrations/validation-schemas/user-integrations.schema";

interface IntegrationConnectFormProps {
  integration: Integration;
  isPending: boolean;
  onSubmit: (values: ConnectUserIntegrationFormValues) => void;
  onCancel?: () => void;
}

export function IntegrationConnectForm({
  integration,
  isPending,
  onSubmit,
  onCancel,
}: IntegrationConnectFormProps) {
  const supportsAiModel = (integration.ai_models?.length ?? 0) > 0;
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ConnectUserIntegrationFormValues>({
    resolver: zodResolver(connectUserIntegrationSchema) as Resolver<ConnectUserIntegrationFormValues>,
    defaultValues: {
      integration_type: integration.type,
      api_key: "",
      computer_use_model: integration.computer_use_models?.[0]?.value,
      ai_model: integration.ai_models?.[0]?.value,
      is_default: supportsAiModel,
    },
  });

  return (
    <Form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
      <input type="hidden" {...register("integration_type")} />

      <div className="flex flex-col gap-1">
        <Label htmlFor="integration-api-key">API Key</Label>
        <PasswordInput
          id="integration-api-key"
          {...register("api_key")}
          placeholder="Paste your API key"
          disabled={isPending}
        />
        {errors.api_key && <FieldError>{errors.api_key.message}</FieldError>}
      </div>

      {integration.computer_use_models?.length ? (
        <Controller
          name="computer_use_model"
          control={control}
          render={({ field }) => (
            <div className="flex flex-col gap-1">
              <Select
                selectedKey={field.value ?? undefined}
                onSelectionChange={(key) => {
                  if (key != null) field.onChange(String(key));
                }}
                isDisabled={isPending}
              >
                <Label>Computer use model</Label>
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {(integration.computer_use_models ?? []).map((model) => (
                      <ListBox.Item key={model.value} id={model.value} textValue={model.label}>
                        {model.label}
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
              {errors.computer_use_model && (
                <FieldError>{errors.computer_use_model.message}</FieldError>
              )}
            </div>
          )}
        />
      ) : null}

      {supportsAiModel ? (
        <Controller
          name="ai_model"
          control={control}
          render={({ field }) => (
            <div className="flex flex-col gap-1">
              <Select
                selectedKey={field.value ?? undefined}
                onSelectionChange={(key) => {
                  if (key != null) field.onChange(String(key));
                }}
                isDisabled={isPending}
              >
                <Label>AI model</Label>
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {(integration.ai_models ?? []).map((model) => (
                      <ListBox.Item key={model.value} id={model.value} textValue={model.label}>
                        {model.label}
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
              {errors.ai_model && <FieldError>{errors.ai_model.message}</FieldError>}
            </div>
          )}
        />
      ) : null}

      {supportsAiModel ? (
        <Controller
          name="is_default"
          control={control}
          render={({ field }) => (
            <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm text-foreground">Default AI</span>
                <span className="text-xs text-muted">
                  Used for normalisation and other AI functionality.
                </span>
              </div>
              <Checkbox
                aria-label="Default AI"
                isSelected={Boolean(field.value)}
                isDisabled={isPending}
                onChange={field.onChange}
              >
                <Checkbox.Control className="size-6">
                  <Checkbox.Indicator className="size-4" />
                </Checkbox.Control>
              </Checkbox>
            </div>
          )}
        />
      ) : null}

      <div className="flex justify-end gap-2 pt-2">
        {onCancel ? (
          <ActionButtonWithPending type="button" variant="secondary" onPress={onCancel}>
            Cancel
          </ActionButtonWithPending>
        ) : null}
        <ActionButtonWithPending type="submit" isPending={isPending}>
          Connect
        </ActionButtonWithPending>
      </div>
    </Form>
  );
}
