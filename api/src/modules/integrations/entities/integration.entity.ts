import { ApiProperty } from '@nestjs/swagger';
import { IntegrationType } from 'generated/prisma';

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

export class Integration {
  @ApiProperty({ enum: IntegrationType })
  type: IntegrationType;

  @ApiProperty()
  name: string;

  @ApiProperty()
  base_url: string;

  @ApiProperty()
  is_visible: boolean;

  @ApiProperty()
  config_schema: {
    fields: IntegrationField[];
  };
}
