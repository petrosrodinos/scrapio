import { z } from 'zod';

export interface AIGenerateOptions {
    provider?: AiProvider;
    model?: AiModel;
    system?: string;
    prompt: string;
    schema?: z.ZodSchema;
    output?: 'json' | 'no-schema';
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    apiKey?: string;
}

export interface AIGenerateTextResponse {
    response: string;
    usage?: AICostResponse
}

export interface AIGenerateObjectResponse<T = unknown> {
    response: T;
    usage?: AICostResponse
}

export type AiGenerationErrorKind = 'no_object_generated' | 'unknown';

export interface AiGenerationErrorOptions {
    cause?: unknown;
    kind?: AiGenerationErrorKind;
    /** Raw text returned by the model when it could not be parsed/validated into the schema. */
    rawText?: string;
    /** The underlying parse/validation error (e.g. a ZodError or JSON parse error). */
    validationError?: unknown;
    /** Usage/cost incurred even though generation ultimately failed. */
    usage?: AICostResponse;
}

/**
 * Thrown by `AiService.generateTextWithSchema` when the AI SDK fails to produce
 * a valid object (unparseable JSON or schema validation failure). Preserves the
 * raw model output and validation details so callers can persist invalid AI
 * output and surface actionable errors instead of a generic message.
 */
export class AiGenerationError extends Error {
    readonly cause?: unknown;
    /** 'no_object_generated' = model responded but output was unparseable/invalid against the
     * schema (worth retrying with a corrective prompt); 'unknown' = infrastructure/auth/network
     * failure (retrying with the same prompt is unlikely to help). */
    readonly kind: AiGenerationErrorKind;
    readonly rawText?: string;
    readonly validationError?: unknown;
    readonly usage?: AICostResponse;

    constructor(message: string, options: AiGenerationErrorOptions = {}) {
        super(message);
        this.name = 'AiGenerationError';
        this.cause = options.cause;
        this.kind = options.kind ?? 'unknown';
        this.rawText = options.rawText;
        this.validationError = options.validationError;
        this.usage = options.usage;
    }
}

export interface AIStreamTextOptions extends AIGenerateOptions {
    onToken?: (token: string) => void;
    onComplete?: (fullText: string) => void;
}

export interface AIModelInfo {
    provider: AiProvider;
    model: AiModel;
}

export interface AICost {
    provider?: AiProvider,
    model?: AiModel,
    inputTokens: number,
    outputTokens: number,
}

export interface AICostResponse {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    inputRate: number;
    outputRate: number;
    inputCost: number;
    outputCost: number;
    totalCost: number;
}

export const AiProviders = {
    openai: 'openai',
    deepseek: 'deepseek',
    grok: 'grok',
    gemini: 'gemini',
    anthropic: 'anthropic',
} as const;

export const AiModels = {
    openai: {
        gpt4o: 'gpt-4o',
        gpt4oMini: 'gpt-4o-mini',
        gpt4Turbo: 'gpt-4-turbo',
        gpt4: 'gpt-4',
        gpt35Turbo: 'gpt-3.5-turbo',
        textEmbedding3Small: 'text-embedding-3-small',
    },
    anthropic: {
        claudeOpus48: 'claude-opus-4-8',
        claudeSonnet46: 'claude-sonnet-4-6',
    },
    deepseek: {
        chat: 'deepseek-chat',
        reasoner: 'deepseek-reasoner',
    },
    grok: {
        grokBeta: 'grok-beta',
        grokPro: 'grok-pro',
    },
    gemini: {
        geminiPro: 'gemini-pro',
        geminiProVision: 'gemini-pro-vision',
        gemini15Pro: 'gemini-1.5-pro',
        gemini15Flash: 'gemini-1.5-flash',
        gemini20Flash: 'gemini-2.0-flash',
        gemini25Pro: 'gemini-2.5-pro',
        gemini25Flash: 'gemini-2.5-flash',
    }
}

export type AiProvider = typeof AiProviders[keyof typeof AiProviders];
export type AiModel = string;
