import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, Label, TextArea, Input, FieldError, Select, ListBox } from "@heroui/react";
import { ActionButtonWithPending } from "@/components/ui/action-button-with-pending";
import { useWebsiteTargets } from "@/features/website-targets/hooks/use-website-targets";
import {
  createGenerationRunFormSchema,
  outputConfigDefaults,
  type CreateGenerationRunFormValues,
} from "@/features/scraper-generation/validation-schemas/scraper-generation.schema";
import { isOutputSchemaJsonValid } from "@/features/scraper-generation/validation-schemas/output-config.schema";
import { OutputDataConfigEditor } from "./output-data-config-editor";
import {
  OutputFormats,
  OutputSchemaEditorModes,
  type OutputFormat,
  type OutputSchemaEditorMode,
  type OutputSchemaField,
} from "@/features/scraper-generation/interfaces/output-config.interfaces";

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
    watch,
    formState: { errors },
  } = useForm<CreateGenerationRunFormValues>({
    resolver: zodResolver(createGenerationRunFormSchema) as Resolver<CreateGenerationRunFormValues>,
    defaultValues: {
      website_target_id: defaultWebsiteTargetId ?? "",
      scraper_id: defaultScraperId,
      prompt: "",
      max_steps: undefined,
      ...outputConfigDefaults,
    },
  });

  const outputFormats = watch("output_formats");
  const schemaMode = watch("output_schema_mode");
  const schemaJson = watch("output_schema_json");

  const jsonSchemaInvalid =
    outputFormats?.includes(OutputFormats.STRUCTURED_JSON) &&
    schemaMode === OutputSchemaEditorModes.JSON &&
    !isOutputSchemaJsonValid(schemaJson ?? "");

  return (
    <Form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
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
        <Label htmlFor="generation-prompt">Prompt</Label>
        <TextArea
          id="generation-prompt"
          {...register("prompt")}
          placeholder="Describe what the scraper should do (e.g. navigate to rentals, open each listing, extract details)"
          rows={3}
          fullWidth
        />
        {errors.prompt && <FieldError>{errors.prompt.message}</FieldError>}
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="generation-max-steps">Max steps (optional)</Label>
        <Input
          id="generation-max-steps"
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
