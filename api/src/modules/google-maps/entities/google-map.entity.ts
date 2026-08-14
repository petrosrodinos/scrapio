import { ApiProperty } from '@nestjs/swagger';

export class TimezoneResult {
  @ApiProperty({
    description: 'IANA timezone identifier for the given coordinates',
    example: 'Europe/Athens',
  })
  timeZoneId: string;

  @ApiProperty({
    description: 'Human-readable timezone name',
    example: 'Eastern European Summer Time',
  })
  timeZoneName: string;

  @ApiProperty({
    description: 'Offset from UTC in seconds, excluding DST',
    example: 7200,
  })
  rawOffset: number;

  @ApiProperty({
    description: 'Daylight savings offset in seconds',
    example: 3600,
  })
  dstOffset: number;
}
