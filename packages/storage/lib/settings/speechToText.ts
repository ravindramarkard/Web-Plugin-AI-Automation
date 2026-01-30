import { StorageEnum } from '../base/enums';
import { createStorage } from '../base/base';
import type { BaseStorage } from '../base/types';

export interface SpeechToTextModelConfig {
  provider: string;
  modelName: string;
}

export interface SpeechToTextRecord {
  speechToTextModel?: SpeechToTextModelConfig;
}

export type SpeechToTextStorage = BaseStorage<SpeechToTextRecord> & {
  setSpeechToTextModel: (config: SpeechToTextModelConfig, projectId?: string) => Promise<void>;
  getSpeechToTextModel: (projectId?: string) => Promise<SpeechToTextModelConfig | undefined>;
  resetSpeechToTextModel: (projectId?: string) => Promise<void>;
  hasSpeechToTextModel: (projectId?: string) => Promise<boolean>;
};

const storage = createStorage<SpeechToTextRecord>(
  'speech-to-text-model',
  { speechToTextModel: undefined },
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);

// Helper to access project-specific storage
const getProjectStorageKey = (projectId: string) => `speech-to-text-model-${projectId}`;

const getStorageData = async (projectId?: string): Promise<SpeechToTextRecord> => {
  if (!projectId) {
    return (await storage.get()) || { speechToTextModel: undefined };
  }

  // Access chrome.storage.local directly for project settings
  const chrome = (globalThis as any).chrome;
  if (!chrome?.storage?.local) {
    console.warn('[SpeechToTextStorage] Chrome storage not available for project settings');
    return { speechToTextModel: undefined };
  }

  const key = getProjectStorageKey(projectId);
  const result = await chrome.storage.local.get([key]);
  return (result[key] as SpeechToTextRecord) || { speechToTextModel: undefined };
};

const setStorageData = async (data: SpeechToTextRecord, projectId?: string): Promise<void> => {
  if (!projectId) {
    await storage.set(data);
    return;
  }

  const chrome = (globalThis as any).chrome;
  if (!chrome?.storage?.local) {
    console.warn('[SpeechToTextStorage] Chrome storage not available for project settings');
    return;
  }

  const key = getProjectStorageKey(projectId);
  await chrome.storage.local.set({ [key]: data });
};

function validateSpeechToTextModelConfig(config: SpeechToTextModelConfig) {
  if (!config.provider || !config.modelName) {
    throw new Error('Provider and model name must be specified for speech-to-text');
  }
}

export const speechToTextModelStore: SpeechToTextStorage = {
  ...storage,
  setSpeechToTextModel: async (config: SpeechToTextModelConfig, projectId?: string) => {
    validateSpeechToTextModelConfig(config);
    await setStorageData({ speechToTextModel: config }, projectId);
  },
  getSpeechToTextModel: async (projectId?: string) => {
    const data = await getStorageData(projectId);
    return data.speechToTextModel;
  },
  resetSpeechToTextModel: async (projectId?: string) => {
    await setStorageData({ speechToTextModel: undefined }, projectId);
  },
  hasSpeechToTextModel: async (projectId?: string) => {
    const data = await getStorageData(projectId);
    return data.speechToTextModel !== undefined;
  },
};
