import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiProperty,
  getSchemaPath,
} from '@nestjs/swagger';

class PaginationMeta {
  @ApiProperty({ description: 'Total number of matching records', example: 42 })
  total: number;

  @ApiProperty({ description: 'Current page number (1-indexed)', example: 1 })
  page: number;

  @ApiProperty({ description: 'Number of records per page', example: 10 })
  limit: number;

  @ApiProperty({ description: 'Total number of pages', example: 5 })
  total_pages: number;

  @ApiProperty({ description: 'Whether a next page exists' })
  has_next: boolean;

  @ApiProperty({ description: 'Whether a previous page exists' })
  has_prev: boolean;
}

export const ApiPaginatedResponse = <TModel extends Type<unknown>>(
  model: TModel,
  description = 'Paginated list',
) =>
  applyDecorators(
    ApiExtraModels(model, PaginationMeta),
    ApiOkResponse({
      description,
      schema: {
        allOf: [
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
              pagination: { $ref: getSchemaPath(PaginationMeta) },
            },
          },
        ],
      },
    }),
  );
