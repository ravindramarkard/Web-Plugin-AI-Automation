# AITestGen Web Application

This is the web application version of AITestGen, providing the same chat interface and AI agent capabilities as the Chrome extension, accessible through a standard web browser.

## Features

- **Chat Interface**: Full-featured chat interface with message history
- **Multi-Agent System**: Support for Navigator, Planner, and Validator agents
- **LLM Integration**: Configure and use multiple LLM providers (OpenAI, Anthropic, Gemini, etc.)
- **Chat History**: Save and manage conversation history
- **Favorite Prompts**: Bookmark frequently used prompts
- **Dark Mode**: Automatic dark mode support based on system preferences

## Differences from Chrome Extension

The web application provides the same core functionality as the Chrome extension, with the following differences:

- **Browser Automation**: Full browser automation (navigating to URLs, clicking elements, etc.) requires the Chrome extension. The web app can work with LLM providers and provide chat functionality, but cannot directly control browser tabs.
- **Storage**: Uses localStorage instead of Chrome storage APIs
- **Service Layer**: Uses a web-compatible service layer instead of Chrome runtime messaging

## Development

### Prerequisites

- Node.js v22.12.0 or higher
- pnpm v9.15.1 or higher

### Setup

1. Install dependencies from the root:
   ```bash
   pnpm install
   ```

2. Start the development server:
   ```bash
   pnpm -F web-app dev
   ```

   The app will be available at `http://localhost:3000`

### Build

Build the production version:

```bash
pnpm -F web-app build
```

The built files will be in `dist/web-app/`.

### Preview Production Build

```bash
pnpm -F web-app preview
```

## Usage

1. Start the development server or build and serve the production version
2. Open the app in your browser
3. Configure your LLM providers in the Settings page
4. Start chatting with the AI agents!

## Architecture

- **React Router**: Client-side routing
- **Web Storage Adapter**: Polyfills Chrome storage APIs using localStorage
- **Web Service Layer**: Replaces Chrome runtime messaging with a web-compatible service
- **Shared Packages**: Reuses storage, i18n, and UI packages from the monorepo

## Notes

- The web app shares the same storage format as the Chrome extension, so data can be migrated between them
- For full browser automation capabilities, use the Chrome extension
- The web app is ideal for testing, development, and users who prefer web applications over browser extensions

