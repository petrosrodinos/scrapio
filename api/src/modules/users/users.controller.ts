import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { RolesGuard } from '@/shared/guards/roles.guard';
import { Roles } from '@/shared/decorators/roles.decorator';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { AuthUser } from '@/shared/interfaces/auth-user.interface';
import { AuthRole } from 'generated/prisma';
import { UsersService } from './users.service';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { UserProfile } from './entities/user-profile.entity';
import { UserSummary } from './entities/user-summary.entity';
import { CrawlScheduleTimezone } from './entities/crawl-schedule-timezone.entity';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(AuthRole.ADMIN, AuthRole.SUPPORT)
  @ApiOperation({ summary: 'List all users (admin)' })
  @ApiResponse({ status: 200, type: [UserSummary] })
  findAll() {
    return this.usersService.findAll();
  }

  @Get('crawl-schedule-timezones')
  @ApiOperation({ summary: 'List supported crawl schedule timezones' })
  @ApiResponse({ status: 200, type: [CrawlScheduleTimezone] })
  getCrawlScheduleTimezones() {
    return this.usersService.getCrawlScheduleTimezones();
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, type: UserProfile })
  @ApiResponse({ status: 404, description: 'User not found' })
  getMe(@CurrentUser() authUser: AuthUser) {
    return this.usersService.getProfile(authUser);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, type: UserProfile })
  @ApiResponse({
    status: 400,
    description:
      'No profile fields to update, or unsupported crawl schedule timezone',
  })
  updateMe(
    @CurrentUser() authUser: AuthUser,
    @Body() dto: UpdateUserProfileDto,
  ) {
    return this.usersService.updateProfile(authUser, dto);
  }
}
