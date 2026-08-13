import { Controller, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, Label, Input, FieldError } from "@heroui/react";
import { ActionButtonWithPending } from "@/components/ui/action-button-with-pending";
import { DatePickerField } from "@/components/ui/date-picker-field";
import {
  createApiKeySchema,
  type CreateApiKeyFormValues,
} from "@/features/api-keys/validation-schemas/api-keys.schema";

interface CreateApiKeyFormProps {
  isPending: boolean;
  onSubmit: (values: CreateApiKeyFormValues) => void;
  onCancel?: () => void;
}

export function CreateApiKeyForm({ isPending, onSubmit, onCancel }: CreateApiKeyFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateApiKeyFormValues>({
    resolver: zodResolver(createApiKeySchema) as Resolver<CreateApiKeyFormValues>,
    defaultValues: { name: "", expires_at: "" },
  });

  return (
    <Form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="api-key-name">Name</Label>
        <Input
          id="api-key-name"
          {...register("name")}
          placeholder="e.g. CI pipeline"
          disabled={isPending}
          fullWidth
        />
        {errors.name && <FieldError>{errors.name.message}</FieldError>}
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="api-key-expires-at">Expires (optional)</Label>
        <Controller
          name="expires_at"
          control={control}
          render={({ field }) => (
            <DatePickerField
              aria-label="Expires"
              value={field.value ?? ""}
              onChange={field.onChange}
            />
          )}
        />
        {errors.expires_at && <FieldError>{errors.expires_at.message}</FieldError>}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel ? (
          <ActionButtonWithPending type="button" variant="secondary" onPress={onCancel}>
            Cancel
          </ActionButtonWithPending>
        ) : null}
        <ActionButtonWithPending type="submit" isPending={isPending}>
          Generate key
        </ActionButtonWithPending>
      </div>
    </Form>
  );
}
