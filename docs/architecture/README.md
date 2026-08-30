# E-Tanod — STEP 0: Architecture Design

This document is the authoritative architecture reference for the E-Tanod system.
It is produced before any application code is written, per the master development plan.

---

## 1. Architecture Summary

E-Tanod is a GIS-based patrol management and incident mapping system with secure QR
checkpoints, geofencing validation, crime heatmaps, resident reporting, offline-first
PWA behaviour, and real-time monitoring.

The system is a **monorepo** using **pnpm + Turborepo**, containing two deployable
applications (a React web/PWA frontend and a NestJS API) plus shared packages.

### High-level flow

```text
PATROL ACTIVITY  ->  SECURE QR CHECKPOINT  ->  GEOFENCE VALIDATION
   ->  PATROL / LOCATION DATA  ->  INCIDENT RECORDING  ->  GIS VISUALIZATION
   ->  CRIME HEATMAP  ->  DATA-INFORMED PATROL PLANNING  ->  IMPROVED SECURITY
```

Resident reporting adds an independent input stream that feeds the same incident database,
GIS, and analytics layer.

---

## 2. Technology Decisions

| Technology | Purpose | Rationale |
|---|---|---|
| React + Vite + TypeScript | Frontend | Fast, typed, component-based UI; PWA-first build via Vite |
| Tailwind CSS | Styling | Consistent, responsive, mobile-first utility styling |
| Zustand | Client/UI state | Lightweight, non-reactive server state; ideal for scanner/offline/map UI state |
| TanStack Query | Server state | Caching, retries, invalidation for all HTTP-backed data |
| NestJS + TypeScript | Backend | Modular, opinionated, DI-based framework matching the listed modules |
| PostgreSQL + Prisma | Database ORM | Relational, normalized schema; type-safe migrations and queries |
| Socket.IO | Real-time | Two-way event push for live dashboards and patrol/incident events |
| Mapbox GL JS | GIS | Production-grade maps, markers, clustering, and heatmaps |
| IndexedDB + Service Worker | Offline | Client-side persistence and caching for offline-first behaviour |
| pnpm + Turborepo | Monorepo | Fast, cacheable task orchestration across apps/packages |
| Railway | Deployment | Managed hosting for web, API, and Postgres services |

---

## 3. ERD (Database Structure)

The canonical Prisma schema is the source of truth. A summary of the core entities:

```text
User (1) -- (N) AuditLog
User (1) -- (N) Notification
User (1) -- (N) SyncRecord

Role (1) -- (N) User
User (N) -- (M) Role            (many-to-many, plus a primary role)
Barangay (1) -- (N) User        (users belong to a barangay)
Barangay (1) -- (N) Checkpoint
Barangay (1) -- (N) PatrolSchedule
Barangay (1) -- (N) Incident

Profile (1) -- (1) User

User (tanod) (1) -- (N) PatrolAssignment
PatrolSchedule (1) -- (N) PatrolAssignment
PatrolAssignment (1) -- (N) PatrolSession
PatrolSession (1) -- (N) PatrolLocation
PatrolSession (1) -- (N) CheckpointScan

Checkpoint (1) -- (1) CheckpointQRToken
Checkpoint (1) -- (N) CheckpointScan
User (tanod) (1) -- (N) CheckpointScan

Incident (1) -- (N) IncidentAttachment
IncidentCategory (1) -- (N) Incident
Incident (1) -- (N) IncidentStatusHistory
User (1) -- (N) Incident          (reporter / verified by)

Incident (1) -- (1) ResidentReport (optional; anonymous or authenticated resident origin)

Checkpoint (N) -- (M) PatrolSchedule  (patrol checkpoint requirements, join table)
```

### Relationships & constraints highlights

- **User / Role**: many-to-many roles with a `primaryRoleId`; RBAC enforced server-side.
- **Barangay**: soft-deleted; FK on users, checkpoints, schedules, incidents.
- **CheckpointQRToken**: unique, regenerated on demand; QR encodes only a non-sensitive token.
- **CheckpointScan**: unique constraint on `(checkpointId, patrolSessionId)` to prevent duplicate scans.
- **Incident**: references category, community, reporter, verifier; soft-deleted.
- **AuditLog**: append-only table; never user-editable.
- Indexes on all foreign keys and on geo columns used by GIS queries.
- Cascade behaviour: deletion is soft where business-critical (users, checkpoints, incidents).

---

## 4. Permission Matrix

| Capability | Super Admin | Barangay Admin | Tanod | Resident |
|---|---|---|---|---|
| Manage system config & barangays | ✅ | — | — | — |
| Manage admins & users (all) | ✅ | — | — | — |
| Manage local tanods | ✅ | ✅ | — | — |
| Create patrol schedules / assign patrols | ✅ | ✅ | — | — |
| Manage checkpoints | ✅ | ✅ | — | — |
| Monitor patrols (live) | ✅ | ✅ | — | — |
| Review / verify incidents | ✅ | ✅ | — | — |
| View GIS, heatmaps, generate reports | ✅ | ✅ | — | — |
| View own assigned patrol | — | — | ✅ | — |
| Start/end own patrol | — | — | ✅ | — |
| Scan checkpoint (own active patrol) | — | — | ✅ | — |
| Record patrol activity / report incident | — | — | ✅ | — |
| View own patrol history + notifications | — | — | ✅ | — |
| Submit (anon/authed) incident report | — | — | — | ✅ |
| Track own reports | — | — | — | ✅ |
| View community alerts | — | — | — | ✅ |
| View audit logs | ✅ | — | — | — |

