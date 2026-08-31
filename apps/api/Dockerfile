# @e-tanod/api
# Build context = repository root. The full pnpm workspace (including shared
# packages like @e-tanod/types and the root frozen lockfile) must be present so
# the workspace-resolved node_modules and symlinks survive into the runtime image.

FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm" PATH="/pnpm:$PATH"
RUN corepack enable

FROM base AS build
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
# Build the API and its workspace dependencies (e.g. @e-tanod/types).
RUN pnpm --filter @e-tanod/api... build

FROM base AS runtime
WORKDIR /app
# Copy the whole workspace so pnpm's symlinked node_modules layout is intact.
COPY --from=build /app /app
ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm", "--filter", "@e-tanod/api", "start:prod"]
