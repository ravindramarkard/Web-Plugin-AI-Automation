import { StorageEnum } from '../base/enums';
import { createStorage } from '../base/base';
import type { BaseStorage } from '../base/types';
import { AgentNameEnum, llmProviderParameters } from './types';

// Interface for a single model configuration
export interface ModelConfig {
  // providerId, the key of the provider in the llmProviderStore, not the provider name
  provider: string;
  modelName: string;
  parameters?: Record<string, unknown>;
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high'; // For o-series models (OpenAI and Azure)
}

// Interface for storing multiple agent model configurations
export interface AgentModelRecord {
  agents: Record<AgentNameEnum, ModelConfig>;
}

export type AgentModelStorage = BaseStorage<AgentModelRecord> & {
  setAgentModel: (agent: AgentNameEnum, config: ModelConfig, projectId?: string) => Promise<void>;
  getAgentModel: (agent: AgentNameEnum, projectId?: string) => Promise<ModelConfig | undefined>;
  resetAgentModel: (agent: AgentNameEnum, projectId?: string) => Promise<void>;
  hasAgentModel: (agent: AgentNameEnum, projectId?: string) => Promise<boolean>;
  getConfiguredAgents: (projectId?: string) => Promise<AgentNameEnum[]>;
  getAllAgentModels: (projectId?: string) => Promise<Record<AgentNameEnum, ModelConfig>>;
  cleanupLegacyValidatorSettings: () => Promise<void>;
};

const storage = createStorage<AgentModelRecord>(
  'agent-models',
  { agents: {} as Record<AgentNameEnum, ModelConfig> },
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);

// Helper to access project-specific storage
const getProjectStorageKey = (projectId: string) => `project:${projectId}:agent_models`;

const getStorageData = async (projectId?: string): Promise<AgentModelRecord> => {
  if (!projectId) {
    return (await storage.get()) || { agents: {} as Record<AgentNameEnum, ModelConfig> };
  }

  // Access chrome.storage.local directly for project settings
  const chrome = (globalThis as any).chrome;
  if (!chrome?.storage?.local) {
    console.warn('[AgentModelStorage] Chrome storage not available for project settings');
    return { agents: {} as Record<AgentNameEnum, ModelConfig> };
  }

  const key = getProjectStorageKey(projectId);
  const result = await chrome.storage.local.get([key]);
  return (result[key] as AgentModelRecord) || { agents: {} as Record<AgentNameEnum, ModelConfig> };
};

const setStorageData = async (data: AgentModelRecord, projectId?: string): Promise<void> => {
  if (!projectId) {
    await storage.set(data);
    return;
  }

  const chrome = (globalThis as any).chrome;
  if (!chrome?.storage?.local) {
    console.warn('[AgentModelStorage] Chrome storage not available for project settings');
    return;
  }

  const key = getProjectStorageKey(projectId);
  await chrome.storage.local.set({ [key]: data });
};

function validateModelConfig(config: ModelConfig) {
  if (!config.provider || !config.modelName) {
    throw new Error('Provider and model name must be specified');
  }
}

function getModelParameters(agent: AgentNameEnum, provider: string): Record<string, unknown> {
  const providerParams = llmProviderParameters[provider as keyof typeof llmProviderParameters]?.[agent];
  return providerParams ?? { temperature: 0.1, topP: 0.1 };
}

export const agentModelStore: AgentModelStorage = {
  ...storage,
  setAgentModel: async (agent: AgentNameEnum, config: ModelConfig, projectId?: string) => {
    validateModelConfig(config);
    // Merge default parameters with provided parameters
    const defaultParams = getModelParameters(agent, config.provider);
    const mergedConfig = {
      ...config,
      parameters: {
        ...defaultParams,
        ...config.parameters,
      },
    };

    const current = await getStorageData(projectId);
    await setStorageData(
      {
        agents: {
          ...current.agents,
          [agent]: mergedConfig,
        },
      },
      projectId,
    );
  },
  getAgentModel: async (agent: AgentNameEnum, projectId?: string) => {
    const data = await getStorageData(projectId);
    const config = data.agents[agent];
    if (!config) return undefined;

    // Merge default parameters with stored parameters
    const defaultParams = getModelParameters(agent, config.provider);
    return {
      ...config,
      parameters: {
        ...defaultParams,
        ...config.parameters,
      },
    };
  },
  resetAgentModel: async (agent: AgentNameEnum, projectId?: string) => {
    const current = await getStorageData(projectId);
    const newAgents = { ...current.agents };
    delete newAgents[agent];
    await setStorageData({ agents: newAgents }, projectId);
  },
  hasAgentModel: async (agent: AgentNameEnum, projectId?: string) => {
    const data = await getStorageData(projectId);
    return agent in data.agents;
  },
  getConfiguredAgents: async (projectId?: string) => {
    const data = await getStorageData(projectId);
    // Filter out any legacy validator entries for backward compatibility
    return Object.keys(data.agents).filter(
      agentKey => agentKey !== 'validator' && Object.values(AgentNameEnum).includes(agentKey as AgentNameEnum),
    ) as AgentNameEnum[];
  },
  getAllAgentModels: async (projectId?: string) => {
    const data = await getStorageData(projectId);
    // Filter out any legacy validator entries for backward compatibility
    const filteredAgents: Partial<Record<AgentNameEnum, ModelConfig>> = {};
    for (const [agentKey, config] of Object.entries(data.agents)) {
      if (agentKey !== 'validator' && Object.values(AgentNameEnum).includes(agentKey as AgentNameEnum)) {
        filteredAgents[agentKey as AgentNameEnum] = config;
      }
    }
    return filteredAgents as Record<AgentNameEnum, ModelConfig>;
  },
  cleanupLegacyValidatorSettings: async () => {
    // This is a global cleanup, maybe we should also cleanup project specific ones?
    // For now keeping it as is (global only) or should we allow projectId?
    // It's legacy so probably global is fine.
    await storage.set(current => {
      const newAgents = { ...current.agents };
      delete newAgents['validator' as keyof typeof newAgents];
      return { agents: newAgents };
    });
  },
};