Permissions are enforced in the **backend** (guards/roles); the frontend only affects UX.

---

## 5. Folder Structure (Monorepo)

```text
e-tanod/
├── apps/
│   ├── web/          # React + Vite PWA
│   └── api/          # NestJS
├── packages/
│   ├── ui/           # Shared React components
│   ├── types/        # Shared TS types (API contracts)
│   ├── config/       # Shared build/tailwind config
│   ├── eslint-config/
│   └── tsconfig/
├── prisma/           # schema.prisma + migrations (owned by api app)
├── docs/             # Architecture + technical + user docs
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

---

## 6. API Structure

REST + Socket.IO. All `/api` routes are protected except auth and public resident
reporting endpoints. Sample modules:

```text
POST   /auth/login
GET    /auth/me
POST   /auth/logout

GET    /users            [admin]
POST   /users            [admin]
PATCH  /users/:id        [admin]

GET    /barangays        [authenticated]
POST   /barangays        [super-admin]

GET    /patrols          [barangay-admin]
POST   /patrols          [barangay-admin]
POST   /patrols/:id/assign
POST   /patrols/:id/start   [tanod]
POST   /patrols/:id/end     [tanod]

GET    /checkpoints      [authenticated]
POST   /checkpoints      [barangay-admin]
POST   /checkpoints/:id/scan  [tanod]

GET    /incidents        [authed roles]
POST   /incidents        [tanod / admin]
PATCH  /incidents/:id    [admin]

GET    /gis/incidents    [admin]
GET    /gis/heatmap      [admin]
GET    /gis/patrols      [admin]

GET    /resident-reports/:id  [owner + token]
POST   /resident-reports      [public]

POST   /sync             [authenticated]
GET    /sync/status      [authenticated]

GET    /reports/**       [admin]

GET    /health           [public]
```

---

## 7. Development Roadmap (Five Increments)

1. **Increment 1** — Core System & Database Foundation
2. **Increment 2** — Patrol Management & Secure Checkpoints
3. **Increment 3** — GIS Mapping & Spatial Analytics
4. **Increment 4** — Offline Architecture & Synchronization
5. **Increment 5** — Resident Reporting & Public Portal

Each increment follows: ANALYZE → DESIGN → BUILD → TEST → REVIEW → REFINE.

---

## 8. Technical Risks

- **GPS**: variable accuracy, denied/absent location, indoor/weak signal. Mitigation: server-side geofence validation, accuracy thresholds, clear user feedback, no false validation.
- **QR security**: token theft / replay. Mitigation: non-sensitive token encoding, per-scan validation, duplicate-scan prevention, active-patrol + auth coupling.
- **Offline synchronization**: conflicts, duplicates, partial sync. Mitigation: idempotency keys, sync state machine (PENDING/SYNCING/SYNCED/FAILED/CONFLICT), never silently delete unsynced records.
- **Mapbox**: token exposure, cost, offline tiles. Mitigation: only public token to frontend, server secrets stay in backend env, data-driven markers/heatmaps.
- **PWA limitations**: iOS SW quirks, cache staleness. Mitigation: proper SW lifecycle, update flow, clear online/offline status.
- **File uploads**: malicious files, EXIF metadata, size. Mitigation: type/size validation, safe naming, image optimization, metadata stripping, non-executable handling.
- **Privacy**: incident exposure. Mitigation: role-gated access, resident reports not automatically public, separation of PUBLIC/OPERATIONAL/CONFIDENTIAL/ADMINISTRATIVE data.
- **Real-time**: connectivity dependence, reconnection. Mitigation: Socket.IO reconnection, fallback to polling where needed, offline queue.

---

## 9. Increment 1 Implementation Plan

Increment 1 delivers the foundations:

1. Monorepo bootstrapping (pnpm workspace, Turborepo, shared configs/types).
2. Prisma schema + initial migration (all core entities listed in the ERD).
3. NestJS app scaffold with Prisma service.
4. Auth module: login/logout/me, Argon2 password hashing, JWT access + refresh strategy.
5. RBAC: roles, guards, permission metadata, primary role resolution.
6. Users, profiles, barangay management modules.
7. Audit logging module (append-only).
8. Seed script with clearly-labelled demo data.
9. Basic authenticated dashboards (Super Admin / Barangay Admin / Tanod / Resident shells).
10. Unit + integration tests for auth/RBAC/audit; foundation verification.

---

## Security Architecture Summary

- Argon2 password hashing (never plaintext).
- JWT access tokens (short-lived) + refresh tokens, HTTP-only where appropriate.
- Backend-enforced RBAC on every protected endpoint.
- Input validation via class-validator DTOs and NestJS ValidationPipe.
- Rate limiting on auth/public endpoints.
- Server-side geofence computation (never trust client location claims).
- CORS restricted to configured origins.
- Environment secrets only via `.env*`, never committed; `.env.example` committed with placeholders.
- Safe error messages (no internal stack/info leakage).
