/**
 * Web-compatible createChatModel function
 * Creates chat models without importing from chrome-extension
 */

import type { ProviderConfig, ModelConfig } from '@extension/storage';
import { ProviderTypeEnum } from '@extension/storage';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatOpenAI, AzureChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatXAI } from '@langchain/xai';
import { ChatGroq } from '@langchain/groq';
import { ChatCerebras } from '@langchain/cerebras';
import { ChatOllama } from '@langchain/ollama';
import { ChatDeepSeek } from '@langchain/deepseek';

const maxTokens = 1024 * 4;

// Custom ChatLlama class to handle Llama API response format
class ChatLlama extends ChatOpenAI {
  constructor(args: any) {
    super(args);
  }

  async completionWithRetry(request: any, options?: any): Promise<any> {
    try {
      const response = await super.completionWithRetry(request, options);
      if (response?.completion_message?.content?.text) {
        const transformedResponse = {
          id: response.id || 'llama-response',
          object: 'chat.completion',
          created: Date.now(),
          model: request.model,
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: response.completion_message.content.text,
              },
              finish_reason: response.completion_message.stop_reason || 'stop',
            },
          ],
          usage: {
            prompt_tokens: response.metrics?.find((m: any) => m.metric === 'num_prompt_tokens')?.value || 0,
            completion_tokens: response.metrics?.find((m: any) => m.metric === 'num_completion_tokens')?.value || 0,
            total_tokens: response.metrics?.find((m: any) => m.metric === 'num_total_tokens')?.value || 0,
          },
        };
        return transformedResponse;
      }
      return response;
    } catch (error) {
      throw error;
    }
  }
}

function isAzureProvider(providerId: string): boolean {
  return providerId === ProviderTypeEnum.AzureOpenAI || providerId.startsWith(`${ProviderTypeEnum.AzureOpenAI}_`);
}

function extractInstanceNameFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const match = hostname.match(/^([^.]+)\.openai\.azure\.com$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export function createChatModel(
  providerConfig: ProviderConfig,
  modelConfig: ModelConfig | { provider: string; modelName: string; parameters: { temperature: number; topP: number } },
): BaseChatModel {
  const temperature = (modelConfig.parameters?.temperature ?? 0.1) as number;
  const topP = (modelConfig.parameters?.topP ?? 0.1) as number;

  // Extract and clean model name
  let cleanModelName = modelConfig.modelName;
  if (cleanModelName.includes('>')) {
    cleanModelName = cleanModelName.split('>')[1];
  }
  if (cleanModelName.startsWith('openai/')) {
    cleanModelName = cleanModelName.substring(7);
  }

  const isAzure = isAzureProvider(modelConfig.provider);

  if (isAzure) {
    if (
      !providerConfig.baseUrl ||
      !providerConfig.azureDeploymentNames ||
      !providerConfig.azureApiVersion ||
      !providerConfig.apiKey
    ) {
      throw new Error('Azure configuration is incomplete');
    }

    const deploymentName = cleanModelName;
    const instanceName = extractInstanceNameFromUrl(providerConfig.baseUrl);
    if (!instanceName) {
      throw new Error(`Could not extract Instance Name from Azure Endpoint URL: ${providerConfig.baseUrl}`);
    }

    return new AzureChatOpenAI({
      azureOpenAIApiInstanceName: instanceName,
      azureOpenAIApiDeploymentName: deploymentName,
      azureOpenAIApiKey: providerConfig.apiKey,
      azureOpenAIApiVersion: providerConfig.azureApiVersion,
      model: deploymentName,
      temperature,
      topP,
      maxTokens,
    });
  }

  switch (modelConfig.provider) {
    case ProviderTypeEnum.OpenAI: {
      const args: {
        model: string;
        apiKey: string;
        configuration?: { baseURL?: string };
        temperature?: number;
        topP?: number;
        maxTokens?: number;
      } = {
        model: cleanModelName,
        apiKey: providerConfig.apiKey || '',
        ...{ temperature, topP, maxTokens },
      };
      if (providerConfig.baseUrl) {
        args.configuration = { baseURL: providerConfig.baseUrl };
      }
      return new ChatOpenAI(args);
    }

    case ProviderTypeEnum.Anthropic: {
      return new ChatAnthropic({
        model: cleanModelName,
        apiKey: providerConfig.apiKey,
        maxTokens,
        temperature,
      });
    }

    case ProviderTypeEnum.DeepSeek: {
      return new ChatDeepSeek({
        model: cleanModelName,
        apiKey: providerConfig.apiKey,
        temperature,
        topP,
      }) as BaseChatModel;
    }

    case ProviderTypeEnum.Gemini: {
      return new ChatGoogleGenerativeAI({
        model: cleanModelName,
        apiKey: providerConfig.apiKey,
        temperature,
        topP,
      });
    }

    case ProviderTypeEnum.Grok: {
      return new ChatXAI({
        model: cleanModelName,
        xaiApiKey: providerConfig.apiKey,
        temperature,
        topP,
      });
    }

    case ProviderTypeEnum.Groq: {
      return new ChatGroq({
        model: cleanModelName,
        groqApiKey: providerConfig.apiKey,
        temperature,
        topP,
      });
    }

    case ProviderTypeEnum.Cerebras: {
      return new ChatCerebras({
        model: cleanModelName,
        cerebrasApiKey: providerConfig.apiKey,
        temperature,
        topP,
      });
    }

    case ProviderTypeEnum.Ollama: {
      return new ChatOllama({
        model: cleanModelName,
        baseURL: providerConfig.baseUrl || 'http://localhost:11434',
        temperature,
        topP,
        numCtx: maxTokens,
      });
    }

    case ProviderTypeEnum.OpenRouter: {
      const args: {
        model: string;
        apiKey: string;
        configuration?: { baseURL?: string; defaultHeaders?: Record<string, string> };
        temperature?: number;
        topP?: number;
        maxTokens?: number;
      } = {
        model: cleanModelName,
        apiKey: providerConfig.apiKey || '',
        ...{ temperature, topP, maxTokens },
      };
      args.configuration = {
        baseURL: providerConfig.baseUrl || 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://aitestgen.app',
          'X-Title': 'AITestGen Web App',
        },
      };
      return new ChatOpenAI(args);
    }

    case ProviderTypeEnum.Llama: {
      const args: {
        model: string;
        apiKey: string;
        configuration?: { baseURL?: string };
        temperature?: number;
        topP?: number;
        maxTokens?: number;
      } = {
        model: cleanModelName,
        apiKey: providerConfig.apiKey || '',
        ...{ temperature, topP, maxTokens },
      };
      if (providerConfig.baseUrl) {
        args.configuration = { baseURL: providerConfig.baseUrl };
      }
      return new ChatLlama(args);
    }

    default: {
      // Default to OpenAI-compatible
      const args: {
        model: string;
        apiKey?: string;
        configuration?: { baseURL?: string };
        temperature?: number;
        topP?: number;
        maxTokens?: number;
      } = {
        model: cleanModelName,
        ...{ temperature, topP, maxTokens },
      };
      if (providerConfig.apiKey) {
        args.apiKey = providerConfig.apiKey;
      }
      if (providerConfig.baseUrl) {
        args.configuration = { baseURL: providerConfig.baseUrl };
      }
      return new ChatOpenAI(args);
    }
  }
}
