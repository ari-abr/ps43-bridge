# PS43 Bridge (hackathon demo)

Demo app for the PS43 Foundation "Building Bridges to Education" challenge (Cameroon).
One installable web app (PWA) with three modules, chosen by a role switcher in the header.
NO logins and NO backend in this demo.

## Modules
1. Admin Map (/admin, online): map of schools coloured by readiness tier 0-3
   (grey = unassessed), filters, school side panel, priority list by need score,
   partners layer, donor report.
2. Field Tools (/field, offline): school survey form, shipment list, QR scan of devices,
   confirm delivery, monthly check-in form, sync status.
3. Learning (/learn/teacher, /learn/student, offline): student lessons + quizzes,
   teacher class progress view, versioned course packs. One course: Times Tables (v1, v2).

## Data
- Seed data is JSON in src/data/ (schools, surveys, shipments, partners, kits, courses).
- School locations are real (OpenStreetMap); school names are fictional because the
  readiness, shipment and learning data is simulated. Partners are fictional too.
  Label all of it "demo data".
- All runtime changes are saved in localStorage under keys starting with "ps43:".
- src/lib/api.ts is the fake server. Every module reads and writes through it only.
  - Uploaded surveys go to the "surveys" collection as {id, schoolId, ...survey}.
  - Uploaded shipments go to the "shipments" collection.
  - getSchools() merges each school with its latest survey (newest surveyedAt wins),
    tier, need score, shipment, status and requests.
  - Teacher requests go to "requests" (never edited); every status change is its own
    record in "requestEvents". Request status comes from requestStatus() in src/lib/requests.ts.
- A header toggle switches Online/Offline. Offline writes go to an upload queue;
  going Online flushes the queue through api.ts.
- api.ts fires an update on every change; the browser "storage" event refreshes other windows.
- Tier and need-score rules live in src/lib/scoring.ts. Partner matching lives in
  src/lib/matching.ts. Reuse them; don't duplicate the logic.
- Only school-level totals go to the fake server, never individual student records.

## Stack
- React + Vite + TypeScript, vite-plugin-pwa, React Router
- Leaflet + react-leaflet with OpenStreetMap tiles
- One QR generator and one QR scanner library

## Rules
- Keep it simple. Ask before adding other libraries.
- Tier = rules on survey answers. Need score = weighted sum. Kit = lookup by tier. No AI.
- Show sync status on screen ("3 items waiting to upload").
- No photos stored (localStorage is small); use a "photo taken" checkbox instead.
- Layout must work on a phone.



