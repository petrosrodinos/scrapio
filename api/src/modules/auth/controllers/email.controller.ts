import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { EmailAuthService } from '../services/email.service';
import { RegisterEmailDto } from '../dto/register-email.dto';
import { LoginEmailDto } from '../dto/login-email.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthResponse, WaitlistResponse } from '../entities/auth-response.entity';
import { WaitlistDto } from '../dto/waitlist.dto';

@ApiTags('Email Authentication')
@Controller('auth/email')
export class EmailAuthController {
    constructor(private readonly authService: EmailAuthService) { }

    @Post('register')
    @ApiOperation({ summary: 'Register a new user with email and password' })
    @ApiBody({ type: RegisterEmailDto })
    @ApiResponse({
        status: 201,
        description: 'User registered successfully',
        type: AuthResponse
    })
    @ApiResponse({
        status: 400,
        description: 'Bad Request - user with this email already exists, or registration could not be processed'
    })
    async registerWithEmail(@Body() dto: RegisterEmailDto) {
        try {
            return this.authService.registerWithEmail(dto);

        } catch (error) {
        }
    }

    @Post('login')
    @ApiOperation({ summary: 'Login user with email and password' })
    @ApiBody({ type: LoginEmailDto })
    @ApiResponse({
        status: 200,
        description: 'User logged in successfully',
        type: AuthResponse
    })
    @ApiResponse({
        status: 400,
        description: 'Bad Request - invalid credentials'
    })
    async loginWithEmail(@Body() dto: LoginEmailDto) {
        return this.authService.loginWithEmail(dto);
    }

    @Post('/waitlist')
    @ApiOperation({ summary: 'Waitlist a user with ref code' })
    @ApiBody({ type: WaitlistDto })
    @ApiResponse({
        status: 200,
        description: 'User added to the waitlist (or already on it)',
        type: WaitlistResponse
    })
    @ApiResponse({
        status: 400,
        description: 'Bad Request - failed to waitlist user'
    })
    async waitlist(@Body() dto: WaitlistDto) {
        return this.authService.waitlist(dto);
    }
}
