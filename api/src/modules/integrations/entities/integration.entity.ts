import { ApiProperty } from '@nestjs/swagger';
import { ComputerUseModel, IntegrationType } from 'generated/prisma';

export class IntegrationField {
  @ApiProperty()
  key: string;

  @ApiProperty()
  label: string;

  @ApiProperty({ enum: ['password', 'text'] })
  type: 'password' | 'text';

  @ApiProperty()
  required: boolean;
}

export class IntegrationModel {
  @ApiProperty({ enum: ComputerUseModel })
  value: ComputerUseModel;

  @ApiProperty()
  label: string;

  @ApiProperty()
  api_model: string;

  @ApiProperty()
  supports_computer_use: boolean;
}

export class Integration {
  @ApiProperty({ enum: IntegrationType })
  type: IntegrationType;

  @ApiProperty()
  name: string;

  @ApiProperty()
  is_visible: boolean;

  @ApiProperty()
  config_schema: {
    fields: IntegrationField[];
  };

  @ApiProperty({ type: [IntegrationModel] })
  computer_use_models: IntegrationModel[];

  @ApiProperty({ type: [IntegrationModel] })
  ai_models: IntegrationModel[];
}
