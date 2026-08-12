import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, Label, TextArea, Input, FieldError } from "@heroui/react";
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
import {
  browserAgentFormSchema,
  DEFAULT_BROWSER_AGENT_MAX_STEPS,
  type BrowserAgentFormValues,
} from "@/features/browser-agent/validation-schemas/browser-agent.schema";

interface BrowserAgentFormProps {
  defaultValues?: Partial<BrowserAgentFormValues>;
  submitLabel: string;
  isPending: boolean;
  onSubmit: (values: BrowserAgentFormValues) => void;
  onCancel?: () => void;
}

export function BrowserAgentForm({
  defaultValues,
  submitLabel,
  isPending,
  onSubmit,
  onCancel,
}: BrowserAgentFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<BrowserAgentFormValues>({
    resolver: zodResolver(browserAgentFormSchema) as Resolver<BrowserAgentFormValues>,
    defaultValues: {
      name: defaultValues?.name ?? "",
      description: defaultValues?.description ?? "",
      url: defaultValues?.url ?? "",
      max_steps: defaultValues?.max_steps ?? DEFAULT_BROWSER_AGENT_MAX_STEPS,
      schedule_cron: defaultValues?.schedule_cron ?? null,
      output_formats: defaultValues?.output_formats ?? [OutputFormats.STRUCTURED_JSON],
      output_schema_mode: defaultValues?.output_schema_mode ?? OutputSchemaEditorModes.BUILDER,
      output_schema_fields: defaultValues?.output_schema_fields ?? [],
      output_schema_json: defaultValues?.output_schema_json ?? "",
    },
  });

  const outputFormats = watch("output_formats");
  const schemaMode = watch("output_schema_mode");
  const schemaJson = watch("output_schema_json");

  const noOutputFormatSelected = !outputFormats?.length;

  const jsonSchemaInvalid =
    outputFormats?.includes(OutputFormats.STRUCTURED_JSON) &&
    schemaMode === OutputSchemaEditorModes.JSON &&
    !isOutputSchemaJsonValid(schemaJson ?? "");

  return (
    <Form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <Label htmlFor="browser-agent-name">Name</Label>
        <Input
          id="browser-agent-name"
          {...register("name")}
          placeholder="Find contact info"
          fullWidth
        />
        {errors.name && <FieldError>{errors.name.message}</FieldError>}
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="browser-agent-url">Website URL</Label>
        <Input
          id="browser-agent-url"
          {...register("url")}
          placeholder="https://example.com"
          fullWidth
        />
        {errors.url && <FieldError>{errors.url.message}</FieldError>}
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="browser-agent-description">Instructions (optional)</Label>
        <TextArea
          id="browser-agent-description"
          {...register("description")}
          placeholder="Describe what the agent should look for (e.g. find the pricing page and extract each plan's price and features)"
          rows={3}
          fullWidth
        />
        <span className="text-xs text-muted">
          The agent uses computer vision to click, scroll, and navigate the site autonomously to
          find this information — no manual selectors required.
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="browser-agent-max-steps">Max steps</Label>
        <Input
          id="browser-agent-max-steps"
          type="number"
          min={1}
          {...register("max_steps")}
          className="max-w-48"
          fullWidth
        />
        <span className="text-xs text-muted">
          Hard cap on computer-use steps per run, to bound cost and runtime.
        </span>
        {errors.max_steps && <FieldError>{errors.max_steps.message}</FieldError>}
      </div>

      <div className="border-t border-border pt-5">
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
          isDisabled={isPending || noOutputFormatSelected || jsonSchemaInvalid}
        >
          {submitLabel}
        </ActionButtonWithPending>
      </div>
    </Form>
  );
}
