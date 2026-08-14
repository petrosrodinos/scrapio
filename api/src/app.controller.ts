import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Root health check' })
  @ApiResponse({ status: 200, description: 'API is reachable', type: String })
  getHello(): string {
    return this.appService.getHello();
  }
}
