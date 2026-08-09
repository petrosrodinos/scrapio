import { Injectable } from '@nestjs/common';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { AIModelInfo, AiModels, AiProvider, AiProviders } from '../interfaces/ai.interface';

@Injectable()
export class AiConfig {

    private readonly supportedModels: AIModelInfo[] = [
        { provider: AiProviders.openai, model: AiModels.openai.gpt4o },
        { provider: AiProviders.openai, model: AiModels.openai.gpt4oMini },
        { provider: AiProviders.openai, model: AiModels.openai.gpt4Turbo },
        { provider: AiProviders.openai, model: AiModels.openai.gpt4 },
        { provider: AiProviders.openai, model: AiModels.openai.gpt35Turbo },
        { provider: AiProviders.deepseek, model: AiModels.deepseek.chat },
        { provider: AiProviders.deepseek, model: AiModels.deepseek.reasoner },
        { provider: AiProviders.grok, model: AiModels.grok.grokBeta },
        { provider: AiProviders.grok, model: AiModels.grok.grokPro },
        { provider: AiProviders.gemini, model: AiModels.gemini.geminiPro },
        { provider: AiProviders.gemini, model: AiModels.gemini.geminiProVision },
        { provider: AiProviders.gemini, model: AiModels.gemini.gemini15Pro },
        { provider: AiProviders.gemini, model: AiModels.gemini.gemini15Flash },
        { provider: AiProviders.gemini, model: AiModels.gemini.gemini20Flash },
        { provider: AiProviders.gemini, model: AiModels.gemini.gemini25Pro },
        { provider: AiProviders.gemini, model: AiModels.gemini.gemini25Flash },
    ];

    getModelAdapter(
        provider: AiProvider = AiProviders.openai,
        model: string = AiModels.openai.gpt4o,
        apiKey?: string,
    ) {
        switch (provider) {
            case AiProviders.openai:
                if (!apiKey) {
                    throw new Error('OpenAI API key is required');
                }
                return createOpenAI({ apiKey })(model);
            case AiProviders.deepseek:
                if (!apiKey) {
                    throw new Error('DeepSeek API key is required');
                }
                return createDeepSeek({ apiKey })(model);
            case AiProviders.grok:
                throw new Error('Grok provider not yet implemented. SDK required.');
            case AiProviders.gemini:
                if (!apiKey) {
                    throw new Error('Gemini API key is required');
                }
                return createGoogleGenerativeAI({ apiKey })(model);
            default:
                if (!apiKey) {
                    throw new Error('OpenAI API key is required');
                }
                return createOpenAI({ apiKey })(model);
        }
    }


    isModelSupported(provider: AiProvider, model: string): boolean {
        return this.supportedModels.some(
            supportedModel => supportedModel.provider === provider && supportedModel.model === model
        );
    }

    getSupportedModels(): AIModelInfo[] {
        return [...this.supportedModels];
    }

    getModelsByProvider(provider: AiProvider): AIModelInfo[] {
        return this.supportedModels.filter(model => model.provider === provider);
    }

    validateProviderAndModel(provider: AiProvider, model: string): void {
        if (!this.isModelSupported(provider, model)) {
            const availableModels = this.getModelsByProvider(provider)
                .map(m => m.model)
                .join(', ');

            throw new Error(
                `Model ${model} is not supported for provider ${provider}. ` +
                `Available models for ${provider}: ${availableModels || 'none'}`
            );
        }
    }
}
