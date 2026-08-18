import { RegexPreset } from '@/shared/constants/regex-presets.constants';

export {
  RegexPresets,
  type RegexPreset,
} from '@/shared/constants/regex-presets.constants';

export const PrimitiveSchemaTypes = {
  STRING: 'string',
  NUMBER: 'number',
  INTEGER: 'integer',
  BOOLEAN: 'boolean',
  STRING_ARRAY: 'string[]',
  NUMBER_ARRAY: 'number[]',
  BOOLEAN_ARRAY: 'boolean[]',
} as const;

export type PrimitiveSchemaType =
  (typeof PrimitiveSchemaTypes)[keyof typeof PrimitiveSchemaTypes];

export const DescriptorBaseTypes = {
  STRING: 'string',
  NUMBER: 'number',
  INTEGER: 'integer',
  BOOLEAN: 'boolean',
  OBJECT: 'object',
  ARRAY: 'array',
  REGEX: 'regex',
} as const;

export type DescriptorBaseType =
  (typeof DescriptorBaseTypes)[keyof typeof DescriptorBaseTypes];

export type OutputSchemaEnumValue = string | number;

/**
 * A "rich descriptor" is a plain object carrying an explicit `type` key,
 * as opposed to shorthand nested-object syntax where every key is a
 * free-form field name mapping to a nested schema value.
 */
export interface OutputSchemaDescriptor {
  type: DescriptorBaseType;
  description?: string;
  required?: boolean;
  nullable?: boolean;
  enum?: OutputSchemaEnumValue[];
  /** A built-in preset name (see RegexPresets: "email" | "phone" | "url") or a raw regex source string. */
  pattern?: RegexPreset | (string & {});
  flags?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  items?: OutputSchemaFieldValue;
  properties?: OutputSchemaDefinition;
}

export type OutputSchemaFieldValue =
  | PrimitiveSchemaType
  | OutputSchemaEnumValue[]
  | OutputSchemaDescriptor
  | OutputSchemaDefinition
  | [OutputSchemaDefinition];

export interface OutputSchemaDefinition {
  [field: string]: OutputSchemaFieldValue;
}
