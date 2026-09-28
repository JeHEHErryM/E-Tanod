# E-Tanod — Barangay Security Startup Concept

## SUMMARY

Barangay tanods (village watchmen) in the Philippines secure communities on foot, but most still operate with paper logs, group chats, and radio — with no way to prove patrols actually happened, map incidents, or report problems in real time. **E-Tanod** is a GIS-based patrol management and incident mapping platform with secure QR checkpoints for barangay security. Tanods scan geofence-verified QR codes to log every checkpoint; incidents are geo-tagged and mapped in real time; residents can report directly from their phones; and barangay officials get live patrol status, incident heatmaps, and an append-only audit trail. Built as an offline-first PWA, it works even in areas with weak connectivity. The value proposition: **provable, accountable patrols and data-driven peace-and-order decisions at barangay scale.** Currently deployed as a working prototype for Mamburao, Occidental Mindoro.

## BACKGROUND OF THE PROBLEM

The Philippines has roughly 42,000 barangays (estimate) that rely on volunteer tanods under the Barangay Peace and Order framework (Local Government Code of 1991, RA 7160). Patrol logs are frequently written after the fact or not at all; supervisors cannot confirm that a tanod actually visited a checkpoint. Incident reports are typed or texted piecemeal, so there is no consistent map of where crimes cluster. Residents often have no simple channel to report other than walking to the hall. For local officials, this means reactive handling, no evidence for accountability, and no data to support staffing or resource deployment. The problem is most acute in lower-income, rural municipalities like Mamburao, Occidental Mindoro, where connectivity is limited and manual paper processes dominate.

## PROPOSED STARTUP SOLUTION

E-Tanod is a Progressive Web App (PWA) combining: **patrol management & scheduling**, **secure QR checkpoints with geofencing validation** (a scan only counts inside the correct radius), **live incident mapping and crime heatmaps**, **resident reporting**, **offline-first synchronization** (works without signal, syncs when back online), and **real-time monitoring**, with strict role-based access and an append-only audit log. Four roles — Resident, Tanod, Barangay Admin, Super Admin — match the actual organizational structure, and account sign-ups are admin-approved. **SDG priority: SDG 11, Sustainable Cities and Communities** (specifically 11.7, universal access to safe public spaces), with strong alignment to **SDG 16, Peace, Justice and Strong Institutions** (16.1, significant reduction of violence).

## OBJECTIVES

- Make every patrol verifiable: 100% of checkpoint scans geofence-validated and logged on-device even offline.
- Reduce unverified/missed checkpoint recordings to near zero within one planning period of rollout.
- Give officials a live, mapped view of incidents so response begins from the report, not the logbook.
- Onboard 3+ barangays in Mamburao within the first year; target municipality-wide adoption thereafter.
- Make reporting accessible to residents (bilingual EN/TL, phone-based, minimal steps).
- Maintain ≥99% availability for the hosted service and full audit-trail integrity.

## TARGET MARKET / BENEFICIARIES

- **Primary users:** barangay tanods (field), barangay captains, and the Barangay Peace and Order Council (oversight) — the ones who patrol and the ones accountable.
- **Secondary:** residents who report incidents from their phones.
- **Customers (paying):** local government units — barangays first, then the municipal LGU of Mamburao as a municipality-wide license, expanding to neighboring municipalities in Occidental Mindoro; potential institutional partners include DILG, MDRRMO, and the PNP as data-sharing partners.

## VALUE PROPOSITION

- **Tamper-proof accountability:** geofenced QR scans prove a patrol happened, where, and when — unlike paper logs or chat messages.
- **Offline-first:** rural barangays with weak connectivity are the core use case, not an afterthought.
- **Decision-support, not paperwork:** incident heatmaps and live dashboards let officials deploy tanods where risk concentrates.
- **Community inclusion:** residents get a one-tap reporting channel; admins approve accounts, keeping the system trustworthy.
- **Cheap and easy to adopt:** PWA needs no app store; bilingual UI; per-barangay pricing far below enterprise GIS suites that no barangay can afford.
- **Trustworthy administration:** granular RBAC plus an append-only audit log; the system advises, barangay officials decide.

## BUSINESS MODEL

- **B2G subscription/licensing (primary):** per-barangay monthly license; discounted municipality-wide bundle; one-time setup, data migration, and training fee.
- **Tiered packages:** Starter (single barangay, patrol + checkpoints); Standard (adds incident mapping + resident reporting); Enterprise municipal (multi-barangay dashboard, analytics, SLA).
- **Support & services revenue:** training workshops for tanods/administrators, annual maintenance, optional device bundle (rugged phone + printed QR plates) resold at cost.
- **Pilot as beachhead:** free/academic pilot in 1–2 Mamburao barangays to generate proof and references before paid rollout.
- Value delivered by reducing incident-response lag and improving patrol compliance; sustained by recurring municipal SaaS renewals and expansion to other LGUs.

## MARKET ANALYSIS

- **Size and demand:** ~42,000 barangays nationally (DILG estimate); Mamburao alone has 15 barangays (verify current count) in a provincial capital of tens of thousands of residents — a tractable pilot and expansion base.
- **Trends:** national digitalization push for LGUs (e-governance initiatives, DILG e-reporting); post-pandemic demand for community safety tools; growing municipal cloud adoption.
- **Competition:** PNP's national ports/e-blotter systems are police-level and national in scope; generic reporting or CCTV apps lack patrol-grounded geofenced checkpoints; paper/Excel/group-chat processes are the real default competitor. **Barangay-level, offline-first patrol accountability is essentially unserved.**
- **Risk:** long LGU procurement cycles; mitigated by low cost, offline capability, and a pilot-first go-to-market.

## OPERATIONS PLAN

- **Delivery:** hosted PWA on Railway (frontend + API + PostgreSQL); offline mode via IndexedDB + service worker; real-time sync via Socket.IO; Mapbox for GIS layers.
- **Rollout roadmap (five increments):** (1) core system, auth, RBAC, users, barangays, audit; (2) patrols + secure checkpoints; (3) GIS mapping & spatial analytics; (4) offline architecture & synchronization; (5) resident reporting & public portal.
- **Deployment model:** pilot in one barangay → demo to the BPOC and municipal office → expand barangay-by-barangay; provision QR plates, install the app on tanod devices (BYOD friendly), run two-hour admin + tanod trainings.
- **Data governance:** PH Personal Data Protection Act (RA 10173) alignment; incident/crime data handled as decision-support only; real production data clearly separated from demo data; admin approval on every account.

## FINANCIAL REQUIREMENT

Pilot-stage funding for 12 months (PHP, planning figures — validate before submitting):

- **Infrastructure & hosting (12 mo):** PHP 8,000 — Railway services, PostgreSQL, bandwidth.
- **GIS/data services (12 mo):** PHP 3,500 — Mapbox tile/geocoding budget (public token, limited volume).
- **Domain, compliance, misc:** PHP 2,500.
- **Deployment & training:** PHP 15,000 — QR plates, printing, training materials, barangay pilot travel.
- **Contingency (15%):** PHP 4,500.
- **Total seed requirement: ≈ PHP 34,000 (~USD 600) for the pilot year.** (Excluding an optional device bundle and beyond-scope hardware.)

Allocation objectives: ~50% deployment/training, ~25% infra & data, ~10% compliance/misc, ~15% contingency; break-even target at the transition from two free pilot barangays to three-plus paid subscriptions in year two.