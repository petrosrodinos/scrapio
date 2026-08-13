import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, Label, Input, FieldError, ListBox, Select } from "@heroui/react";
import { Plus, Trash2 } from "lucide-react";
import { ActionButtonWithPending } from "@/components/ui/action-button-with-pending";
import { CrawlIntervalField } from "@/components/ui/crawl-interval-field";
import { OutputDataConfigEditor } from "@/pages/admin/generation-runs/components/output-data-config-editor";
import { isOutputSchemaJsonValid } from "@/features/scraper-generation/validation-schemas/output-config.schema";
import {
  OutputFormats,
  OutputSchemaEditorModes,
  type OutputFormat,
  type OutputSchemaEditorMode,
  type OutputSchemaField,
} from "@/features/scraper-generation/interfaces/output-config.interfaces";
import { ExtractionScopes } from "@/features/crawl-runs/interfaces/crawl-runs.interfaces";
import {
  plainScrapeFormSchema,
  type PlainScrapeFormValues,
} from "@/features/plain-scrape/validation-schemas/plain-scrape.schema";

interface PlainScrapeFormProps {
  defaultValues?: Partial<PlainScrapeFormValues>;
  submitLabel: string;
  isPending: boolean;
  onSubmit: (values: PlainScrapeFormValues) => void;
  onCancel?: () => void;
}

