import { Controller, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, Label, Input, FieldError } from "@heroui/react";
import { ActionButtonWithPending } from "@/components/ui/action-button-with-pending";
import { CrawlIntervalField } from "@/components/ui/crawl-interval-field";
import {
  websiteTargetFormSchema,
  DefaultWebsiteTargetCrawlInterval,
  type WebsiteTargetFormValues,
} from "@/features/website-targets/validation-schemas/website-targets.schema";
import { BlockRulesEditor } from "./block-rules-editor";

interface WebsiteTargetFormProps {
  defaultValues?: Partial<WebsiteTargetFormValues>;
  submitLabel: string;
  isPending: boolean;
  onSubmit: (values: WebsiteTargetFormValues) => void;
  onCancel?: () => void;
}

export function WebsiteTargetForm({
  defaultValues,
  submitLabel,
  isPending,
  onSubmit,
  onCancel,
}: WebsiteTargetFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<WebsiteTargetFormValues>({
    resolver: zodResolver(websiteTargetFormSchema) as Resolver<WebsiteTargetFormValues>,
    defaultValues: {
      name: defaultValues?.name ?? "",
      base_url: defaultValues?.base_url ?? "",
      notes: defaultValues?.notes ?? "",
      crawl_interval: defaultValues?.crawl_interval ?? DefaultWebsiteTargetCrawlInterval,
      block_handling_wait_timeout_ms:
        defaultValues?.block_handling_wait_timeout_ms ?? undefined,
      block_handling_min_ready_body_length:
        defaultValues?.block_handling_min_ready_body_length ?? undefined,
      block_rules: defaultValues?.block_rules ?? [],
    },
  });

  return (
    <Form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="website-target-name">Name</Label>
        <Input id="website-target-name" {...register("name")} placeholder="Example Store" fullWidth />
        {errors.name && <FieldError>{errors.name.message}</FieldError>}
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="website-target-base-url">Website URL</Label>
        <Input
          id="website-target-base-url"
          {...register("base_url")}
          placeholder="https://example.com"
          fullWidth
        />
        {errors.base_url && <FieldError>{errors.base_url.message}</FieldError>}
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="website-target-notes">Notes</Label>
        <Input id="website-target-notes" {...register("notes")} placeholder="Optional notes" fullWidth />
        {errors.notes && <FieldError>{errors.notes.message}</FieldError>}
      </div>

      <Controller
        name="crawl_interval"
        control={control}
        render={({ field }) => (
          <div className="flex flex-col gap-1">
            <CrawlIntervalField
              value={field.value}
              disabled={isPending}
              onChange={field.onChange}
            />
            {errors.crawl_interval && (
              <FieldError>{errors.crawl_interval.message}</FieldError>
            )}
          </div>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="website-target-wait-timeout">Wait timeout (ms, optional)</Label>
          <Input
            id="website-target-wait-timeout"
            type="number"
            min={0}
            {...register("block_handling_wait_timeout_ms")}
            placeholder="20000"
            fullWidth
          />
          {errors.block_handling_wait_timeout_ms && (
            <FieldError>{errors.block_handling_wait_timeout_ms.message}</FieldError>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="website-target-min-body">Min ready body length (optional)</Label>
          <Input
            id="website-target-min-body"
            type="number"
            min={0}
            {...register("block_handling_min_ready_body_length")}
            placeholder="80"
            fullWidth
          />
          {errors.block_handling_min_ready_body_length && (
            <FieldError>
              {errors.block_handling_min_ready_body_length.message}
            </FieldError>
          )}
        </div>
      </div>

      <Controller
        name="block_rules"
        control={control}
        render={({ field }) => (
          <BlockRulesEditor
            rules={field.value}
            onChange={field.onChange}
            isDisabled={isPending}
          />
        )}
      />
      {errors.block_rules && (
        <FieldError>
          {errors.block_rules.message ??
            errors.block_rules.root?.message ??
            "Fix invalid block rules"}
        </FieldError>
      )}

      <div className="flex justify-end gap-2 mt-2">
        {onCancel && (
          <ActionButtonWithPending type="button" variant="secondary" isDisabled={isPending} onPress={onCancel}>
            Cancel
          </ActionButtonWithPending>
        )}
        <ActionButtonWithPending type="submit" isPending={isPending} isDisabled={isPending}>
          {submitLabel}
        </ActionButtonWithPending>
      </div>
    </Form>
  );
}
