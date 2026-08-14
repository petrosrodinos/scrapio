import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GoogleMapsService } from './google-maps.service';
import { TimezoneResult } from './entities/google-map.entity';

@ApiTags('Google Maps')
@Controller('google-maps')
export class GoogleMapsController {
  constructor(private readonly googleMapsService: GoogleMapsService) {}

  @Get('timezone')
  @ApiOperation({ summary: 'Resolve the IANA timezone for a coordinate pair' })
  @ApiQuery({ name: 'lat', required: true, type: Number, description: 'Latitude', example: 37.9838 })
  @ApiQuery({ name: 'lng', required: true, type: Number, description: 'Longitude', example: 23.7275 })
  @ApiResponse({ status: 200, type: TimezoneResult })
  @ApiResponse({ status: 500, description: 'Google Maps timezone lookup failed' })
  getTimezone(@Query('lat') lat: number, @Query('lng') lng: number) {
    return this.googleMapsService.getTimezone(lat, lng);
  }
}
