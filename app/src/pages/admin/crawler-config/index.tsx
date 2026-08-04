import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FieldError, Form, Input, Label } from "@heroui/react";
import { ActionButtonWithPending } from "@/components/ui/action-button-with-pending";
import { DetailSkeleton } from "@/components/ui/detail-skeleton";
import { usePlatformConfig, useUpdatePlatformConfig } from "@/features/platform-config/hooks/use-platform-config";
import {
  CRAWLER_CONFIG_FIELDS,
  CRAWLER_CONFIG_GROUP_ORDER,
  crawlerConfigFormSchema,
  parseOptionalConfigNumber,
  type CrawlerConfigFormValues,
} from "@/features/platform-config/validation-schemas/crawler-config-fields.schema";
import type { UpdatePlatformConfigPayload } from "@/features/platform-config/interfaces/platform-config.interfaces";

function toFormValue(value: number | null): string {
  return value === null ? "" : String(value);
}

const crawlerTuningSchema = crawlerConfigFormSchema.omit({ translation_provider: true });
type CrawlerTuningFormValues = Omit<CrawlerConfigFormValues, "translation_provider">;

export default function CrawlerConfigPage() {
  const { data, isPending } = usePlatformConfig();
  const updateConfig = useUpdatePlatformConfig();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CrawlerTuningFormValues>({
    resolver: zodResolver(crawlerTuningSchema),
    defaultValues: Object.fromEntries(CRAWLER_CONFIG_FIELDS.map((field) => [field.key, ""])),
  });

  useEffect(() => {
    if (!data) return;
    reset(
      Object.fromEntries(
        CRAWLER_CONFIG_FIELDS.map((field) => [field.key, toFormValue(data[field.key])]),
      ),
    );
  }, [data, reset]);

  const submit = (values: CrawlerTuningFormValues) => {
    const payload = Object.fromEntries(
      CRAWLER_CONFIG_FIELDS.map((field) => [
        field.key,
        parseOptionalConfigNumber(values[field.key], field.isDecimal),
      ]),
    ) as UpdatePlatformConfigPayload;

    updateConfig.mutate(payload);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-2xl font-semibold tracking-tight text-foreground">Crawler config</p>
        <p className="text-sm text-muted">
          Tunable parameters for crawl worker and Playwright pipeline behavior.
        </p>
      </div>

      {isPending || !data ? (
        <DetailSkeleton fieldCount={10} showSubTable={false} />
      ) : (
        <Form onSubmit={handleSubmit(submit)} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {CRAWLER_CONFIG_GROUP_ORDER.map((group) => {
              const fields = CRAWLER_CONFIG_FIELDS.filter((field) => field.group === group.id);

              return (
                <section
                  key={group.id}
                  className="rounded-xl border border-border bg-surface p-6 flex flex-col gap-4"
                >
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{group.label}</h2>
                    <p className="text-sm text-muted mt-1">{group.description}</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {fields.map((field) => (
                      <div key={field.key} className="flex flex-col gap-1">
                        <Label htmlFor={`crawler-config-${field.key}`}>{field.label}</Label>
                        <Input
                          id={`crawler-config-${field.key}`}
                          type="number"
                          min={field.min}
                          step={field.step ?? 1}
                          {...register(field.key)}
                          placeholder={`Default: ${field.defaultValue}`}
                          fullWidth
                        />
                        {errors[field.key] && (
                          <FieldError>{errors[field.key]?.message}</FieldError>
                        )}
                        <span className="text-xs text-muted">{field.hint}</span>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          <div className="flex justify-end gap-2">
            <ActionButtonWithPending
              type="submit"
              isPending={updateConfig.isPending}
              isDisabled={updateConfig.isPending}
            >
              Save changes
            </ActionButtonWithPending>
          </div>
        </Form>
      )}
    </div>
  );
}
