/**
 * Environment variable configuration loader
 * Loads provider configurations from environment variables
 */

import type { ProviderConfig } from '@extension/storage';
import { ProviderTypeEnum, llmProviderModelNames } from '@extension/storage';

/**
 * Load provider configuration from environment variables
 */
export function loadProviderFromEnv(providerType: ProviderTypeEnum): Partial<ProviderConfig> | null {
  const config: Partial<ProviderConfig> = {
    type: providerType,
  };

  switch (providerType) {
    case ProviderTypeEnum.OpenAI:
      if (import.meta.env.VITE_OPENAI_API_KEY) {
        config.apiKey = import.meta.env.VITE_OPENAI_API_KEY;
        config.name = 'OpenAI (from env)';
        if (import.meta.env.VITE_OPENAI_BASE_URL) {
          config.baseUrl = import.meta.env.VITE_OPENAI_BASE_URL;
        }
        config.modelNames = llmProviderModelNames[ProviderTypeEnum.OpenAI];
        return config;
      }
      break;

    case ProviderTypeEnum.Anthropic:
      if (import.meta.env.VITE_ANTHROPIC_API_KEY) {
        config.apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
        config.name = 'Anthropic (from env)';
        if (import.meta.env.VITE_ANTHROPIC_BASE_URL) {
          config.baseUrl = import.meta.env.VITE_ANTHROPIC_BASE_URL;
        }
        config.modelNames = llmProviderModelNames[ProviderTypeEnum.Anthropic];
        return config;
      }
      break;

    case ProviderTypeEnum.Gemini:
      if (import.meta.env.VITE_GOOGLE_API_KEY) {
        config.apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
        config.name = 'Google Gemini (from env)';
        config.modelNames = llmProviderModelNames[ProviderTypeEnum.Gemini];
        return config;
      }
      break;

    case ProviderTypeEnum.Groq:
      if (import.meta.env.VITE_GROQ_API_KEY) {
        config.apiKey = import.meta.env.VITE_GROQ_API_KEY;
        config.name = 'Groq (from env)';
        config.modelNames = llmProviderModelNames[ProviderTypeEnum.Groq];
        return config;
      }
      break;

    case ProviderTypeEnum.DeepSeek:
      if (import.meta.env.VITE_DEEPSEEK_API_KEY) {
        config.apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
        config.name = 'DeepSeek (from env)';
        config.modelNames = llmProviderModelNames[ProviderTypeEnum.DeepSeek];
        return config;
      }
      break;

    case ProviderTypeEnum.Grok:
      if (import.meta.env.VITE_XAI_API_KEY) {
        config.apiKey = import.meta.env.VITE_XAI_API_KEY;
        config.name = 'XAI Grok (from env)';
        config.modelNames = llmProviderModelNames[ProviderTypeEnum.Grok];
        return config;
      }
      break;

    case ProviderTypeEnum.Cerebras:
      if (import.meta.env.VITE_CEREBRAS_API_KEY) {
        config.apiKey = import.meta.env.VITE_CEREBRAS_API_KEY;
        config.name = 'Cerebras (from env)';
        config.modelNames = llmProviderModelNames[ProviderTypeEnum.Cerebras];
        return config;
      }
      break;

    case ProviderTypeEnum.Ollama:
      if (import.meta.env.VITE_OLLAMA_BASE_URL) {
        config.baseUrl = import.meta.env.VITE_OLLAMA_BASE_URL;
        config.name = 'Ollama (from env)';
        config.apiKey = ''; // Ollama doesn't require API key
        config.modelNames = llmProviderModelNames[ProviderTypeEnum.Ollama];
        return config;
      }
      break;

    case ProviderTypeEnum.OpenRouter:
      if (import.meta.env.VITE_OPENROUTER_API_KEY) {
        config.apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
        config.name = 'OpenRouter (from env)';
        config.baseUrl = import.meta.env.VITE_OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
        config.modelNames = llmProviderModelNames[ProviderTypeEnum.OpenRouter];
        return config;
      }
      break;

    case ProviderTypeEnum.Llama:
      if (import.meta.env.VITE_LLAMA_API_KEY) {
        config.apiKey = import.meta.env.VITE_LLAMA_API_KEY;
        config.name = 'Llama API (from env)';
        if (import.meta.env.VITE_LLAMA_BASE_URL) {
          config.baseUrl = import.meta.env.VITE_LLAMA_BASE_URL;
        }
        config.modelNames = llmProviderModelNames[ProviderTypeEnum.Llama];
        return config;
      }
      break;

    case ProviderTypeEnum.AzureOpenAI:
      if (import.meta.env.VITE_AZURE_OPENAI_API_KEY && import.meta.env.VITE_AZURE_OPENAI_ENDPOINT) {
        config.apiKey = import.meta.env.VITE_AZURE_OPENAI_API_KEY;
        config.baseUrl = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;
        config.azureApiVersion = import.meta.env.VITE_AZURE_OPENAI_API_VERSION || '2024-02-15-preview';
        config.name = 'Azure OpenAI (from env)';
        if (import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT_NAMES) {
          config.azureDeploymentNames = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT_NAMES.split(',').map(s =>
            s.trim(),
          );
        } else {
          config.azureDeploymentNames = llmProviderModelNames[ProviderTypeEnum.AzureOpenAI];
        }
        return config;
      }
      break;

    case ProviderTypeEnum.CustomOpenAI:
      if (import.meta.env.VITE_CUSTOM_OPENAI_BASE_URL) {
        config.baseUrl = import.meta.env.VITE_CUSTOM_OPENAI_BASE_URL;
        config.name = 'Custom OpenAI (from env)';
        if (import.meta.env.VITE_CUSTOM_OPENAI_API_KEY) {
          config.apiKey = import.meta.env.VITE_CUSTOM_OPENAI_API_KEY;
        }
        return config;
      }
      break;
  }

  return null;
}

