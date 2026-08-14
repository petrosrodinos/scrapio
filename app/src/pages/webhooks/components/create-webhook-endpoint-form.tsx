import { Controller, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, Label, Input, FieldError } from "@heroui/react";
import { ActionButtonWithPending } from "@/components/ui/action-button-with-pending";
import {
  createWebhookEndpointSchema,
  type CreateWebhookEndpointFormValues,
} from "@/features/webhooks/validation-schemas/webhooks.schema";
import type {
  WebhookEventCatalogEntry,
  WebhookEventType,
} from "@/features/webhooks/interfaces/webhooks.interfaces";
import { EventCatalogPicker } from "./event-catalog-picker";

interface CreateWebhookEndpointFormProps {
  catalog: WebhookEventCatalogEntry[];
  isPending: boolean;
  onSubmit: (values: CreateWebhookEndpointFormValues) => void;
  onCancel?: () => void;
}

export function CreateWebhookEndpointForm({
  catalog,
  isPending,
  onSubmit,
  onCancel,
}: CreateWebhookEndpointFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateWebhookEndpointFormValues>({
    resolver: zodResolver(createWebhookEndpointSchema) as Resolver<CreateWebhookEndpointFormValues>,
    defaultValues: { name: "", url: "", secret: "", subscribed_events: [] },
  });

  return (
    <Form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="webhook-name">Name (optional)</Label>
        <Input
          id="webhook-name"
          {...register("name")}
          placeholder="e.g. Production pipeline"
          disabled={isPending}
          fullWidth
        />
        {errors.name && <FieldError>{errors.name.message}</FieldError>}
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="webhook-url">Endpoint URL</Label>
        <Input
          id="webhook-url"
          {...register("url")}
          placeholder="https://example.com/webhooks/scrapio"
          disabled={isPending}
          fullWidth
        />
        {errors.url && <FieldError>{errors.url.message}</FieldError>}
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="webhook-secret">Signing secret</Label>
        <Input
          id="webhook-secret"
          {...register("secret")}
          placeholder="A secret only you know, at least 16 characters"
          disabled={isPending}
          fullWidth
        />
        <span className="text-xs text-muted">
          Every request we send is signed with this secret (HMAC-SHA256) so you can verify it
          came from us. Store it somewhere safe — we don&apos;t display it again.
        </span>
        {errors.secret && <FieldError>{errors.secret.message}</FieldError>}
      </div>

      <Controller
        name="subscribed_events"
        control={control}
        render={({ field }) => (
          <EventCatalogPicker
            catalog={catalog}
            value={field.value as WebhookEventType[]}
            onChange={field.onChange}
            isDisabled={isPending}
            error={errors.subscribed_events?.message}
          />
        )}
      />

      <div className="flex justify-end gap-2 pt-2">
        {onCancel ? (
          <ActionButtonWithPending type="button" variant="secondary" onPress={onCancel}>
            Cancel
          </ActionButtonWithPending>
        ) : null}
        <ActionButtonWithPending type="submit" isPending={isPending}>
          Create webhook
        </ActionButtonWithPending>
      </div>
    </Form>
  );
}
