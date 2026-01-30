# Use Node.js 22 as the base image
FROM node:22-slim

# Install system dependencies required for Playwright and SQLite
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    sqlite3 \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy root workspace configuration files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json ./

# Copy all package.json files first for better caching
# We need to preserve directory structure for workspaces
COPY packages/dev-utils/package.json packages/dev-utils/package.json
COPY packages/hmr/package.json packages/hmr/package.json
COPY packages/i18n/package.json packages/i18n/package.json
COPY packages/schema-utils/package.json packages/schema-utils/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/storage/package.json packages/storage/package.json
COPY packages/tailwind-config/package.json packages/tailwind-config/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/vite-config/package.json packages/vite-config/package.json
COPY packages/zipper/package.json packages/zipper/package.json

COPY pages/content/package.json pages/content/package.json
COPY pages/options/package.json pages/options/package.json
COPY pages/side-panel/package.json pages/side-panel/package.json
COPY pages/web-app/package.json pages/web-app/package.json

COPY chrome-extension/package.json chrome-extension/package.json
COPY server/package.json server/package.json

# Install dependencies
RUN pnpm install --frozen-lockfile

# Install Playwright browsers for the server
RUN pnpm -F @extension/server exec playwright install --with-deps chromium

# Copy source code
COPY . .

# Build the web-app
RUN pnpm -F @extension/web-app build

# Build the server
RUN pnpm -F @extension/server build

# Create directory for persistent data
RUN mkdir -p server/data server/public/reports

# Expose ports
# 3000 for web-app (served via static server or proxy)
# 3001 for API server
EXPOSE 3001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_PATH=/app/server/data/database.sqlite
# Point web-app to the server's public/reports directory
ENV REPORTS_DIR=/app/server/public/reports

# Start command (runs the server which should also serve the static web-app build)
# Note: You might need to adjust the server to serve the built web-app files
CMD ["pnpm", "-F", "@extension/server", "start"]
