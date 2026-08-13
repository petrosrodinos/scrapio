import { Checkbox, FieldError, Input, ListBox, Select, TextArea } from "@heroui/react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { ActionButtonWithPending } from "@/components/ui/action-button-with-pending";
import { cn } from "@/lib/utils";
import { OutputFormatFormOptions } from "@/config/constants/dropdowns/scrapers/output-format-form.options";
import { SchemaFieldTypeFormOptions } from "@/config/constants/dropdowns/scrapers/schema-field-type-form.options";
import { RegexPresetFormOptions } from "@/config/constants/dropdowns/scrapers/regex-preset-form.options";
import { RegexFlagsFormOptions } from "@/config/constants/dropdowns/scrapers/regex-flags-form.options";
import {
  OUTPUT_DATA_CONFIG_EXAMPLE,
  OutputFormats,
  OutputSchemaEditorModes,
  RegexPresets,
  SchemaFieldTypes,
  isBuiltInRegexPreset,
  isComplexSchemaFieldType,
  isEnumSchemaFieldType,
  isRegexSchemaFieldType,
  type OutputFormat,
  type OutputSchemaEditorMode,
  type OutputSchemaEnumValue,
  type OutputSchemaField,
  type RegexPreset,
  type SchemaFieldType,
} from "@/features/scraper-generation/interfaces/output-config.interfaces";
import {
  createEmptyEnumValue,
  createEmptyOutputSchemaField,
  definitionToSchemaFields,
  getOutputSchemaJsonError,
  parseOutputSchemaJson,
  schemaFieldsToDefinition,
  serializeOutputSchemaJson,
  withSchemaFieldType,
} from "@/features/scraper-generation/validation-schemas/output-config.schema";

type OutputDataConfigEditorProps = {
  outputFormats: OutputFormat[];
  schemaMode: OutputSchemaEditorMode;
  schemaFields: OutputSchemaField[];
  schemaJson: string;
  onOutputFormatsChange: (formats: OutputFormat[]) => void;
  onSchemaModeChange: (mode: OutputSchemaEditorMode) => void;
  onSchemaFieldsChange: (fields: OutputSchemaField[]) => void;
  onSchemaJsonChange: (json: string) => void;
  formatsError?: string;
  schemaFieldsError?: string;
  schemaJsonError?: string;
  isDisabled?: boolean;
};

type SchemaFieldListProps = {
  fields: OutputSchemaField[];
  onChange: (fields: OutputSchemaField[]) => void;
  depth?: number;
  canRemoveLast?: boolean;
  isDisabled?: boolean;
};

function toggleFormat(formats: OutputFormat[], format: OutputFormat, selected: boolean): OutputFormat[] {
  if (selected) {
    return formats.includes(format) ? formats : [...formats, format];
  }
  return formats.filter((value) => value !== format);
}