/**
 * Load all providers from environment variables
 */
export function loadAllProvidersFromEnv(): Record<string, ProviderConfig> {
  const providers: Record<string, ProviderConfig> = {};

  const providerTypes = [
    ProviderTypeEnum.OpenAI,
    ProviderTypeEnum.Anthropic,
    ProviderTypeEnum.Gemini,
    ProviderTypeEnum.Groq,
    ProviderTypeEnum.DeepSeek,
    ProviderTypeEnum.Grok,
    ProviderTypeEnum.Cerebras,
    ProviderTypeEnum.Ollama,
    ProviderTypeEnum.OpenRouter,
    ProviderTypeEnum.Llama,
    ProviderTypeEnum.AzureOpenAI,
    ProviderTypeEnum.CustomOpenAI,
  ];

  for (const providerType of providerTypes) {
    const config = loadProviderFromEnv(providerType);
    if (config) {
      // Use provider type as the key, or add a suffix for multiple instances
      const key = providerType;
      providers[key] = config as ProviderConfig;
    }
  }

  return providers;
}

/**
 * Load default model settings from environment variables
 */
export function loadDefaultModelsFromEnv(): {
  navigator?: string;
  planner?: string;
} {
  return {
    navigator: import.meta.env.VITE_DEFAULT_NAVIGATOR_MODEL || undefined,
    planner: import.meta.env.VITE_DEFAULT_PLANNER_MODEL || undefined,
  };
}

/**
 * Load general settings from environment variables
 */
export function loadGeneralSettingsFromEnv(): {
  maxSteps?: number;
  replayHistoricalTasks?: boolean;
} {
  const settings: {
    maxSteps?: number;
    replayHistoricalTasks?: boolean;
  } = {};

  if (import.meta.env.VITE_MAX_STEPS) {
    const maxSteps = parseInt(import.meta.env.VITE_MAX_STEPS, 10);
    if (!isNaN(maxSteps)) {
      settings.maxSteps = maxSteps;
    }
  }

  if (import.meta.env.VITE_REPLAY_HISTORICAL_TASKS) {
    settings.replayHistoricalTasks = import.meta.env.VITE_REPLAY_HISTORICAL_TASKS === 'true';
  }

  return settings;
}
