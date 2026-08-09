import { Controller, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, Label, FieldError, Select, ListBox } from "@heroui/react";
import { ActionButtonWithPending } from "@/components/ui/action-button-with-pending";
import { PasswordInput } from "@/components/ui/password-input";
import type { Integration } from "@/features/integrations/interfaces/integrations.interfaces";
import type { UserIntegration } from "@/features/user-integrations/interfaces/user-integrations.interfaces";
import {
  updateUserIntegrationSchema,
  type UpdateUserIntegrationFormValues,
} from "@/features/user-integrations/validation-schemas/user-integrations.schema";

interface IntegrationEditFormProps {
  integration: Integration;
  userIntegration: UserIntegration;
  isPending: boolean;
  onSubmit: (values: UpdateUserIntegrationFormValues) => void;
  onCancel?: () => void;
}

export function IntegrationEditForm({
  integration,
  userIntegration,
  isPending,
  onSubmit,
  onCancel,
}: IntegrationEditFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateUserIntegrationFormValues>({
    resolver: zodResolver(updateUserIntegrationSchema) as Resolver<UpdateUserIntegrationFormValues>,
    defaultValues: {
      api_key: "",
      computer_use_model:
        userIntegration.computer_use_model ?? integration.computer_use_models?.[0]?.value,
      ai_model: userIntegration.ai_model ?? integration.ai_models?.[0]?.value,
    },
  });

  return (
    <Form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="integration-edit-api-key">API Key</Label>
        <PasswordInput
          id="integration-edit-api-key"
          {...register("api_key")}
          placeholder={`Leave blank to keep ${userIntegration.api_key_masked}`}
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

      {integration.ai_models?.length ? (
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

      <div className="flex justify-end gap-2 pt-2">
        {onCancel ? (
          <ActionButtonWithPending type="button" variant="secondary" onPress={onCancel}>
            Cancel
          </ActionButtonWithPending>
        ) : null}
        <ActionButtonWithPending type="submit" isPending={isPending}>
          Save changes
        </ActionButtonWithPending>
      </div>
    </Form>
  );
}
