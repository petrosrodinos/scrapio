import { ApiProperty } from '@nestjs/swagger';
import { ApiKeyEntity } from './api-key.entity';

export class ApiKeyCreatedEntity extends ApiKeyEntity {
  @ApiProperty({
    description:
      'Raw API key value. Shown only once, at creation — store it securely, as it cannot be retrieved again (only key_prefix is kept afterwards).',
    example: 'spio_AbCdEfGhIjKlMnOpQrStUvWxYz0123456789-_AbCdEfGhIjKl',
  })
  api_key: string;
}
