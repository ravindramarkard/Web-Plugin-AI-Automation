/**
 * Web-compatible LLM connection test
 * Tests LLM provider connections without requiring Chrome extension
 */

import type { ProviderConfig } from '@extension/storage';
import { ProviderTypeEnum } from '@extension/storage';
import { HumanMessage } from '@langchain/core/messages';
import { ChatOpenAI, AzureChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatXAI } from '@langchain/xai';
import { ChatGroq } from '@langchain/groq';
import { ChatCerebras } from '@langchain/cerebras';
import { ChatOllama } from '@langchain/ollama';
import { ChatDeepSeek } from '@langchain/deepseek';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';

const maxTokens = 1024 * 4;

// Custom ChatLlama class to handle Llama API response format
class ChatLlama extends ChatOpenAI {
  constructor(args: any) {
    super(args);
  }

  async completionWithRetry(request: any, options?: any): Promise<any> {
    try {
      // @ts-ignore - Accessing protected/internal method
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

function createChatModel(
  providerConfig: ProviderConfig,
  modelConfig: {
    provider: string;
    modelName: string;
    parameters: { temperature: number; topP: number };
  },
): BaseChatModel {
  const { provider, modelName, parameters } = modelConfig;
  const { temperature, topP } = parameters;

  // Extract model name without provider prefix
  let cleanModelName = modelName;
  if (modelName.includes('>')) {
    cleanModelName = modelName.split('>')[1];
  }
  if (cleanModelName.startsWith('openai/')) {
    cleanModelName = cleanModelName.substring(7);
  }

  const baseConfig = {
    temperature,
    topP,
    maxTokens,
  };

  switch (providerConfig.type) {
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
        ...baseConfig,
      };
      if (providerConfig.baseUrl) {
        args.configuration = { baseURL: providerConfig.baseUrl };
      }
      return new ChatOpenAI(args);
    }

    case ProviderTypeEnum.CustomOpenAI: {
      const args: {
        model: string;
        apiKey?: string;
        configuration?: { baseURL?: string };
        temperature?: number;
        topP?: number;
        maxTokens?: number;
      } = {
        model: cleanModelName,
        ...baseConfig,
      };
      // Custom providers may not have an API key
      if (providerConfig.apiKey) {
        args.apiKey = providerConfig.apiKey;
      }
      if (providerConfig.baseUrl) {
        args.configuration = { baseURL: providerConfig.baseUrl };
      }
      return new ChatOpenAI(args);
    }

    case ProviderTypeEnum.AzureOpenAI:
      return new AzureChatOpenAI({
        ...baseConfig,
        azureOpenAIApiKey: providerConfig.apiKey,
        azureOpenAIApiInstanceName:
          providerConfig.baseUrl?.replace('https://', '').replace('.openai.azure.com', '') || '',
        azureOpenAIApiDeploymentName: cleanModelName,
        azureOpenAIApiVersion: providerConfig.azureApiVersion || '2024-02-15-preview',
      });

    case ProviderTypeEnum.Anthropic:
      return new ChatAnthropic({
        ...baseConfig,
        model: cleanModelName,
        apiKey: providerConfig.apiKey,
        clientOptions: {
          baseURL: providerConfig.baseUrl,
        },
      });

    case ProviderTypeEnum.Gemini:
      return new ChatGoogleGenerativeAI({
        ...baseConfig,
        model: cleanModelName,
        apiKey: providerConfig.apiKey,
      });

    case ProviderTypeEnum.Grok:
      return new ChatXAI({
        ...baseConfig,
        model: cleanModelName,
        apiKey: providerConfig.apiKey,
      });

    case ProviderTypeEnum.Groq:
      return new ChatGroq({
        ...baseConfig,
        model: cleanModelName,
        apiKey: providerConfig.apiKey,
      });

    case ProviderTypeEnum.Cerebras:
      return new ChatCerebras({
        ...baseConfig,
        model: cleanModelName,
        apiKey: providerConfig.apiKey,
      });

    case ProviderTypeEnum.Ollama:
      return new ChatOllama({
        ...baseConfig,
        model: cleanModelName,
        baseUrl: providerConfig.baseUrl,
      });

    case ProviderTypeEnum.DeepSeek:
      return new ChatDeepSeek({
        ...baseConfig,
        model: cleanModelName,
        apiKey: providerConfig.apiKey,
      });

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
        ...baseConfig,
      };
      if (providerConfig.baseUrl) {
        args.configuration = { baseURL: providerConfig.baseUrl };
      }
      return new ChatLlama(args);
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
        ...baseConfig,
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

    case ProviderTypeEnum.GLM: {
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
        ...baseConfig,
      };
      args.configuration = {
        baseURL: providerConfig.baseUrl || 'https://open.bigmodel.cn/api/paas/v4/',
      };
      return new ChatOpenAI(args);
    }

    default:
      throw new Error(`Unsupported provider type: ${providerConfig.type}`);
  }
}

export interface TestConnectionParams {
  providerConfig: ProviderConfig;
  modelName: string;
  providerId: string;
}

export async function testLLMConnection(
  params: TestConnectionParams,
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const { providerConfig, modelName, providerId } = params;

    // Validate required fields
    if (!providerConfig || !modelName) {
      return { success: false, error: 'Missing provider config or model name' };
    }

    // Create a test model config
    const testModelConfig = {
      provider: providerId || providerConfig.type || 'custom_openai',
      modelName: modelName,
      parameters: {
        temperature: 0.1,
        topP: 0.1,
      },
    };

    // Create the chat model
    const chatModel = createChatModel(providerConfig, testModelConfig);

    // Make a simple test call with a timeout
    const testMessage = new HumanMessage('test');
    // Reasoning models (like o1, DeepSeek R1) can be slow to start responding
    const timeoutMs = 120000; // 2 minutes
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              `Connection test timed out after ${timeoutMs / 1000} seconds. The model might be generating a long reasoning trace.`,
            ),
          ),
        timeoutMs,
      ),
    );

    await Promise.race([chatModel.invoke([testMessage]), timeoutPromise]);

    return { success: true, message: 'Connection test successful' };
  } catch (error) {
    console.error('LLM Connection Test Error:', error);
    let errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    // Handle specific error case often seen with incompatible API responses
    if (errorMessage.includes("Cannot read properties of undefined (reading 'message')")) {
      errorMessage = 'Invalid response from provider. Please check your API Key and Base URL.';
    } else if (errorMessage.includes('404')) {
      errorMessage = `Model "${params.modelName}" not found (404). Please check:
1. The model name is correct.
2. You have access to this model.
3. The Base URL is correct (if using a custom provider).`;
    } else if (errorMessage.includes('401')) {
      errorMessage = 'Unauthorized (401). Please check your API Key.';
    }

    return { success: false, error: errorMessage };
  }
}
