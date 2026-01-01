/**
 * Initialize configuration from environment variables
 * This runs on app startup to load default configurations
 */

import { loadAllProvidersFromEnv, loadDefaultModelsFromEnv, loadGeneralSettingsFromEnv } from './envConfig';
import { llmProviderStore, agentModelStore, generalSettingsStore, AgentNameEnum } from '@extension/storage';

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
export async function initializeAllFromEnv(): Promise<void> {
  await initializeProvidersFromEnv();
  await initializeDefaultModelsFromEnv();
  await initializeGeneralSettingsFromEnv();
}
