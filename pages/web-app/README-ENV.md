# Environment Configuration

The web app supports loading LLM provider configurations from environment variables. This is useful for:
- Development and testing
- Pre-configuring providers without using the UI
- CI/CD environments

## Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and add your API keys and configuration:
   ```bash
   VITE_OPENAI_API_KEY=sk-your-key-here
   VITE_ANTHROPIC_API_KEY=sk-ant-your-key-here
   # ... etc
   ```

3. Restart the dev server for changes to take effect.

## Environment Variables

### LLM Provider Configuration

All provider configurations use the pattern: `VITE_<PROVIDER>_API_KEY` and optionally `VITE_<PROVIDER>_BASE_URL`.

**Supported Providers:**
- `VITE_OPENAI_API_KEY` - OpenAI API key
- `VITE_OPENAI_BASE_URL` - Custom OpenAI base URL (optional)
- `VITE_ANTHROPIC_API_KEY` - Anthropic API key
- `VITE_ANTHROPIC_BASE_URL` - Custom Anthropic base URL (optional)
- `VITE_GOOGLE_API_KEY` - Google/Gemini API key
- `VITE_GROQ_API_KEY` - Groq API key
- `VITE_DEEPSEEK_API_KEY` - DeepSeek API key
- `VITE_XAI_API_KEY` - XAI/Grok API key
- `VITE_CEREBRAS_API_KEY` - Cerebras API key
- `VITE_OLLAMA_BASE_URL` - Ollama base URL (default: http://localhost:11434)
- `VITE_OPENROUTER_API_KEY` - OpenRouter API key
- `VITE_OPENROUTER_BASE_URL` - OpenRouter base URL (default: https://openrouter.ai/api/v1)
- `VITE_LLAMA_API_KEY` - Llama API key
- `VITE_LLAMA_BASE_URL` - Llama API base URL (optional)

**Azure OpenAI:**
- `VITE_AZURE_OPENAI_API_KEY` - Azure OpenAI API key
- `VITE_AZURE_OPENAI_ENDPOINT` - Azure endpoint URL
- `VITE_AZURE_OPENAI_API_VERSION` - API version (default: 2024-02-15-preview)
- `VITE_AZURE_OPENAI_DEPLOYMENT_NAMES` - Comma-separated deployment names

**Custom OpenAI:**
- `VITE_CUSTOM_OPENAI_BASE_URL` - Custom OpenAI-compatible API base URL
- `VITE_CUSTOM_OPENAI_API_KEY` - Optional API key for custom provider

### General Settings

- `VITE_MAX_STEPS` - Maximum steps for task execution (default: 50)
- `VITE_REPLAY_HISTORICAL_TASKS` - Enable replay of historical tasks (true/false)

### Default Models

- `VITE_DEFAULT_NAVIGATOR_MODEL` - Default model for Navigator agent
- `VITE_DEFAULT_PLANNER_MODEL` - Default model for Planner agent

## How It Works

1. On app startup, the app checks for environment variables
2. Providers are automatically created from env vars if they don't already exist in storage
3. Default models are set if specified and not already configured
4. General settings are updated from env vars

## Security Note

⚠️ **Important**: Environment variables in client-side code (Vite) are bundled into the JavaScript and are visible to anyone who views the source code. 

**Do NOT use this for production deployments with sensitive API keys!**

For production:
- Use a backend service to proxy API calls
- Store API keys server-side only
- Use the UI settings page for user-specific configurations

## Example Configuration

```bash
# .env.local
VITE_OPENAI_API_KEY=sk-proj-...
VITE_ANTHROPIC_API_KEY=sk-ant-...
VITE_DEFAULT_NAVIGATOR_MODEL=gpt-4o
VITE_DEFAULT_PLANNER_MODEL=claude-sonnet-4-5
VITE_MAX_STEPS=100
VITE_REPLAY_HISTORICAL_TASKS=true
```

