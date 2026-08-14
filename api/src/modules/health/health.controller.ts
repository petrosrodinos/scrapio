import { Controller, Get, HttpStatus, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import {
    HealthQuerySchema,
    type HealthQueryType,
} from './dto/health-query.schema';
import { HealthService } from './health.service';
import { HealthCheckStatus } from './interfaces/health.interface';

@ApiTags('Health')
@Controller('health')
export class HealthController {
    constructor(private readonly healthService: HealthService) {}

    @Get()
    @ApiOperation({
        summary: 'Get health status',
        description:
            'Returns overall API health by default. Pass exactly one of `postgres` or `redis` to check that dependency only; passing both is invalid.',
    })
    @ApiQuery({
        name: 'postgres',
        required: false,
        type: Boolean,
        description: 'Return Postgres health only',
    })
    @ApiQuery({
        name: 'redis',
        required: false,
        type: Boolean,
        description: 'Return Redis health only',
    })
    @ApiResponse({
        status: 200,
        description:
            'Health status returned. Shape depends on the query: `{ service: "api", status: "ok", timestamp, uptime_ms }` when called with no query params, or `{ service: "postgres" | "redis", status, timestamp, ms?, message? }` when a specific service is requested.',
    })
    @ApiResponse({
        status: 400,
        description: 'Both `postgres` and `redis` were provided at once',
    })
    @ApiResponse({
        status: 503,
        description: 'Requested service (postgres or redis) is down',
    })
    async getHealth(
        @Query(new ZodValidationPipe(HealthQuerySchema)) query: HealthQueryType,
        @Res() response: Response,
    ) {
        const result = await this.healthService.check(query);
        const statusCode =
            result.service !== 'api' &&
            result.status === HealthCheckStatus.DOWN
                ? HttpStatus.SERVICE_UNAVAILABLE
                : HttpStatus.OK;

        return response.status(statusCode).json(result);
    }
}
