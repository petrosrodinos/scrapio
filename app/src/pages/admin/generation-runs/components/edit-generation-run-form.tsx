import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, Label, TextArea, Input, FieldError } from "@heroui/react";
import { ActionButtonWithPending } from "@/components/ui/action-button-with-pending";
import {
  buildUpdateGenerationRunPayload,
  updateGenerationRunFormSchema,
  type UpdateGenerationRunFormValues,
} from "@/features/scraper-generation/validation-schemas/scraper-generation.schema";
import {
  definitionToSchemaFields,
  createEmptyOutputSchemaField,
  isOutputSchemaJsonValid,
} from "@/features/scraper-generation/validation-schemas/output-config.schema";
import { OutputDataConfigEditor } from "./output-data-config-editor";
import {
  OutputFormats,
  OutputSchemaEditorModes,
  type OutputFormat,
  type OutputSchemaDefinition,
  type OutputSchemaEditorMode,
  type OutputSchemaField,
} from "@/features/scraper-generation/interfaces/output-config.interfaces";
import type {
  GenerationRun,
  UpdateGenerationRunPayload,
} from "@/features/scraper-generation/interfaces/scraper-generation.interfaces";

function buildEditDefaults(run: GenerationRun): UpdateGenerationRunFormValues {
  const formats =
    run.output_formats?.length > 0
      ? run.output_formats
      : [OutputFormats.STRUCTURED_JSON];
  const schema = run.output_schema as OutputSchemaDefinition | null;
  const hasSchema = schema && typeof schema === "object" && !Array.isArray(schema);

  return {
    prompt: run.prompt ?? "",
    max_steps: run.max_steps,
    output_formats: formats,
    output_schema_mode: OutputSchemaEditorModes.BUILDER,
    output_schema_fields: hasSchema
      ? definitionToSchemaFields(schema)
      : [createEmptyOutputSchemaField()],
    output_schema_json: hasSchema ? JSON.stringify(schema, null, 2) : "",
  };
}

interface EditGenerationRunFormProps {
  run: GenerationRun;
  isPending: boolean;
  onSubmit: (payload: UpdateGenerationRunPayload) => void;
  onCancel: () => void;
}

export function EditGenerationRunForm({
  run,
  isPending,
  onSubmit,
  onCancel,
}: EditGenerationRunFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<UpdateGenerationRunFormValues>({
    resolver: zodResolver(updateGenerationRunFormSchema) as Resolver<UpdateGenerationRunFormValues>,
    defaultValues: buildEditDefaults(run),
  });

  const outputFormats = watch("output_formats");
  const schemaMode = watch("output_schema_mode");
  const schemaJson = watch("output_schema_json");

  const jsonSchemaInvalid =
    outputFormats?.includes(OutputFormats.STRUCTURED_JSON) &&
    schemaMode === OutputSchemaEditorModes.JSON &&
    !isOutputSchemaJsonValid(schemaJson ?? "");

  return (
    <Form
      onSubmit={(event) => {
        event.preventDefault();
      }}
      className="flex flex-col gap-5"
    >
      <div className="flex flex-col gap-1">
        <Label htmlFor="edit-generation-website-target">Website target</Label>
        <div
          id="edit-generation-website-target"
          className="rounded-lg border border-border bg-surface-secondary px-3 py-2 text-sm text-muted"
        >
          {run.website_target?.name ?? run.website_target_id}
        </div>
      </div>

      {run.scraper_id && (
        <div className="flex flex-col gap-1">
          <Label htmlFor="edit-generation-scraper">Scraper</Label>
          <div
            id="edit-generation-scraper"
            className="rounded-lg border border-border bg-surface-secondary px-3 py-2 text-sm text-muted"
          >
            {run.scraper?.name ?? run.scraper_id}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <Label htmlFor="edit-generation-prompt">Prompt</Label>
        <TextArea
          id="edit-generation-prompt"
          {...register("prompt")}
          placeholder="Describe what the scraper should do"
          rows={3}
          fullWidth
        />
        {errors.prompt && <FieldError>{errors.prompt.message}</FieldError>}
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="edit-generation-max-steps">Max steps (optional)</Label>
        <Input
          id="edit-generation-max-steps"
          type="number"
          min={1}
          {...register("max_steps")}
          placeholder="Unlimited"
          className="max-w-48"
          fullWidth
        />
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

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <ActionButtonWithPending
          type="button"
          variant="secondary"
          isDisabled={isPending}
          onPress={onCancel}
        >
          Cancel
        </ActionButtonWithPending>
        <ActionButtonWithPending
          type="button"
          isPending={isPending}
          isDisabled={isPending || jsonSchemaInvalid}
          onPress={() =>
            handleSubmit((values) => onSubmit(buildUpdateGenerationRunPayload(values)))()
          }
        >
          Save
        </ActionButtonWithPending>
      </div>
    </Form>
  );
}
