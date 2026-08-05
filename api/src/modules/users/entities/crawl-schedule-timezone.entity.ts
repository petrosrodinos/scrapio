import { ApiProperty } from '@nestjs/swagger';

export class CrawlScheduleTimezone {
  @ApiProperty({ example: 'Europe/Athens' })
  value: string;

  @ApiProperty({ example: 'Eastern European Time - Athens' })
  label: string;
}
