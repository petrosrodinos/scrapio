import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, Label, Input, FieldError, Select, ListBox } from "@heroui/react";
import { ActionButtonWithPending } from "@/components/ui/action-button-with-pending";
import { CrawlIntervalField } from "@/components/ui/crawl-interval-field";
import { useWebsiteTargets } from "@/features/website-targets/hooks/use-website-targets";
import {
  createScraperFormSchema,
  type CreateScraperFormValues,
} from "@/features/scrapers/validation-schemas/scrapers.schema";

function defaultScraperName(websiteTargetName: string): string {
  return `${websiteTargetName} - Scraper`;
}

interface ScraperFormProps {
  websiteTargetId?: string;
  websiteTargetName?: string;
  submitLabel: string;
  isPending: boolean;
  onSubmit: (values: CreateScraperFormValues) => void;
  onCancel?: () => void;
}

export function ScraperForm({
  websiteTargetId,
  websiteTargetName,
  submitLabel,
  isPending,
  onSubmit,
  onCancel,
}: ScraperFormProps) {
  const lockedTargetId = websiteTargetId?.trim() || undefined;
  const { data: websiteTargetsData } = useWebsiteTargets(
    { limit: 100 },
    { enabled: !lockedTargetId },
  );
  const websiteTargets = websiteTargetsData?.data ?? [];

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<CreateScraperFormValues>({
    resolver: zodResolver(createScraperFormSchema),
    defaultValues: {
      website_target_id: lockedTargetId ?? "",
      name: websiteTargetName?.trim()
        ? defaultScraperName(websiteTargetName.trim())
        : "",
      schedule_cron: null,
    },
  });

  return (
    <Form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
      {!lockedTargetId ? (
        <div className="flex flex-col gap-1">
          <Controller
            name="website_target_id"
            control={control}
            render={({ field }) => (
              <Select
                placeholder="Select a website target"
                selectedKey={field.value}
                onSelectionChange={(key) => {
                  const nextId = key as string;
                  field.onChange(nextId);
                  const selected = websiteTargets.find((target) => target.id === nextId);
                  if (!selected) return;
                  const currentName = getValues("name").trim();
                  const isBlankOrDefault =
                    !currentName || currentName.endsWith(" - Scraper");
                  if (isBlankOrDefault) {
                    setValue("name", defaultScraperName(selected.name), {
                      shouldDirty: true,
                    });
                  }
                }}
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
          {errors.website_target_id && (
            <FieldError>{errors.website_target_id.message}</FieldError>
          )}
        </div>
      ) : (
        <input type="hidden" {...register("website_target_id")} />
      )}

      <div className="flex flex-col gap-1">
        <Label htmlFor="scraper-name">Name</Label>
        <Input id="scraper-name" {...register("name")} placeholder="Example - Scraper" fullWidth />
        {errors.name && <FieldError>{errors.name.message}</FieldError>}
      </div>

      <Controller
        name="schedule_cron"
        control={control}
        render={({ field }) => (
          <CrawlIntervalField
            value={field.value}
            disabled={isPending}
            onChange={field.onChange}
          />
        )}
      />
      {errors.schedule_cron && <FieldError>{errors.schedule_cron.message}</FieldError>}

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
