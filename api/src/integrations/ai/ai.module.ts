import { Module } from '@nestjs/common';
import { CredentialsModule } from '@/integrations/credentials/credentials.module';
import { AiService } from './services/ai.service';
import { AiConfig } from './utils/ai.config';

@Module({
    imports: [CredentialsModule],
    providers: [AiService, AiConfig],
    exports: [AiService],
})
export class AiIntegrationModule { }
