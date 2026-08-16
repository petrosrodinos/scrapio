import { Module } from '@nestjs/common';
import { CredentialsModule } from '@/integrations/credentials/credentials.module';
import { AiService } from './services/ai.service';
import { AiBatchOpenAiService } from './services/ai-batch-openai.service';
import { AiConfig } from './utils/ai.config';

@Module({
    imports: [CredentialsModule],
    providers: [AiService, AiBatchOpenAiService, AiConfig],
    exports: [AiService, AiBatchOpenAiService],
})
export class AiIntegrationModule { }
