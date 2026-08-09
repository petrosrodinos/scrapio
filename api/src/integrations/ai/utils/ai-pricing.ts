import { AiProviders, AiModels } from '../interfaces/ai.interface';

export const AiPricing = {
    [AiProviders.openai]: {
        [AiModels.openai.gpt4o]: { input: 0.00001, output: 0.00003 },
        [AiModels.openai.gpt4oMini]: { input: 0.000005, output: 0.000015 },
        [AiModels.openai.gpt4Turbo]: { input: 0.00001, output: 0.00003 },
        [AiModels.openai.gpt4]: { input: 0.000012, output: 0.00004 },
        [AiModels.openai.gpt35Turbo]: { input: 0.0000015, output: 0.000002 },
    },

    [AiProviders.deepseek]: {
        [AiModels.deepseek.chat]: { input: 0.00000014, output: 0.00000028 },
        [AiModels.deepseek.reasoner]: { input: 0.00000055, output: 0.00000219 },
    },

    [AiProviders.grok]: {
        [AiModels.grok.grokPro]: { input: 0.00002, output: 0.00004 },
        [AiModels.grok.grokBeta]: { input: 0.000015, output: 0.00003 },
    },

    [AiProviders.gemini]: {
        [AiModels.gemini.gemini15Pro]: { input: 0.000009, output: 0.000027 },
        [AiModels.gemini.gemini15Flash]: { input: 0.000003, output: 0.000006 },
        [AiModels.gemini.geminiPro]: { input: 0.000008, output: 0.00002 },
        [AiModels.gemini.geminiProVision]: { input: 0.000008, output: 0.00002 },
        [AiModels.gemini.gemini20Flash]: { input: 0.0000001, output: 0.0000004 },
        [AiModels.gemini.gemini25Pro]: { input: 0.00000125, output: 0.00001 },
        [AiModels.gemini.gemini25Flash]: { input: 0.0000003, output: 0.0000025 },
    },
} as const;
