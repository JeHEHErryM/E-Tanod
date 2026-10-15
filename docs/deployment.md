# E-Tanod — Deployment Runbook

Operational reference for the hosted E-Tanod deployment. Covers the live URLs,
environment variables, how each service is built and released, how to seed demo
data in production, and the known quirks to avoid.

---

## 1. Deployables

| Service | Platform | Source | Build | Start |
|---|---|---|---|---|
| API (NestJS + Prisma + Socket.IO) | Railway | `apps/api` | `apps/api/Dockerfile` | `pnpm --filter @e-tanod/api start:prod` |
| Web (React + Vite PWA) | Vercel | `apps/web` | `turbo run build --filter=@e-tanod/web...` | static `dist` |
| PostgreSQL | Railway | managed plugin | — | — |

Config files:

- `apps/api/railway.json` — Dockerfile builder, `prisma migrate deploy` pre-deploy
  command, `/health` healthcheck.
- `apps/web/vercel.json` — Vite framework, `pnpm install --frozen-lockfile`,
  `outputDirectory: dist`, SPA rewrite `/(.*)` → `/index.html`.
- `.vercel/project.json` — links the repo root to the Vercel project (`projectName: e-tanod`).

### Live URLs (current)

- Web (PWA): `https://e-tanod.vercel.app`
- API: `https://e-tanod-production.up.railway.app/api`
- API health: `https://e-tanod-production.up.railway.app/health`

---

## 2. Environment Variables

Set these in the platform dashboards — never commit real values. Placeholders are
in `apps/api/.env.example` and `apps/web/.env.example`.

### API (Railway)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Railway Postgres). |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Token signing secrets (change from defaults). |
| `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | Token lifetimes. |
| `PORT` | Injected by Railway. |
| `NODE_ENV=production` | Enables production behaviour. |
| `API_URL`, `WEB_URL` | Public origins of the API and web app. |
| `CORS_ORIGIN` | Comma-separated allowed origins (must include the Vercel URL). |
| `SOCKET_URL` | Socket.IO public origin. |
| `MAPBOX_PUBLIC_TOKEN` | Public Mapbox token (backend-side geocoding only). |
| `UPLOAD_DIR` | Upload directory (default `./uploads`). |
| `MAX_UPLOAD_BYTES` | Max upload size (default `5242880`). |

### Web (Vercel)

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | `https://e-tanod-production.up.railway.app/api` |
| `VITE_SOCKET_URL` | `https://e-tanod-production.up.railway.app` |
| `VITE_MAPBOX_PUBLIC_TOKEN` | Public Mapbox token — inlined **at build time**. |

> `VITE_*` values are baked into the bundle. Changing one on Vercel does **not**
> rebuild automatically — trigger a new deployment afterwards.

---

## 3. Release Workflow

### API (Railway)

1. Commit and push to `main`.
2. Railway builds `apps/api/Dockerfile`, runs the pre-deploy command
   `pnpm --filter @e-tanod/api prisma:deploy`, then starts `start:prod`.
3. Verify: `GET https://e-tanod-production.up.railway.app/health` returns OK.

### Web (Vercel, deployed from the repo root)

Run from the **repository root** — the Vercel link file lives at `.vercel/project.json`,
and the project's Root Directory is configured as `apps/web`:

```powershell
# from C:\Users\Josh\Documents\Thesis\E-Tanod\E-Tanod
Remove-Item -Recurse -Force apps/web/dist -ErrorAction SilentlyContinue  # optional clean
pnpm --filter @e-tanod/web typecheck
pnpm --filter @e-tanod/web build
cmd.exe /c "C:\Users\Josh\AppData\Roaming\npm\vercel.cmd deploy --prod --yes"
```

On success the CLI prints `▲ Aliased https://e-tanod.vercel.app` and
`"readyState": "READY"`.

> **Do not** run `vercel deploy` from inside `apps/web`. It fails with
> `The specified Root Directory "apps/web" does not exist` because the project link
> is at the repo root. Always deploy from the repo root.

> A transient `{"status":"error","reason":"deploy_failed","message":"Not authorized"}`
> can appear on the first attempt; re-running the command succeeds.

---

## 4. Seeding Production Demo Data

`scripts/seed-prod-demo.mjs` logs in as the super admin and idempotently:

- ensures 16 barangays exist,
- resets the demo accounts (`barangayadmin`, `tanod1`, `tanod2`, `resident1`) to a
  known password, verified + active, with barangay assignments,
- seeds incident categories and a set of labelled demo incidents.

```powershell
# from the repo root
$env:E_TANOD_PASS="<superadmin password>"   # required
node scripts/seed-prod-demo.mjs
```

Optional overrides: `E_TANOD_USER` (default `superadmin`), `E_TANOD_DEMO_PASS`
(default `Demo123!`), and the API base URL (defaults to the production API).

Demo data is explicitly labelled and never represents real residents or crime
statistics.

---

## 5. Rollback

- **Web:** redeploy a previous Vercel deployment from the Vercel dashboard
  (Deployments → ⋯ → Promote to Production).
- **API:** `git revert <commit>` and push, or roll back the service to a previous
  Railway deployment. Schema changes are forward-only via
  `prisma migrate deploy`; restore the database from a backup if a migration must
  be undone.

---

## 6. Known Quirks

- **`GET /patrol/session/active` returns an empty `200` body when there is no active
  session** (not `null`). The web client normalizes an empty/`""` response to `null`;
  any new consumer must do the same.
- **Vercel root directory** — deploy from the repo root (see §3).
- **`VITE_*` rebuilds** — set/refresh them before deploying, not after.
- **`MAPBOX_PUBLIC_TOKEN`** must be present in both the API and web environments for
  backend geocoding and the frontend map tiles respectively.

---

## 7. Local Development (recap)

```bash
pnpm install
docker compose -f apps/api/docker-compose.yml up -d db
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
pnpm --filter @e-tanod/api prisma:migrate
pnpm --filter @e-tanod/api prisma:seed
pnpm dev   # web http://localhost:5173 , api http://localhost:3000
```
