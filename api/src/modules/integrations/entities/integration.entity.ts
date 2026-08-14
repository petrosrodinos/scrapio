import { ApiProperty } from '@nestjs/swagger';
import { ComputerUseModel, IntegrationType } from 'generated/prisma';

export class IntegrationField {
  @ApiProperty({ description: 'Field key expected in the credentials object', example: 'api_key' })
  key: string;

  @ApiProperty({ description: 'Human-readable label for the field', example: 'API Key' })
  label: string;

  @ApiProperty({ enum: ['password', 'text'], description: 'Input type hint for rendering the field' })
  type: 'password' | 'text';

  @ApiProperty({ description: 'Whether the field must be provided', example: true })
  required: boolean;
}

export class IntegrationModel {
  @ApiProperty({ enum: ComputerUseModel, description: 'Model identifier to pass as computer_use_model or ai_model' })
  value: ComputerUseModel;

  @ApiProperty({ description: 'Human-readable label for the model', example: 'Claude Sonnet 4.6' })
  label: string;

  @ApiProperty({ description: "Underlying provider model name sent to the provider's API", example: 'claude-sonnet-4-6' })
  api_model: string;

  @ApiProperty({ description: 'Whether this model supports computer-use actions', example: true })
  supports_computer_use: boolean;
}

export class Integration {
  @ApiProperty({ enum: IntegrationType, description: 'Integration type identifier' })
  type: IntegrationType;

  @ApiProperty({ description: 'Human-readable integration name', example: 'Anthropic' })
  name: string;

  @ApiProperty({ description: 'Whether this integration is shown to users when connecting a new integration', example: true })
  is_visible: boolean;

  @ApiProperty({ description: 'Credential fields required to connect this integration' })
  config_schema: {
    fields: IntegrationField[];
  };

  @ApiProperty({ type: [IntegrationModel], description: 'Computer-use models available for this integration (empty if unsupported)' })
  computer_use_models: IntegrationModel[];

  @ApiProperty({ type: [IntegrationModel], description: 'AI models available for this integration (empty if unsupported)' })
  ai_models: IntegrationModel[];
}
