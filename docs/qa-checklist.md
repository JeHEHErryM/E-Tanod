# E-Tanod — QA Checklist

Use before a demo or release. Test against production
(`https://e-tanod.vercel.app`) unless noted. Mark each item ✅ / ❌ and note defects.

---

## 1. Smoke Test

- [ ] `https://e-tanod.vercel.app` returns HTTP 200.
- [ ] `https://e-tanod-production.up.railway.app/health` returns OK.
- [ ] Login as each of the four roles succeeds with the documented credentials.
- [ ] A wrong password shows a friendly error (no stack trace / internal detail).
- [ ] Refresh while logged in keeps the session; logout returns to `/login`.
- [ ] Deep link (e.g. `/gis`) while logged out redirects to `/login`; while logged in
      loads the route.

---

## 2. Role Access Matrix

Expected web routes per role (`RequireRole` gates):

| Route | Super Admin | Barangay Admin | Tanod | Resident |
|---|---|---|---|---|
| `/` (home) | Dashboard | Dashboard | Dashboard | redirects → `/residents` |
| `/patrol` | ✅ | ✅ | ✅ | redirects → `/` |
| `/scan` | ✅ | ✅ | ✅ | redirects → `/` |
| `/schedules` | ✅ | ✅ | — | — |
| `/checkpoints` | ✅ | ✅ | — | — |
| `/gis` | ✅ | ✅ | — | — |
| `/incidents` | ✅ | ✅ | ✅ | — |
| `/users` | ✅ | ✅ | — | — |
| `/barangays` | ✅ | — | — | — |
| `/audit` | ✅ | ✅ | — | — |
| `/residents` | — | — | — | ✅ |

- [ ] Each role sees only its allowed navigation items.
- [ ] Manually visiting a disallowed route redirects home (no crash).
- [ ] Backend rejects disallowed API calls even if invoked directly (403).

---

## 3. Functional Flows

**Auth & accounts**
- [ ] Sign up (resident) → account is pending until approved.
- [ ] Admin approves/denies a pending user.
- [ ] Role assignment and barangay scoping persist after refresh.

**Patrol (tanod / admin)**
- [ ] Start a patrol → active session appears.
- [ ] Live location updates post while patrolling (throttled, not per-second).
- [ ] End patrol → session closes; no location updates afterwards.
- [ ] Patrol page loads with **no active session** (must show empty state, not the
      ErrorBoundary "Something went wrong"). *(Regression guard for the empty-body bug.)*

**Checkpoints & scanning (tanod)**
- [ ] Create/regenerate a checkpoint QR; the token is non-sensitive.
- [ ] Scan inside the geofence → VALID.
- [ ] Scan outside the geofence → rejected with clear feedback.
- [ ] Duplicate scan of the same checkpoint in one session is blocked.
- [ ] Camera permission denied → friendly message (no crash).

**Schedules (admin)**
- [ ] Create a schedule, assign tanods, attach checkpoints, publish.
- [ ] Schedules list renders dates/status correctly (EN and TL).

**Incidents (all operational roles / resident reporting)**
- [ ] Resident submits a report with photo + location → appears in tracking list.
- [ ] Admin reviews/verifies and changes status → history recorded.
- [ ] Incident categories list loads.
- [ ] Attachment upload enforces type/size limits.

**GIS (admin)**
- [ ] Incident markers + clustering render; popups show escaped, readable text.
- [ ] Heatmap toggle works; status/category filters apply.
- [ ] Map style follows the theme (light ↔ dark basemap).

**Audit (super admin / barangay admin)**
- [ ] Audit entries appear in reverse-chronological order and are not editable.

---

## 4. Dark Mode

Toggle theme via the header control on each page; verify no invisible text.

- [ ] Theme choice persists across reloads; first paint has no flash (FOUC-free).
- [ ] `theme-color` / PWA chrome matches the theme.
- [ ] Landing page — hero gradient, eyebrow text, feature cards, CTAs readable.
- [ ] Login / Signup — form fields, demo hints, headings readable.
- [ ] Dashboard — hero gradient, stat cards, quick actions readable.
- [ ] Status labels (success/warning/danger/info/brand) are legible on dark surfaces.
- [ ] Status chips (rose/emerald/amber/sky/brand 50–100 tints) have dark fills with
      readable text.
- [ ] Sheets/modals — backdrop, inputs, buttons readable.
- [ ] GIS — dark basemap, controls, legend, and popups readable.
- [ ] Scan page — QR surfaces stay white (scannable); video box is black.
- [ ] No stray light-on-light or dark-on-dark text anywhere.

---

## 5. Responsive / Mobile

- [ ] Field roles on mobile use the bottom tab bar; admins use the drawer.
- [ ] Safe-area insets respected on notched devices.
- [ ] Tables/lists reflow without horizontal scrolling.
- [ ] Tap targets are large enough; scanner button is reachable one-handed.
- [ ] PWA installs (Add to Home Screen) and launches standalone.

---

## 6. Localisation

- [ ] Every visible string switches EN ↔ TL (no missing keys / raw `key.path` text).
- [ ] Dates/times format per locale.
- [ ] Language choice persists across reloads.

---

## 7. Performance & Resilience

- [ ] Dashboard/Not-found/audit error states render the ErrorBoundary gracefully
      ("Your data is safe") rather than a blank screen.
- [ ] Slow/absent network shows loading and error states, not infinite spinners.
- [ ] Offline scan queues and syncs on reconnect (no silent data loss).
- [ ] No unhandled console errors during a full click-through.

---

## 8. Known Limitations (acceptable for the demo)

- Demo data is labelled sample data, not real Mamburao statistics.
- `GET /patrol/session/active` returns an empty body when idle (client-normalized).
- Uploads are stored on the API's local filesystem (not object storage).
