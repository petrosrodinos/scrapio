import { Module } from '@nestjs/common';
import { PrismaModule } from '@/core/databases/prisma/prisma.module';
import { CredentialEncryptionService } from './services/credential-encryption.service';
import { IntegrationCredentialResolverService } from './services/integration-credential-resolver.service';

@Module({
  imports: [PrismaModule],
  providers: [CredentialEncryptionService, IntegrationCredentialResolverService],
  exports: [
    CredentialEncryptionService,
    IntegrationCredentialResolverService,
  ],
})
export class CredentialsModule {}
