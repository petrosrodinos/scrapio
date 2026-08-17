import { Injectable, Logger } from '@nestjs/common';
import { embed, generateObject, generateText, NoObjectGeneratedError, streamText } from 'ai';
import { IntegrationCredentialResolverService } from '@/integrations/credentials/services/integration-credential-resolver.service';
import { CostsService } from '@/modules/costs/costs.service';
import { CostCategory, IntegrationType } from 'generated/prisma';
import {
    AiGenerationError,
    AIGenerateObjectResponse,
    AIGenerateOptions,
    AIGenerateTextResponse,
    AIStreamTextOptions,
} from '../interfaces/ai.interface';
import { AiConfig } from '../utils/ai.config';
import { integrationTypeToAiProvider } from '../utils/integration-type-to-ai-provider';
import { z } from 'zod';
import { createOpenAI } from '@ai-sdk/openai';
import { calculateAiCost } from '../utils/ai-cost';

@Injectable()
export class AiService {

    constructor(
        private readonly aiConfig: AiConfig,
        private readonly credentialResolver: IntegrationCredentialResolverService,
        private readonly costsService: CostsService,
    ) { }

    private readonly logger = new Logger(AiService.name);

    async generateTextForUser(
        userId: string,
        options: Omit<AIGenerateOptions, 'provider' | 'model' | 'apiKey'>,
    ): Promise<AIGenerateTextResponse> {
        const resolved = await this.resolveDefaultAiOptions(userId);
        const result = await this.generateText({
            ...options,
            ...resolved,
        });

        if (result.usage) {
            this.recordAiCost(userId, resolved, result.usage);
        }

        return result;
    }

    async generateTextWithSchemaForUser<T = unknown>(
        userId: string,
        options: Omit<AIGenerateOptions, 'provider' | 'model' | 'apiKey'>,
    ): Promise<AIGenerateObjectResponse<T>> {
        const resolved = await this.resolveDefaultAiOptions(userId);

        try {
            const result = await this.generateTextWithSchema<T>({
                ...options,
                ...resolved,
            });

            if (result.usage) {
                this.recordAiCost(userId, resolved, result.usage);
            }

            return result;
        } catch (error) {
            if (error instanceof AiGenerationError && error.usage) {
                this.recordAiCost(userId, resolved, error.usage);
            }
            throw error;
        }
    }

    private recordAiCost(
        userId: string,
        resolved: { provider: string; model: string },
        usage: { totalCost: number; inputTokens: number; outputTokens: number },
    ): void {
        setImmediate(() => {
            this.costsService.record({
                userId,
                category: CostCategory.AI,
                amount: usage.totalCost,
                provider: resolved.provider,
                model: resolved.model,
                metadata: {
                    input_tokens: usage.inputTokens,
                    output_tokens: usage.outputTokens,
                },
            });
        });
    }

    async generateText(options: AIGenerateOptions): Promise<AIGenerateTextResponse> {
        try {

            const modelAdapter = this.aiConfig.getModelAdapter(
                options.provider,
                options.model,
                options.apiKey,
            );

            const { text, usage } = await generateText({
                prompt: options.prompt,
                model: modelAdapter,
                system: options?.system || 'You are a helpful assistant.',
                temperature: options.temperature,
                maxTokens: options.maxTokens,
                topP: options.topP,
                frequencyPenalty: options.frequencyPenalty,
                presencePenalty: options.presencePenalty,
            });

            const cost = calculateAiCost({
                provider: options.provider,
                model: options.model,
                inputTokens: usage.promptTokens,
                outputTokens: usage.completionTokens,
            });

            return {
                response: text,
                usage: cost,
            };
        } catch (error) {
            this.logger.error(`Error generating text: ${error.message}`);
            throw new Error(`Failed to generate text: ${error.message}`);
        }
    }


