# GEMINI.md

## Project Overview
**Better-Radio** (also referred to as **Neo-Radio** in internal planning) is a modern Electron application designed to reinvent the radio experience. It blends hyper-personalized music recommendations with automated news delivery, orchestrated via a Large Language Model (LLM) pipeline.

### Core Features
- **Music Integration**: Streams music from YouTube and YouTube Music (with hooks for Spotify).
- **AI Orchestration**: Uses the Vercel AI SDK (targeting providers like OpenAI and Cerebras) to curate playlists and news segments.
- **News Delivery**: Integrates RSS feeds and news APIs (GNews, NewsAPI) to provide spoken or text-based updates.
- **Modern UI**: Built with React, Tailwind CSS 4, and Radix UI components for a polished, "21st-century" aesthetic.

### Technical Stack
- **Framework**: Electron + React + TypeScript
- **Build Tool**: Vite + Electron Forge
- **Styling**: Tailwind CSS 4 + Radix UI + Lucide Icons
- **AI/LLM**: Vercel AI SDK (`ai`), `@ai-sdk/openai`
- **APIs**: `youtubei.js`, `ytmusic-api`, `@spotify/web-api-ts-sdk`
- **Persistence**: `electron-store`

## Building and Running
- **Installation**: `npm install`
- **Development**: `npm start` (Launches the Electron app with Vite HMR)
- **Linting**: `npm run lint`
- **Packaging**: `npm run package` (Creates application packages)
- **Distribution**: `npm run make` (Generates platform-specific installers)

## Development Conventions
- **AI Integration**: AI tools and logic are primarily located in `src/tools.ts`. When adding new capabilities, define them as `tool` objects using the `ai` package and Zod schemas.
- **UI Components**: Follow the Radix UI / Shadcn pattern. Components are split between `src/components/ui` (reusable primitives) and `src/components` (feature-specific components like `Playlist` and `OptionsSidebar`).
- **Styling**: Use Tailwind CSS 4 utility classes.
- **Spotify TOS**: **CRITICAL:** Do not use LLM APIs that train on user output, as this violates Spotify's Terms of Service.
- **Main/Renderer Separation**:
    - `src/main.ts`: Electron main process (lifecycle, window management).
    - `src/renderer.tsx`: React entry point.
    - `src/preload.ts`: Bridge for IPC (currently minimal).

## Key Files
- `plan.md`: The original vision and roadmap for the "Neo-Radio" concept.
- `src/tools.ts`: Implementation of AI tools (e.g., YouTube search).
- `src/App.tsx`: Main application layout and state.
- `forge.config.ts`: Electron Forge configuration for building and packaging.
- `vite.renderer.config.mts`: Vite configuration for the React frontend.
