import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, Label, Input, TextArea, FieldError, Select, ListBox } from "@heroui/react";
import { ActionButtonWithPending } from "@/components/ui/action-button-with-pending";
import { CrawlIntervalField } from "@/components/ui/crawl-interval-field";
import { useWebsiteTargets } from "@/features/website-targets/hooks/use-website-targets";
import {
  createScraperFormSchema,
  type CreateScraperFormValues,
} from "@/features/scrapers/validation-schemas/scrapers.schema";

interface ScraperFormProps {
  defaultWebsiteTargetId?: string;
  submitLabel: string;
  isPending: boolean;
  onSubmit: (values: CreateScraperFormValues) => void;
  onCancel?: () => void;
}

export function ScraperForm({
  defaultWebsiteTargetId,
  submitLabel,
  isPending,
  onSubmit,
  onCancel,
}: ScraperFormProps) {
  const { data: websiteTargetsData } = useWebsiteTargets({ limit: 100 });
  const websiteTargets = websiteTargetsData?.data ?? [];

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateScraperFormValues>({
    resolver: zodResolver(createScraperFormSchema),
    defaultValues: {
      website_target_id: defaultWebsiteTargetId ?? "",
      name: "",
      schedule_cron: null,
      config: "",
    },
  });

  return (
    <Form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
      <div className="flex flex-col gap-1">
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
        {errors.website_target_id && <FieldError>{errors.website_target_id.message}</FieldError>}
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="scraper-name">Name</Label>
        <Input id="scraper-name" {...register("name")} placeholder="Example scraper" fullWidth />
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

      <div className="flex flex-col gap-1">
        <Label htmlFor="scraper-config">Config (JSON, optional)</Label>
        <TextArea
          id="scraper-config"
          {...register("config")}
          placeholder='{"start_url": "https://..."}'
          rows={8}
          className="font-mono text-xs"
          fullWidth
        />
        {errors.config && <FieldError>{errors.config.message}</FieldError>}
      </div>

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
