import { PartialType } from '@nestjs/swagger';
import { CreateWebsiteTargetDto } from './create-website-target.dto';

export class UpdateWebsiteTargetDto extends PartialType(CreateWebsiteTargetDto) {}
