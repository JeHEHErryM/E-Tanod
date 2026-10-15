# E-Tanod — Defense Demo Script

A step-by-step walkthrough for presenting E-Tanod. Follow the order below so the
narrative moves from the public experience → field (tanod) experience → admin
oversight → GIS analytics. Roughly 8–12 minutes.

---

## 1. Pre-flight (do this 10 minutes before)

- [ ] Prod is live: `https://e-tanod.vercel.app` loads.
- [ ] API health is OK: `https://e-tanod-production.up.railway.app/health`.
- [ ] Demo data seeded (see `docs/deployment.md` §4).
- [ ] Browsers/devices ready: one desktop tab for admin, one phone (or mobile
      emulation) for the tanod QR/scan flow.
- [ ] Location permission granted on the tanod device (the checkpoints demo needs it).
- [ ] Toggle the language (EN/TL) and theme (light/dark) once to confirm both render.

### Accounts

| Role | Username | Password |
|---|---|---|
| Resident | `resident1` | `Demo123!` |
| Tanod | `tanod1` (or `tanod2`) | `Demo123!` |
| Barangay Admin | `barangayadmin` | `Demo123!` |
| Super Admin | `superadmin` | provided separately (set via environment; not stored in the repo) |

---

## 2. Public entry — Landing & resident reporting

1. Open `https://e-tanod.vercel.app` → the landing page (hero, features, install steps,
   contact). Point out: **PWA, bilingual EN/TL, no app store required.**
2. Tap **Create account** and register a so-called resident account (or log in as
   `resident1`). Note that **sign-ups require admin approval** — a verification step
   that keeps the system trustworthy.
3. As the resident (`/residents`): show the dashboard, submit an incident report
   (category, description, optional photo, geo-tag), and the **"track my reports"** list.

> Talking point: reporting is a one-tap, phone-based channel — no need to walk to the
> barangay hall.

---

## 3. Field experience — Tanod patrol & QR checkpoints

Log in as `tanod1` (use a second browser profile or a phone).

1. **Dashboard** → field view with quick actions (Patrol, Scan, Incidents).
2. **Patrol** (`/patrol`):
   - Start the assigned patrol.
   - Note the **live location watcher** (positions are throttled and posted to the API).
   - End the patrol when the route is done.
3. **Scan** (`/scan`): open the checkpoint QR scanner and scan a checkpoint QR plate.
   - A scan only counts when the tanod is **inside the checkpoint's geofence** — show
     the success vs. out-of-range results.
   - Mention duplicate-scan prevention (`unique(checkpointId, patrolSessionId)`).
4. Report an incident from the field if time allows.

> Talking point: geofenced, token-based QR scans make every patrol **verifiable** —
> unlike paper logs or group chats.

---

## 4. Admin oversight — Barangay Admin

Log in as `barangayadmin`.

1. **Dashboard**: live stats (patrols, checkpoints, incidents).
2. **Users** (`/users`): approve pending sign-ups; show role assignment and barangay
   scoping.
3. **Schedules** (`/schedules`): create a patrol schedule, assign tanods, attach
   required checkpoints, and publish.
4. **Checkpoints** (`/checkpoints`): create a checkpoint, generate/regenerate its QR
   token (the QR encodes only a non-sensitive token).
5. **Incidents** (`/incidents`): review, verify, and change the status of reported
   incidents.
6. **Audit** (`/audit`): show the append-only audit trail (login, approvals, changes).

> Talking point: **RBAC is enforced on the backend** — the UI only reflects what a role
> may do. Everything sensitive is logged.

---

## 5. Analytics — GIS & heatmaps

Still as `barangayadmin` (or `superadmin`):

1. **GIS** (`/gis`): incident markers, clustered view, and the **crime heatmap**;
   filter by status/category.
2. Toggle the **theme** to dark and show the map switching to the dark basemap.
3. Explain the analytics story: heatmaps + patrol data → **data-informed patrol
   planning** (deploy tanods where risk concentrates).

---

## 6. Super Admin — System-wide

Log in as `superadmin`.

1. **Barangays** (`/barangays`): the 16 reference barangays; create/edit (soft-delete).
2. **Users**: full user directory across barangays.
3. **Audit**: full system trail.

---

## 7. Offline-first & real-time (closing points)

- Turn off the network on the tanod device, perform a checkpoint scan, then reconnect →
  the record **syncs** (never silently dropped).
- Open the admin dashboard while a tanod acts → **real-time** updates via Socket.IO.

> Closing: E-Tanod is **decision-support** — the system advises, barangay officials
> decide. Aligned with **SDG 11.7** and **SDG 16.1**.

---

## 8. Likely Q&A

| Question | Short answer |
|---|---|
| How do you prevent fake checkpoints? | Server-side geofence validation + token-based QR + active-patrol/auth coupling + duplicate prevention. |
| What if GPS is weak/denied? | Accuracy thresholds, clear feedback, no false validation; scans rejected rather than faked. |
| How is privacy handled? | Role-gated data, resident reports not auto-public, data-classification (PUBLIC/OPERATIONAL/CONFIDENTIAL/ADMINISTRATIVE), RA 10173 alignment. |
| Offline conflicts? | Idempotency keys + sync state machine (PENDING/SYNCING/SYNCED/FAILED/CONFLICT); unsynced records never deleted. |
| Why a PWA? | No app store, works on shared/low-end phones, offline-capable, cheap to adopt. |
| Is the demo data real? | No — explicitly labelled demo data; never real residents or Mamburao crime stats. |
