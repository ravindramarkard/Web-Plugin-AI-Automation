import { ChatOpenAI } from '@langchain/openai';
import db from '../db/index.js';

export async function createLLM(agentName?: string, projectId?: string) {
  // Try to get settings from DB
  const settings = db.prepare('SELECT * FROM settings').all();
  const settingsMap: Record<string, any> = settings.reduce((acc: any, curr: any) => {
    try {
      acc[curr.key] = JSON.parse(curr.value);
    } catch (e) {
      acc[curr.key] = curr.value;
    }
    return acc;
  }, {}) as Record<string, any>;

  // Determine which settings to use (Project-specific or Global)
  let llmProviders = settingsMap.llm_providers?.providers || {};
  let agentModels = settingsMap.agent_models?.agents || settingsMap.agent_models || {};

  if (projectId) {
    const projectProvidersKey = `project:${projectId}:llm_providers`;
    if (settingsMap[projectProvidersKey]?.providers) {
      llmProviders = settingsMap[projectProvidersKey].providers;
      console.log(`[createLLM] Using project-specific providers for project: ${projectId}`);
    }

    const projectAgentModelsKey = `project:${projectId}:agent_models`;
    if (settingsMap[projectAgentModelsKey]) {
      agentModels = settingsMap[projectAgentModelsKey].agents || settingsMap[projectAgentModelsKey];
      console.log(`[createLLM] Using project-specific agent models for project: ${projectId}`);
    }
  }

  // Determine model name and provider config
  let providerConfig;
  let modelName = 'gpt-4o';
  let modelParams: any = {};

  // 1. Try to find configuration for the specific agent
  if (agentName && agentModels[agentName]) {
    const agentModelConfig = agentModels[agentName];
    const providerId = agentModelConfig.provider;

    if (providerId && llmProviders[providerId]) {
      providerConfig = llmProviders[providerId];
      modelName = agentModelConfig.modelName;
      if (agentModelConfig.parameters) {
        modelParams = { ...agentModelConfig.parameters };
      }
      console.log(`[createLLM] Using configured model for agent ${agentName}: ${providerId} > ${modelName}`);
    }
  }

  // 2. Fallback: Try to find OpenAI provider first, or any other compatible provider
  if (!providerConfig) {
    // Try OpenAI
    if (llmProviders['openai']) {
      providerConfig = llmProviders['openai'];
    }
    // Try Azure OpenAI
    else if (llmProviders['azure_openai']) {
      providerConfig = llmProviders['azure_openai'];
    }
    // Try OpenRouter
    else if (llmProviders['openrouter']) {
      providerConfig = llmProviders['openrouter'];
    }
    // Fallback to any provider with an API key
    else {
      const availableProviderKey = Object.keys(llmProviders).find(key => llmProviders[key].apiKey);
      if (availableProviderKey) {
        providerConfig = llmProviders[availableProviderKey];
      }
    }

    // If we fell back to a provider, pick its first model
    if (providerConfig) {
      if (providerConfig.modelNames && providerConfig.modelNames.length > 0) {
        modelName = providerConfig.modelNames[0];
      }
      console.log(
        `[createLLM] Fallback: Using first available model from provider ${providerConfig.name || 'unknown'}: ${modelName}`,
      );
    }
  }

  const openAIApiKey = process.env.OPENAI_API_KEY || providerConfig?.apiKey || settingsMap.openai_api_key;

  console.log('[createLLM] Provider found:', providerConfig ? providerConfig.name : 'None');
  console.log('[createLLM] Using API Key:', openAIApiKey ? '***' + openAIApiKey.slice(-4) : 'Missing');

  if (!openAIApiKey) {
    throw new Error('OpenAI API Key not found. Please configure it in settings or environment variables.');
  }

  console.log('[createLLM] Final Model:', modelName);

  const config: any = {
    openAIApiKey: openAIApiKey, // Legacy support
    apiKey: openAIApiKey, // Standard support
    modelName: modelName,
    temperature: modelParams.temperature ?? 0,
    ...modelParams,
  };

  if (providerConfig) {
    if (providerConfig.baseUrl) {
      console.log('[createLLM] Using Custom Base URL:', providerConfig.baseUrl);
      config.configuration = {
        baseURL: providerConfig.baseUrl,
      };
    }
    if (providerConfig.type === 'azure_openai') {
      config.azureOpenAIApiKey = providerConfig.apiKey;
      config.azureOpenAIApiInstanceName = providerConfig.baseUrl?.split('.')[0]?.replace('https://', ''); // Rudimentary parsing
      config.azureOpenAIApiDeploymentName = providerConfig.azureDeploymentNames?.[0];

      // If modelName matches one of the deployments, use it
      if (providerConfig.azureDeploymentNames?.includes(modelName)) {
        config.azureOpenAIApiDeploymentName = modelName;
      }

      config.azureOpenAIApiVersion = providerConfig.azureApiVersion;
      delete config.openAIApiKey; // Cleanup
    }
  }

  return new ChatOpenAI(config);
}
