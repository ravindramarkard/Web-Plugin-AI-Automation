/// <reference types="vite/client" />

interface ImportMetaEnv {
  // LLM Provider API Keys
  readonly VITE_OPENAI_API_KEY?: string;
  readonly VITE_OPENAI_BASE_URL?: string;
  readonly VITE_ANTHROPIC_API_KEY?: string;
  readonly VITE_ANTHROPIC_BASE_URL?: string;
  readonly VITE_GOOGLE_API_KEY?: string;
  readonly VITE_GROQ_API_KEY?: string;
  readonly VITE_DEEPSEEK_API_KEY?: string;
  readonly VITE_XAI_API_KEY?: string;
  readonly VITE_CEREBRAS_API_KEY?: string;
  readonly VITE_OLLAMA_BASE_URL?: string;
  readonly VITE_OPENROUTER_API_KEY?: string;
  readonly VITE_OPENROUTER_BASE_URL?: string;
  readonly VITE_LLAMA_API_KEY?: string;
  readonly VITE_LLAMA_BASE_URL?: string;

  // Azure OpenAI
  readonly VITE_AZURE_OPENAI_API_KEY?: string;
  readonly VITE_AZURE_OPENAI_ENDPOINT?: string;
  readonly VITE_AZURE_OPENAI_API_VERSION?: string;
  readonly VITE_AZURE_OPENAI_DEPLOYMENT_NAMES?: string;

  // Custom OpenAI
  readonly VITE_CUSTOM_OPENAI_BASE_URL?: string;
  readonly VITE_CUSTOM_OPENAI_API_KEY?: string;

  // General Settings
  readonly VITE_MAX_STEPS?: string;
  readonly VITE_REPLAY_HISTORICAL_TASKS?: string;

  // Default Models
  readonly VITE_DEFAULT_NAVIGATOR_MODEL?: string;
  readonly VITE_DEFAULT_PLANNER_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
