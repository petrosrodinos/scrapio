import {
  SchemaFieldTypes,
  type SchemaFieldType,
} from "@/features/scraper-generation/interfaces/output-config.interfaces";

export const SchemaFieldTypeFormOptions: { id: SchemaFieldType; label: string }[] = [
  { id: SchemaFieldTypes.STRING, label: "Text (string)" },
  { id: SchemaFieldTypes.NUMBER, label: "Number" },
  { id: SchemaFieldTypes.INTEGER, label: "Integer" },
  { id: SchemaFieldTypes.BOOLEAN, label: "True / false" },
  { id: SchemaFieldTypes.STRING_ARRAY, label: "Text list (string[])" },
  { id: SchemaFieldTypes.NUMBER_ARRAY, label: "Number list (number[])" },
  { id: SchemaFieldTypes.BOOLEAN_ARRAY, label: "Boolean list (boolean[])" },
  { id: SchemaFieldTypes.STRING_ENUM, label: "Enum (strings)" },
  { id: SchemaFieldTypes.NUMBER_ENUM, label: "Enum (numbers)" },
  { id: SchemaFieldTypes.OBJECT, label: "Nested object" },
  { id: SchemaFieldTypes.OBJECT_ARRAY, label: "Object list (object[])" },
  { id: SchemaFieldTypes.REGEX, label: "Regex matches (string[])" },
];

export function getSchemaFieldTypeLabel(type: SchemaFieldType | string): string {
  return SchemaFieldTypeFormOptions.find((option) => option.id === type)?.label ?? type;
}