    /**
     * Generates a structured object matching `options.schema`. Performs a single
     * attempt only — callers that need correction retries (e.g. re-prompting the
     * model with the validation error) are responsible for orchestrating those,
     * since only they know how to build a corrective follow-up prompt.
     *
     * On failure throws `AiGenerationError`, which preserves the raw model text
     * and the underlying validation/parse error so invalid AI output can be
     * persisted and surfaced instead of being swallowed.
     */
    async generateTextWithSchema<T = unknown>(options: AIGenerateOptions): Promise<AIGenerateObjectResponse<T>> {
        const modelAdapter = this.aiConfig.getModelAdapter(
            options.provider,
            options.model,
            options.apiKey,
        );

        try {
            const { object, usage } = await generateObject({
                model: modelAdapter,
                schema: options?.schema || z.record(z.string(), z.unknown()),
                prompt: options.prompt,
                system: options?.system || 'You are a helpful assistant.',
                temperature: options.temperature,
                maxTokens: options.maxTokens,
                topP: options.topP,
                frequencyPenalty: options.frequencyPenalty,
                presencePenalty: options.presencePenalty,
            });

            const cost = calculateAiCost({
                provider: options.provider,
                model: options.model,
                inputTokens: usage.promptTokens,
                outputTokens: usage.completionTokens,
            });

            return {
                response: object as T,
                usage: cost,
            };
        } catch (error) {
            if (NoObjectGeneratedError.isInstance(error)) {
                const cost = error.usage
                    ? calculateAiCost({
                        provider: options.provider,
                        model: options.model,
                        inputTokens: error.usage.promptTokens ?? 0,
                        outputTokens: error.usage.completionTokens ?? 0,
                    })
                    : undefined;

                this.logger.warn(`No object generated: ${error.message}`);

                throw new AiGenerationError(error.message, {
                    cause: error.cause,
                    kind: 'no_object_generated',
                    rawText: error.text,
                    validationError: error.cause,
                    usage: cost,
                });
            }

            this.logger.error(`Error generating object: ${error.message}`, error.stack);
            throw new AiGenerationError(`Failed to generate object: ${error.message}`, { cause: error });
        }
    }

    async streamText(options: AIStreamTextOptions): Promise<void> {
        try {

            this.aiConfig.validateProviderAndModel(options.provider, options.model);

            const modelAdapter = this.aiConfig.getModelAdapter(
                options.provider,
                options.model,
                options.apiKey,
            );

            const stream = await streamText({
                model: modelAdapter,
                system: options.system,
                prompt: options.prompt,
                temperature: options.temperature,
                maxTokens: options.maxTokens,
                topP: options.topP,
                frequencyPenalty: options.frequencyPenalty,
                presencePenalty: options.presencePenalty,
            });

            let fullText = '';

            for await (const chunk of stream.textStream) {
                if (options.onToken) {
                    options.onToken(chunk);
                }
                fullText += chunk;
            }

            if (options.onComplete) {
                options.onComplete(fullText);
            }

        } catch (error) {
            this.logger.error(`Error streaming text: ${error.message}`, error.stack);
            throw new Error(`Failed to stream text: ${error.message}`);
        }
    }

    async embedTextForUser(text: string, userId: string): Promise<number[]> {
        let apiKey: string;

        try {
            const defaultAi =
                await this.credentialResolver.resolveDefaultAiIntegration(userId);
            if (defaultAi.integrationType === IntegrationType.OPENAI) {
                apiKey = defaultAi.apiKey;
            } else {
                const openai = await this.credentialResolver.resolveApiKey({
                    userId,
                    integrationType: IntegrationType.OPENAI,
                });
                apiKey = openai.apiKey;
            }
        } catch {
            const openai = await this.credentialResolver.resolveApiKey({
                userId,
                integrationType: IntegrationType.OPENAI,
            });
            apiKey = openai.apiKey;
        }

        return this.embedText(text, apiKey);
    }

    async embedText(text: string, apiKey: string): Promise<number[]> {
        const embeddingModel = createOpenAI({ apiKey }).embedding(
            'text-embedding-3-small',
        );
        const { embedding } = await embed({
            model: embeddingModel,
            value: text,
        });
        return embedding;
    }

    private async resolveDefaultAiOptions(userId: string) {
        const credentials =
            await this.credentialResolver.resolveDefaultAiIntegration(userId);

        if (!credentials.aiModel) {
            throw new Error('Default AI integration is missing an AI model');
        }

        return {
            provider: integrationTypeToAiProvider(credentials.integrationType),
            model: credentials.aiModel,
            apiKey: credentials.apiKey,
        };
    }


}
