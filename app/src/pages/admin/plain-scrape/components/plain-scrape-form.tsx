import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, Label, TextArea, Input, FieldError, ListBox, Select } from "@heroui/react";
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
      urls_text: defaultValues?.urls_text ?? "",
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
  const urlsText = watch("urls_text");
  const urlCount = urlsText.split("\n").map((line) => line.trim()).filter(Boolean).length;

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
        <Label htmlFor="plain-scrape-urls">URLs (one per line, up to 200)</Label>
        <TextArea
          id="plain-scrape-urls"
          {...register("urls_text")}
          placeholder={"https://example.com/page-1\nhttps://example.com/page-2"}
          rows={6}
          fullWidth
        />
        <span className="text-xs text-muted">{urlCount} URL{urlCount === 1 ? "" : "s"}</span>
        {errors.urls_text && <FieldError>{errors.urls_text.message}</FieldError>}
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
