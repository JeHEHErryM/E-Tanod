# @e-tanod/web
# Build context = repository root. The full pnpm workspace (including shared
# packages like @e-tanod/types / @e-tanod/ui and the root frozen lockfile) must
# be present so the production build resolves workspace sources.

FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm" PATH="/pnpm:$PATH"
RUN corepack enable

FROM base AS build
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
# Build the web app and its workspace dependencies.
RUN pnpm --filter @e-tanod/web... build

FROM base AS runtime
WORKDIR /app
# Copy the whole workspace so serve (a dev/start-time dep) and its symlinks exist.
COPY --from=build /app /app
ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm", "--filter", "@e-tanod/web", "start"]
