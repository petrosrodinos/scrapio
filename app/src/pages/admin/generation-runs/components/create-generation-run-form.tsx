import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, Label, TextArea, Input, FieldError, Select, ListBox } from "@heroui/react";
import { ActionButtonWithPending } from "@/components/ui/action-button-with-pending";
import { useWebsiteTargets } from "@/features/website-targets/hooks/use-website-targets";
import {
  createGenerationRunFormSchema,
  type CreateGenerationRunFormValues,
} from "@/features/scraper-generation/validation-schemas/scraper-generation.schema";

interface CreateGenerationRunFormProps {
  defaultWebsiteTargetId?: string;
  defaultWebsiteTargetName?: string;
  lockWebsiteTarget?: boolean;
  defaultScraperId?: string;
  submitLabel?: string;
  isPending: boolean;
  onSubmit: (values: CreateGenerationRunFormValues) => void;
  onCancel?: () => void;
}

export function CreateGenerationRunForm({
  defaultWebsiteTargetId,
  defaultWebsiteTargetName,
  lockWebsiteTarget = false,
  defaultScraperId,
  submitLabel = "Generate",
  isPending,
  onSubmit,
  onCancel,
}: CreateGenerationRunFormProps) {
  const { data: websiteTargetsData } = useWebsiteTargets(
    { limit: 100 },
    { enabled: !lockWebsiteTarget },
  );
  const websiteTargets = websiteTargetsData?.data ?? [];

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateGenerationRunFormValues>({
    resolver: zodResolver(createGenerationRunFormSchema) as Resolver<CreateGenerationRunFormValues>,
    defaultValues: {
      website_target_id: defaultWebsiteTargetId ?? "",
      scraper_id: defaultScraperId,
      prompt: "",
      max_steps: undefined,
    },
  });

  return (
    <Form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
      <div className="flex flex-col gap-1">
        {lockWebsiteTarget ? (
          <>
            <Label htmlFor="generation-website-target">Website target</Label>
            <div
              id="generation-website-target"
              className="rounded-lg border border-border bg-surface-secondary px-3 py-2 text-sm text-muted"
            >
              {defaultWebsiteTargetName ?? defaultWebsiteTargetId}
            </div>
          </>
        ) : (
          <Controller
            name="website_target_id"
            control={control}
            render={({ field }) => (
              <Select
                placeholder="Select a website target"
                selectedKey={field.value}
                onSelectionChange={(key) => field.onChange(key as string)}
              >
                <Label>Website target</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {websiteTargets.map((websiteTarget) => (
                      <ListBox.Item key={websiteTarget.id} id={websiteTarget.id}>
                        {websiteTarget.name}
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            )}
          />
        )}
        {errors.website_target_id && <FieldError>{errors.website_target_id.message}</FieldError>}
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="generation-max-steps">Max steps (optional)</Label>
        <Input
          id="generation-max-steps"
          type="number"
          min={1}
          {...register("max_steps")}
          placeholder="Unlimited"
          fullWidth
        />
        {errors.max_steps && <FieldError>{errors.max_steps.message}</FieldError>}
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="generation-prompt">Prompt (optional)</Label>
        <TextArea
          id="generation-prompt"
          {...register("prompt")}
          placeholder="Any extra instructions for the AI (e.g. focus on the rentals page)"
          rows={4}
          fullWidth
        />
        {errors.prompt && <FieldError>{errors.prompt.message}</FieldError>}
      </div>

      <div className="flex justify-end gap-2 mt-2">
        {onCancel && (
          <ActionButtonWithPending
            type="button"
            variant="secondary"
            isDisabled={isPending}
            onPress={onCancel}
          >
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