function SchemaFieldList({
  fields,
  onChange,
  depth = 0,
  canRemoveLast = true,
  isDisabled = false,
}: SchemaFieldListProps) {
  const updateField = (index: number, nextField: OutputSchemaField) => {
    onChange(fields.map((field, fieldIndex) => (fieldIndex === index ? nextField : field)));
  };

  const removeField = (index: number) => {
    onChange(fields.filter((_, fieldIndex) => fieldIndex !== index));
  };

  return (
    <div className={cn("flex flex-col gap-1.5", depth > 0 && "pl-3 border-l border-border")}>
      {depth === 0 ? (
        <div className="grid grid-cols-[minmax(0,1fr)_11.5rem_2rem] gap-2 px-0.5 text-xs text-muted">
          <span>Field name</span>
          <span>Type</span>
          <span className="sr-only">Remove</span>
        </div>
      ) : null}

      {fields.map((field, index) => {
        const complex = isComplexSchemaFieldType(field.type);
        const isEnum = isEnumSchemaFieldType(field.type);
        const isRegex = isRegexSchemaFieldType(field.type);
        const regexPreset: RegexPreset = isBuiltInRegexPreset(field.pattern)
          ? field.pattern
          : RegexPresets.CUSTOM;
        const enumValues = field.enumValues ?? [createEmptyEnumValue(field.type)];

        const updateEnumValue = (valueIndex: number, raw: string) => {
          const nextValues = [...enumValues];
          if (field.type === SchemaFieldTypes.NUMBER_ENUM) {
            const parsed = Number(raw);
            nextValues[valueIndex] = raw.trim() === "" || Number.isNaN(parsed) ? 0 : parsed;
          } else {
            nextValues[valueIndex] = raw;
          }
          updateField(index, { ...field, enumValues: nextValues });
        };

        const removeEnumValue = (valueIndex: number) => {
          const nextValues = enumValues.filter((_, i) => i !== valueIndex);
          updateField(index, {
            ...field,
            enumValues: nextValues.length > 0 ? nextValues : [createEmptyEnumValue(field.type)],
          });
        };

        const addEnumValue = () => {
          updateField(index, {
            ...field,
            enumValues: [...enumValues, createEmptyEnumValue(field.type)],
          });
        };

        return (
          <div key={`schema-field-${depth}-${index}`} className="flex flex-col gap-1.5">
            <div className="grid grid-cols-[minmax(0,1fr)_11.5rem_2rem] items-center gap-2">
              <Input
                aria-label={`Field name depth ${depth} index ${index + 1}`}
                value={field.name}
                onChange={(event) => updateField(index, { ...field, name: event.target.value })}
                placeholder={depth === 0 ? "company_name" : "name"}
                disabled={isDisabled}
                fullWidth
              />

              <Select
                aria-label={`Field type depth ${depth} index ${index + 1}`}
                selectedKey={field.type}
                isDisabled={isDisabled}
                onSelectionChange={(key) => {
                  if (!key) return;
                  updateField(
                    index,
                    withSchemaFieldType(field, String(key) as SchemaFieldType),
                  );
                }}
              >
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox items={SchemaFieldTypeFormOptions}>
                    {(option) => (
                      <ListBox.Item id={option.id} textValue={option.label}>
                        {option.label}
                      </ListBox.Item>
                    )}
                  </ListBox>
                </Select.Popover>
              </Select>

              <ActionButtonWithPending
                type="button"
                size="sm"
                variant="ghost"
                aria-label={`Remove field depth ${depth} index ${index + 1}`}
                idleLeading={<Trash2 className="h-3.5 w-3.5 text-danger" />}
                onPress={() => removeField(index)}
                isDisabled={isDisabled || (!canRemoveLast && fields.length <= 1)}
                className="min-w-8 px-0"
              >
                <span className="sr-only">Remove</span>
              </ActionButtonWithPending>
            </div>

            {isEnum ? (
              <div className="flex flex-col gap-1.5 rounded-lg bg-surface-secondary/60 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted">
                    {field.type === SchemaFieldTypes.NUMBER_ENUM
                      ? "Allowed numbers"
                      : "Allowed strings"}
                  </span>
                  <ActionButtonWithPending
                    type="button"
                    size="sm"
                    variant="secondary"
                    idleLeading={<Plus className="h-3.5 w-3.5" />}
                    onPress={addEnumValue}
                    isDisabled={isDisabled}
                  >
                    Add value
                  </ActionButtonWithPending>
                </div>
                <div className="flex flex-col gap-1.5">
                  {enumValues.map((value: OutputSchemaEnumValue, valueIndex) => (
                    <div
                      key={`enum-value-${depth}-${index}-${valueIndex}`}
                      className="grid grid-cols-[minmax(0,1fr)_2rem] items-center gap-2"
                    >
                      <Input
                        aria-label={`Enum value depth ${depth} field ${index + 1} value ${valueIndex + 1}`}
                        type={field.type === SchemaFieldTypes.NUMBER_ENUM ? "number" : "text"}
                        value={String(value)}
                        onChange={(event) => updateEnumValue(valueIndex, event.target.value)}
                        placeholder={
                          field.type === SchemaFieldTypes.NUMBER_ENUM ? "1" : "for_sale"
                        }
                        disabled={isDisabled}
                        fullWidth
                      />
                      <ActionButtonWithPending
                        type="button"
                        size="sm"
                        variant="ghost"
                        aria-label={`Remove enum value ${valueIndex + 1}`}
                        idleLeading={<Trash2 className="h-3.5 w-3.5 text-danger" />}
                        onPress={() => removeEnumValue(valueIndex)}
                        isDisabled={isDisabled || enumValues.length <= 1}
                        className="min-w-8 px-0"
                      >
                        <span className="sr-only">Remove</span>
                      </ActionButtonWithPending>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {isRegex ? (
              <div className="flex flex-col gap-1.5 rounded-lg bg-surface-secondary/60 p-2.5">
                <div className="grid grid-cols-2 items-center gap-2">
                  <Select
                    aria-label={`Regex preset depth ${depth} index ${index + 1}`}
                    selectedKey={regexPreset}
                    isDisabled={isDisabled}
                    onSelectionChange={(key) => {
                      if (!key) return;
                      const preset = String(key) as RegexPreset;
                      updateField(index, {
                        ...field,
                        pattern:
                          preset === RegexPresets.CUSTOM
                            ? isBuiltInRegexPreset(field.pattern)
                              ? ""
                              : field.pattern ?? ""
                            : preset,
                      });
                    }}
                  >
                    <Select.Trigger>
                      <Select.Value>{({ selectedText }) => selectedText}</Select.Value>
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox items={RegexPresetFormOptions}>
                        {(option) => (
                          <ListBox.Item id={option.id} textValue={option.label}>
                            {option.label}
                          </ListBox.Item>
                        )}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                  <Select
                    aria-label={`Regex flags depth ${depth} index ${index + 1}`}
                    selectedKey={field.flags ?? ""}
                    isDisabled={isDisabled}
                    onSelectionChange={(key) =>
                      updateField(index, { ...field, flags: key ? String(key) : undefined })
                    }
                  >
                    <Select.Trigger>
                      <Select.Value>{({ selectedText }) => selectedText}</Select.Value>
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox items={RegexFlagsFormOptions}>
                        {(option) => (
                          <ListBox.Item id={option.id} textValue={option.label}>
                            <div className="flex flex-col gap-0.5">
                              <span>{option.label}</span>
                              <span className="text-xs text-muted">{option.description}</span>
                            </div>
                          </ListBox.Item>
                        )}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>
                {regexPreset === RegexPresets.CUSTOM ? (
                  <Input
                    aria-label={`Custom regex pattern depth ${depth} index ${index + 1}`}
                    value={isBuiltInRegexPreset(field.pattern) ? "" : field.pattern ?? ""}
                    onChange={(event) => updateField(index, { ...field, pattern: event.target.value })}
                    placeholder="Custom regex, e.g. \d{3}-\d{4}"
                    disabled={isDisabled}
                    fullWidth
                  />
                ) : null}
                <span className="text-xs text-muted">
                  Matches every occurrence deterministically, without an AI call.
                </span>
              </div>
            ) : null}

            {complex ? (
              <div className="flex flex-col gap-1.5 rounded-lg bg-surface-secondary/60 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted">
                    {field.type === "object[]" ? "Item fields" : "Nested fields"}
                  </span>
                  <ActionButtonWithPending
                    type="button"
                    size="sm"
                    variant="secondary"
                    idleLeading={<Plus className="h-3.5 w-3.5" />}
                    onPress={() =>
                      updateField(index, {
                        ...field,
                        children: [...(field.children ?? []), createEmptyOutputSchemaField()],
                      })
                    }
                    isDisabled={isDisabled}
                  >
                    Add nested field
                  </ActionButtonWithPending>
                </div>
                <SchemaFieldList
                  fields={field.children ?? [createEmptyOutputSchemaField()]}
                  onChange={(children) => updateField(index, { ...field, children })}
                  depth={depth + 1}
                  canRemoveLast={false}
                  isDisabled={isDisabled}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function OutputDataConfigEditor({
  outputFormats,
  schemaMode,
  schemaFields,
  schemaJson,
  onOutputFormatsChange,
  onSchemaModeChange,
  onSchemaFieldsChange,
  onSchemaJsonChange,
  formatsError,
  schemaFieldsError,
  schemaJsonError,
  isDisabled = false,
}: OutputDataConfigEditorProps) {
  const structuredJsonSelected = outputFormats.includes(OutputFormats.STRUCTURED_JSON);
  const isBuilderMode = schemaMode === OutputSchemaEditorModes.BUILDER;
  const liveJsonError =
    structuredJsonSelected && !isBuilderMode
      ? getOutputSchemaJsonError(schemaJson) ?? schemaJsonError ?? null
      : null;

  const addField = () => {
    onSchemaFieldsChange([...schemaFields, createEmptyOutputSchemaField()]);
  };

  const switchToJsonMode = () => {
    if (schemaMode !== OutputSchemaEditorModes.JSON) {
      const definition = schemaFieldsToDefinition(schemaFields);
      if (Object.keys(definition).length > 0) {
        onSchemaJsonChange(serializeOutputSchemaJson(definition));
      }
    }
    onSchemaModeChange(OutputSchemaEditorModes.JSON);
  };

  const switchToBuilderMode = () => {
    if (schemaMode === OutputSchemaEditorModes.JSON && schemaJson.trim()) {
      try {
        const definition = parseOutputSchemaJson(schemaJson);
        if (definition && Object.keys(definition).length > 0) {
          onSchemaFieldsChange(definitionToSchemaFields(definition));
        }
      } catch {
        // keep current builder fields when JSON is invalid
      }
    }
    onSchemaModeChange(OutputSchemaEditorModes.BUILDER);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground">Output formats</span>
        <span className="text-xs text-muted">
          Choose what normalized artifacts this scraper should produce.
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {OutputFormatFormOptions.map((option) => {
          const selected = outputFormats.includes(option.id);
          return (
            <label
              key={option.id}
              className={cn(
                "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors",
                selected
                  ? "border-accent bg-accent/5"
                  : "border-border bg-surface hover:border-accent/40",
                isDisabled && "pointer-events-none opacity-60",
              )}
            >
              <Checkbox
                aria-label={option.label}
                isSelected={selected}
                isDisabled={isDisabled}
                onChange={(isSelected) =>
                  onOutputFormatsChange(toggleFormat(outputFormats, option.id, isSelected))
                }
                className="mt-0.5"
              >
                <Checkbox.Control className="size-5">
                  <Checkbox.Indicator className="size-3.5" />
                </Checkbox.Control>
              </Checkbox>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">{option.label}</span>
                <span className="text-xs leading-snug text-muted">{option.description}</span>
              </span>
            </label>
          );
        })}
      </div>
      {formatsError ? <FieldError>{formatsError}</FieldError> : null}

      {structuredJsonSelected ? (
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">Output schema</span>
            <span className="text-xs text-muted">
              Field names and types for structured JSON. 
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div
              role="tablist"
              aria-label="Output schema editor mode"
              className="inline-flex shrink-0 rounded-lg border border-border bg-surface-secondary p-0.5"
            >
              <button
                type="button"
                role="tab"
                aria-selected={isBuilderMode}
                disabled={isDisabled}
                onClick={switchToBuilderMode}
                className={cn(
                  "whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors",
                  isBuilderMode
                    ? "bg-surface text-foreground shadow-sm"
                    : "text-muted hover:text-foreground",
                  isDisabled && "opacity-60",
                )}
              >
                Builder
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={!isBuilderMode}
                disabled={isDisabled}
                onClick={switchToJsonMode}
                className={cn(
                  "whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors",
                  !isBuilderMode
                    ? "bg-surface text-foreground shadow-sm"
                    : "text-muted hover:text-foreground",
                  isDisabled && "opacity-60",
                )}
              >
                JSON
              </button>
            </div>

            {isBuilderMode ? (
              <ActionButtonWithPending
                type="button"
                size="sm"
                variant="secondary"
                idleLeading={<Plus className="h-3.5 w-3.5" />}
                onPress={addField}
                isDisabled={isDisabled}
              >
                Add field
              </ActionButtonWithPending>
            ) : null}
          </div>

          {isBuilderMode ? (
            <div className="flex flex-col gap-2">
              {schemaFields.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border py-4 text-center text-sm text-muted">
                  No fields yet — add one to define structured output
                </p>
              ) : (
                <SchemaFieldList
                  fields={schemaFields}
                  onChange={onSchemaFieldsChange}
                  canRemoveLast={false}
                  isDisabled={isDisabled}
                />
              )}
              {schemaFieldsError ? <FieldError>{schemaFieldsError}</FieldError> : null}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <TextArea
                aria-label="Output schema JSON"
                value={schemaJson}
                onChange={(event) => onSchemaJsonChange(event.target.value)}
                rows={8}
                className={cn(
                  "font-mono text-xs",
                  liveJsonError && "border-danger focus-visible:ring-danger",
                )}
                placeholder={
                  '{\n  "title": "string",\n  "status": ["for_sale", "sold"],\n  "rating": [1, 2, 3]\n}'
                }
                disabled={isDisabled}
                fullWidth
              />
              {liveJsonError ? (
                <FieldError>{liveJsonError}</FieldError>
              ) : schemaJson.trim() ? (
                <span className="text-xs text-success">Valid JSON schema</span>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs text-muted marker:content-none hover:text-foreground">
          <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
          Example output config
        </summary>
        <pre className="mt-2 max-h-40 overflow-auto rounded-lg border border-border bg-surface-secondary p-3 text-xs text-muted">
          {JSON.stringify(OUTPUT_DATA_CONFIG_EXAMPLE, null, 2)}
        </pre>
      </details>
    </div>
  );
}
