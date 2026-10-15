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

| Username      | Role             |
|---------------|------------------|
| superadmin    | Super Admin      |
| barangayadmin | Barangay Admin   |
| tanod1 / tanod2 | Tanod          |
| resident1     | Resident         |

Passwords differ by environment:

- **Local dev seed** (`pnpm --filter @e-tanod/api prisma:seed`): all demo accounts and
  `superadmin` use `DemoPass123!`, unless `SUPERADMIN_PASSWORD` is set (then only the
  super admin differs).
- **Production demo seed** (`scripts/seed-prod-demo.mjs`): `barangayadmin`, `tanod1`,
  `tanod2`, `resident1` use `Demo123!` (override with `E_TANOD_DEMO_PASS`); the super
  admin password is supplied via `E_TANOD_PASS` and is never stored in the repo.

Seed data is clearly marked as DEMO, not real Mamburao data.

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

## Deployment

The API and PostgreSQL run on **Railway**; the web PWA is deployed to **Vercel**.

### API (Railway)

This is a shared pnpm + Turborepo monorepo, so the API is configured with a
per-package `apps/api/railway.json` (Railway auto-detects it at the package root). Do
**not** set a Root Directory — Railway builds `apps/api/Dockerfile`, runs
`prisma migrate deploy` on pre-deploy, and starts with `start:prod`:

- **E-Tanod API** — `apps/api/railway.json` (NestJS + Prisma). Builds with
  `pnpm --filter @e-tanod/api build` (runs `prisma generate && nest build`), runs
  `prisma migrate deploy` on pre-deploy, and starts with `start:prod`. Healthcheck: `/health`.
- **PostgreSQL** — add a Railway Postgres service and point `DATABASE_URL` at it.

### Web (Vercel)

The web app is linked to Vercel from the **repository root** (`.vercel/project.json`;
the project's Root Directory is `apps/web`, honoring `apps/web/vercel.json`). Deploy
from the repo root:

```bash
cmd.exe /c "C:\Users\Josh\AppData\Roaming\npm\vercel.cmd deploy --prod --yes"
```

Do not run `vercel deploy` from inside `apps/web` — the project link is at the repo
root. `VITE_*` variables are inlined at build time, so redeploy after changing them.

### Notes
- The api `postinstall` runs `prisma generate`, so a fresh `pnpm install` produces the
  generated Prisma client automatically.
- Never commit a real `.env`. Set variables in Railway/Vercel per the `.env.example`
  files (`DATABASE_URL`, `JWT_*` secrets, `CORS_ORIGIN`, `WEB_URL`, `SOCKET_URL`,
  `MAPBOX_PUBLIC_TOKEN`, `VITE_API_URL`, `VITE_SOCKET_URL`, `VITE_MAPBOX_PUBLIC_TOKEN`,
  `UPLOAD_DIR`, `MAX_UPLOAD_BYTES`).
- Use `pnpm install --frozen-lockfile` in CI to keep `pnpm-lock.yaml` authoritative.

See `docs/deployment.md` for the full runbook (URLs, seeding production, rollback,
known quirks).

## Documentation

- `docs/architecture/README.md` — full architecture reference (ERD, permission matrix,
  API structure, security, offline, and GIS designs).
- `docs/deployment.md` — deployment runbook (Railway API + Vercel web, seeding, rollback).
- `docs/demo-script.md` — defense/demo walkthrough per role.
- `docs/qa-checklist.md` — pre-demo functional, dark-mode, and responsive QA checklist.
- `docs/startup-pitch.md` — startup concept and market framing.

## Research Context

This is an academic capstone/research system. Demo data is explicitly labelled and never
represents real crime statistics or residents of Mamburao. The system is a
decision-support tool; barangay officials remain responsible for operational decisions.
