import { Controller, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, Label, FieldError, Select, ListBox } from "@heroui/react";
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
      computer_use_model: integration.models[0]?.value,
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

      {integration.models.length > 0 ? (
        <Controller
          name="computer_use_model"
          control={control}
          render={({ field }) => (
            <div className="flex flex-col gap-1">
              <Select
                selectedKey={field.value}
                onSelectionChange={(key) => field.onChange(String(key))}
                isDisabled={isPending}
              >
                <Label>Computer use model</Label>
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox items={integration.models}>
                    {(model) => (
                      <ListBox.Item id={model.value} textValue={model.label}>
                        {model.label}
                      </ListBox.Item>
                    )}
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
