import { ApiProperty } from '@nestjs/swagger';
import { ApiKeyEntity } from './api-key.entity';

export class ApiKeyCreatedEntity extends ApiKeyEntity {
  @ApiProperty({ description: 'Raw API key value. Shown only once, at creation.' })
  api_key: string;
}
