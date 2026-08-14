import { ApiProperty } from '@nestjs/swagger';
import { AuthRole } from 'generated/prisma';

export class AuthResponse {
    @ApiProperty({
        description: 'JWT access token for authentication',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    })
    access_token: string;

    @ApiProperty({
        description: 'Unix timestamp (seconds) at which the access token expires',
        example: 1735689600,
    })
    expires_in: number;

    @ApiProperty({
        description: 'Authenticated user information (password hash is never included)',
        type: 'object',
        properties: {
            id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
            email: { type: 'string', example: 'user@example.com' },
            phone: { type: 'string', example: '+1234567890', nullable: true },
            role: { type: 'string', enum: Object.values(AuthRole), example: AuthRole.USER },
            default_schedule_tz: { type: 'string', example: 'Europe/Athens' },
            created_at: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
            updated_at: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        }
    })
    user: {
        id: string;
        email: string;
        phone: string | null;
        role: AuthRole;
        default_schedule_tz: string;
        created_at: Date;
        updated_at: Date;
    };
}

export class WaitlistResponse {
    @ApiProperty({
        description: 'Human-readable result of the waitlist request',
        example: 'You have been successfully added to the waitlist',
    })
    message: string;

    @ApiProperty({
        description: 'Machine-readable result code',
        example: 'WAITLIST_SUCCESS',
        enum: ['WAITLIST_SUCCESS', 'WAITLIST_ALREADY_EXISTS'],
    })
    code: string;
}
