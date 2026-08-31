# E-Tanod

**GIS-Based Patrol Management and Incident Mapping System with Secure QR Checkpoints**
for Barangay Security in Mamburao, Occidental Mindoro.

E-Tanod is a Progressive Web Application (PWA) for barangay security: patrol management,
secure QR checkpoints with geofencing validation, incident mapping, crime heatmaps,
resident reporting, offline-first synchronization, and real-time monitoring.

## Architecture

A pnpm + Turborepo monorepo:

```text
e-tanod/
├── apps/
│   ├── web/     # React + Vite + TypeScript + Tailwind (PWA)
│   └── api/     # NestJS + Prisma + PostgreSQL + Socket.IO
├── packages/
│   ├── ui/            # Shared React components
│   ├── types/         # Shared TS types (API contracts)
│   ├── config/        # Shared build/tailwind config
│   ├── eslint-config/
│   └── tsconfig/
├── prisma/            # schema.prisma + migrations (owned by api)
├── docs/              # Architecture, technical, and user documentation
└── turbo.json
```

### Stack

- **Frontend:** React, Vite, TypeScript, Tailwind CSS, Zustand, TanStack Query
- **Backend:** NestJS, TypeScript
- **Database:** PostgreSQL, Prisma ORM
- **Real-Time:** Socket.IO
- **GIS:** Mapbox GL JS
- **Offline:** IndexedDB + Service Worker (PWA)
- **Monorepo:** pnpm + Turborepo
- **Deployment:** Railway

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- PostgreSQL (local or Docker) — the docker-compose file in `apps/api` runs a local instance

## Getting Started

```bash
# 1. Install dependencies
pnpm install

# 2. Set up the database
#    Option A (Docker):
docker compose -f apps/api/docker-compose.yml up -d db
#    Option B (existing/local Postgres): update DATABASE_URL in apps/api/.env

# 3. Configure environment
#    Copy each example file to real env before starting:
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 4. Run migrations and seed demo data
pnpm --filter @e-tanod/api prisma:migrate
pnpm --filter @e-tanod/api prisma:seed

# 5. Start development
pnpm dev
```

The web app runs at `http://localhost:5173` and the API at `http://localhost:3000`.

## Demo Accounts

Seed data (password: `DemoPass123!`) — clearly marked as DEMO, not real Mamburao data:

| Username      | Role             |
|---------------|------------------|
| superadmin    | Super Admin      |
| barangayadmin | Barangay Admin   |
| tanod1 / tanod2 | Tanod          |
| resident1     | Resident         |

## Scripts

```bash
pnpm dev          # run all apps in dev mode
pnpm build        # build all packages/apps
pnpm test         # run all tests
pnpm lint         # lint all packages
pnpm typecheck    # typecheck all packages
```

## Environment Variables

- API: `apps/api/.env.example` — database URL, JWT secrets, CORS, Mapbox, uploads
- Web: `apps/web/.env.example` — API URL, Socket URL, Mapbox public token

Never commit real `.env` files or secrets.

## Development Roadmap (Five Increments)

1. **Increment 1** — Core System & Database Foundation (auth, RBAC, users, barangays, audit)
2. **Increment 2** — Patrol Management & Secure Checkpoints
3. **Increment 3** — GIS Mapping & Spatial Analytics
4. **Increment 4** — Offline Architecture & Synchronization
5. **Increment 5** — Resident Reporting & Public Portal

Details in `docs/architecture/README.md`.

## Deployment (Railway)

This is a shared pnpm + Turborepo monorepo, so each service is configured with a
per-package `railway.json` (Railway auto-detects these at each package root). Do **not**
set a Root Directory — Railway uses the workspace-filtered `pnpm --filter` commands:

- **E-Tanod API** — `apps/api/railway.json` (NestJS + Prisma). Builds with
  `pnpm --filter @e-tanod/api build` (runs `prisma generate && nest build`), runs
  `prisma migrate deploy` on pre-deploy, and starts with `start:prod`. Healthcheck: `/health`.
- **E-Tanod Web** — `apps/web/railway.json` (Vite PWA). Builds with
  `pnpm --filter @e-tanod/web build` and serves `dist` via `serve` on `$PORT`.
- **PostgreSQL** — add a Railway Postgres service and point `DATABASE_URL` at it.

### Notes
- The api `postinstall` runs `prisma generate`, so a fresh `pnpm install` produces the
  generated Prisma client automatically.
- Never commit a real `.env`. Set variables in Railway per the `.env.example` files
  (`DATABASE_URL`, `JWT_*` secrets, `CORS_ORIGIN`, `WEB_URL`, `SOCKET_URL`,
  `MAPBOX_PUBLIC_TOKEN`, `UPLOAD_DIR`, `MAX_UPLOAD_BYTES`).
- Use `pnpm install --frozen-lockfile` in CI to keep `pnpm-lock.yaml` authoritative.

## Documentation

See `docs/architecture/README.md` for the full architecture reference (ERD, permission
matrix, API structure, security, offline, and GIS designs).

## Research Context

This is an academic capstone/research system. Demo data is explicitly labelled and never
represents real crime statistics or residents of Mamburao. The system is a
decision-support tool; barangay officials remain responsible for operational decisions.
