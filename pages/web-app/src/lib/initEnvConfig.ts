/**
 * Initialize configuration from environment variables
 * This runs on app startup to load default configurations
 */

import { loadAllProvidersFromEnv, loadDefaultModelsFromEnv, loadGeneralSettingsFromEnv } from './envConfig';
import {
  llmProviderStore,
  agentModelStore,
  generalSettingsStore,
  AgentNameEnum,
  type ProviderConfig,
  type ModelConfig,
} from '@extension/storage';
import { apiGet } from './apiConfig';

/**
 * Initialize providers from environment variables
 * Only adds providers that don't already exist in storage
 */
export async function initializeProvidersFromEnv(): Promise<void> {
  try {
    const envProviders = loadAllProvidersFromEnv();
    const existingProviders = await llmProviderStore.getAllProviders();

    for (const [providerId, config] of Object.entries(envProviders)) {
      // Only add if provider doesn't already exist
      if (!existingProviders[providerId]) {
        await llmProviderStore.setProvider(providerId, config);
        console.log(`[EnvConfig] Loaded provider from env: ${providerId}`);
      } else {
        console.log(`[EnvConfig] Provider ${providerId} already exists, skipping env config`);
      }
    }
  } catch (error) {
    console.error('[EnvConfig] Error initializing providers from env:', error);
  }
}

/**
 * Initialize default models from environment variables
 */
export async function initializeDefaultModelsFromEnv(): Promise<void> {
  try {
    const defaultModels = loadDefaultModelsFromEnv();
    const existingModels = await agentModelStore.getAllAgentModels();

    if (defaultModels.navigator && !existingModels[AgentNameEnum.Navigator]) {
      // Find the provider for the navigator model
      const providers = await llmProviderStore.getAllProviders();
      for (const [providerId, providerConfig] of Object.entries(providers)) {
        const modelNames = providerConfig.modelNames || [];
        if (modelNames.includes(defaultModels.navigator)) {
          await agentModelStore.setAgentModel(AgentNameEnum.Navigator, {
            provider: providerId,
            modelName: defaultModels.navigator,
            parameters: {
              temperature: 0.3,
              topP: 0.85,
            },
          });
          console.log(`[EnvConfig] Set default navigator model: ${defaultModels.navigator}`);
          break;
        }
      }
    }

    if (defaultModels.planner && !existingModels[AgentNameEnum.Planner]) {
      const providers = await llmProviderStore.getAllProviders();
      for (const [providerId, providerConfig] of Object.entries(providers)) {
        const modelNames = providerConfig.modelNames || [];
        if (modelNames.includes(defaultModels.planner)) {
          await agentModelStore.setAgentModel(AgentNameEnum.Planner, {
            provider: providerId,
            modelName: defaultModels.planner,
            parameters: {
              temperature: 0.7,
              topP: 0.9,
            },
          });
          console.log(`[EnvConfig] Set default planner model: ${defaultModels.planner}`);
          break;
        }
      }
    }
  } catch (error) {
    console.error('[EnvConfig] Error initializing default models from env:', error);
  }
}

/**
 * Initialize general settings from environment variables
 */
export async function initializeGeneralSettingsFromEnv(): Promise<void> {
  try {
    const envSettings = loadGeneralSettingsFromEnv();
    const currentSettings = await generalSettingsStore.getSettings();

    let hasChanges = false;
    const updates: Partial<typeof currentSettings> = {};

    if (envSettings.maxSteps !== undefined && currentSettings.maxSteps !== envSettings.maxSteps) {
      updates.maxSteps = envSettings.maxSteps;
      hasChanges = true;
    }

    if (
      envSettings.replayHistoricalTasks !== undefined &&
      currentSettings.replayHistoricalTasks !== envSettings.replayHistoricalTasks
    ) {
      updates.replayHistoricalTasks = envSettings.replayHistoricalTasks;
      hasChanges = true;
    }

    if (hasChanges) {
      await generalSettingsStore.updateSettings(updates);
      console.log('[EnvConfig] Updated general settings from env');
    }
  } catch (error) {
    console.error('[EnvConfig] Error initializing general settings from env:', error);
  }
}

/**
 * Initialize all configurations from environment variables
 */
/**
 * Initialize settings from server (SQL database)
 * This ensures persistence across sessions/devices
 */
export async function initializeSettingsFromServer(): Promise<void> {
  try {
    console.log('[InitConfig] Fetching settings from server...');
    const settings = await apiGet<Record<string, any>>('/api/settings', false); // No cache to get latest

    if (!settings) return;

    // 1. Load Global LLM Providers
    if (settings['llm_providers']?.providers) {
      const providers = settings['llm_providers'].providers as Record<string, ProviderConfig>;
      for (const [providerId, config] of Object.entries(providers)) {
        await llmProviderStore.setProvider(providerId, config);
      }
      console.log(`[InitConfig] Loaded ${Object.keys(providers).length} providers from server`);
    }

    // 2. Load Global Agent Models
    if (settings['agent_models']?.agents) {
      const agents = settings['agent_models'].agents as Record<AgentNameEnum, ModelConfig>;
      for (const [agentName, config] of Object.entries(agents)) {
        if (Object.values(AgentNameEnum).includes(agentName as AgentNameEnum)) {
          await agentModelStore.setAgentModel(agentName as AgentNameEnum, config);
        }
      }
      console.log(`[InitConfig] Loaded models for ${Object.keys(agents).length} agents from server`);
    }

    // 3. Load Project-specific settings
    for (const [key, value] of Object.entries(settings)) {
      if (key.startsWith('project:') && key.endsWith(':agent_models')) {
        // Format: project:{projectId}:agent_models
        const match = key.match(/^project:(.+):agent_models$/);
        if (match && value?.agents) {
          const projectId = match[1];
          const agents = value.agents as Record<AgentNameEnum, ModelConfig>;
          for (const [agentName, config] of Object.entries(agents)) {
            if (Object.values(AgentNameEnum).includes(agentName as AgentNameEnum)) {
              await agentModelStore.setAgentModel(agentName as AgentNameEnum, config, projectId);
            }
          }
          console.log(`[InitConfig] Loaded models for project ${projectId} from server`);
        }
      } else if (key.startsWith('project:') && key.endsWith(':llm_providers')) {
        // Format: project:{projectId}:llm_providers
        const match = key.match(/^project:(.+):llm_providers$/);
        if (match && value?.providers) {
          const projectId = match[1];
          const providers = value.providers as Record<string, ProviderConfig>;
          for (const [providerId, config] of Object.entries(providers)) {
            await llmProviderStore.setProvider(providerId, config, projectId);
          }
          console.log(`[InitConfig] Loaded providers for project ${projectId} from server`);
        }
      }
    }
  } catch (error) {
    console.warn('[InitConfig] Failed to load settings from server (server might be offline):', error);
  }
}

export async function initializeAllFromEnv(): Promise<void> {
  await initializeProvidersFromEnv();
  await initializeDefaultModelsFromEnv();
  await initializeGeneralSettingsFromEnv();
  // Load from server last to override env defaults with user saved settings
  await initializeSettingsFromServer();
}
