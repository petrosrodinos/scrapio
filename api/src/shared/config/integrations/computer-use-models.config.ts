import {
  ANTHROPIC_COMPUTER_USE_MODELS,
  getIntegrationModelApiId,
  isKnownIntegrationModel,
  type IntegrationModelDefinition,
} from './integration-models.config';
import { ComputerUseModel } from 'generated/prisma';

export type ComputerUseModelDefinition = IntegrationModelDefinition;

export const COMPUTER_USE_MODELS = ANTHROPIC_COMPUTER_USE_MODELS;

export function getComputerUseModelApiId(model: ComputerUseModel): string {
  return getIntegrationModelApiId(model);
}

export function isComputerUseModel(value: string): value is ComputerUseModel {
  return isKnownIntegrationModel(value);
}