export function PlainScrapeForm({
  defaultValues,
  submitLabel,
  isPending,
  onSubmit,
  onCancel,
}: PlainScrapeFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<PlainScrapeFormValues>({
    resolver: zodResolver(plainScrapeFormSchema) as Resolver<PlainScrapeFormValues>,
    defaultValues: {
      name: defaultValues?.name ?? "",
      description: defaultValues?.description ?? "",
      urls: defaultValues?.urls ?? [""],
      extraction_scope: defaultValues?.extraction_scope ?? ExtractionScopes.COMBINED,
      schedule_cron: defaultValues?.schedule_cron ?? null,
      output_formats: defaultValues?.output_formats ?? [],
      output_schema_mode: defaultValues?.output_schema_mode ?? OutputSchemaEditorModes.BUILDER,
      output_schema_fields: defaultValues?.output_schema_fields ?? [],
      output_schema_json: defaultValues?.output_schema_json ?? "",
    },
  });

  const outputFormats = watch("output_formats");
  const schemaMode = watch("output_schema_mode");
  const schemaJson = watch("output_schema_json");
  const urls = watch("urls");
  const urlCount = urls.map((url) => url.trim()).filter(Boolean).length;

  const jsonSchemaInvalid =
    outputFormats?.includes(OutputFormats.STRUCTURED_JSON) &&
    schemaMode === OutputSchemaEditorModes.JSON &&
    !isOutputSchemaJsonValid(schemaJson ?? "");

  return (
    <Form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <Label htmlFor="plain-scrape-name">Name</Label>
        <Input
          id="plain-scrape-name"
          {...register("name")}
          placeholder="Product listing pages"
          fullWidth
        />
        {errors.name && <FieldError>{errors.name.message}</FieldError>}
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="plain-scrape-description">Description (optional)</Label>
        <Input
          id="plain-scrape-description"
          {...register("description")}
          placeholder="What this scrape is for"
          fullWidth
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label>URLs (up to 200)</Label>
        <Controller
          name="urls"
          control={control}
          render={({ field }) => {
            const urlList = field.value;
            const updateUrl = (index: number, value: string) => {
              field.onChange(urlList.map((url, i) => (i === index ? value : url)));
            };
            const removeUrl = (index: number) => {
              field.onChange(urlList.filter((_, i) => i !== index));
            };
            const addUrl = () => field.onChange([...urlList, ""]);

            return (
              <div className="flex flex-col gap-2">
                {urlList.map((url, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      aria-label={`URL ${index + 1}`}
                      value={url}
                      onChange={(event) => updateUrl(index, event.target.value)}
                      placeholder="https://example.com/page"
                      fullWidth
                    />
                    <ActionButtonWithPending
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label={`Remove URL ${index + 1}`}
                      idleLeading={<Trash2 className="h-3.5 w-3.5 text-danger" />}
                      onPress={() => removeUrl(index)}
                      isDisabled={urlList.length <= 1}
                      className="min-w-8 px-0"
                    >
                      <span className="sr-only">Remove</span>
                    </ActionButtonWithPending>
                  </div>
                ))}
                <ActionButtonWithPending
                  type="button"
                  size="sm"
                  variant="secondary"
                  idleLeading={<Plus className="h-3.5 w-3.5" />}
                  onPress={addUrl}
                  isDisabled={urlList.length >= 200}
                  className="w-fit"
                >
                  Add URL
                </ActionButtonWithPending>
              </div>
            );
          }}
        />
        <span className="text-xs text-muted">{urlCount} URL{urlCount === 1 ? "" : "s"}</span>
        {errors.urls && <FieldError>{errors.urls.message as string}</FieldError>}
      </div>

      {urlCount > 1 && (
        <div className="flex flex-col gap-1">
          <Controller
            name="extraction_scope"
            control={control}
            render={({ field }) => (
              <Select
                selectedKey={field.value}
                onSelectionChange={(key) => field.onChange(key as string)}
              >
                <Label>Extraction scope</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id={ExtractionScopes.COMBINED} textValue="Combined">
                      <div className="flex flex-col gap-0.5">
                        <span>Combined</span>
                        <span className="text-xs text-muted">
                          Merge all pages into a single normalized result
                        </span>
                      </div>
                    </ListBox.Item>
                    <ListBox.Item id={ExtractionScopes.PER_URL} textValue="Per URL">
                      <div className="flex flex-col gap-0.5">
                        <span>Per URL</span>
                        <span className="text-xs text-muted">
                          Produce one normalized result per page
                        </span>
                      </div>
                    </ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>
            )}
          />
        </div>
      )}

      <div className="border-t border-border pt-5">
        <div className="mb-3 flex flex-col gap-0.5">
          <span className="text-sm font-medium text-foreground">Raw HTML only</span>
          <span className="text-xs text-muted">
            Leave output formats unselected below to return only raw HTML and cleaned content,
            with no AI normalization step.
          </span>
        </div>
        <Controller
          name="output_formats"
          control={control}
          render={({ field: formatsField }) => (
            <Controller
              name="output_schema_mode"
              control={control}
              render={({ field: modeField }) => (
                <Controller
                  name="output_schema_fields"
                  control={control}
                  render={({ field: fieldsField }) => (
                    <Controller
                      name="output_schema_json"
                      control={control}
                      render={({ field: jsonField }) => (
                        <OutputDataConfigEditor
                          outputFormats={formatsField.value as OutputFormat[]}
                          schemaMode={modeField.value as OutputSchemaEditorMode}
                          schemaFields={fieldsField.value as OutputSchemaField[]}
                          schemaJson={jsonField.value}
                          onOutputFormatsChange={formatsField.onChange}
                          onSchemaModeChange={modeField.onChange}
                          onSchemaFieldsChange={fieldsField.onChange}
                          onSchemaJsonChange={jsonField.onChange}
                          formatsError={errors.output_formats?.message}
                          schemaFieldsError={errors.output_schema_fields?.message}
                          schemaJsonError={errors.output_schema_json?.message}
                          isDisabled={isPending}
                        />
                      )}
                    />
                  )}
                />
              )}
            />
          )}
        />
      </div>

      <div className="border-t border-border pt-5">
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
      </div>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
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
        <ActionButtonWithPending
          type="submit"
          isPending={isPending}
          isDisabled={isPending || jsonSchemaInvalid}
        >
          {submitLabel}
        </ActionButtonWithPending>
      </div>
    </Form>
  );
}
