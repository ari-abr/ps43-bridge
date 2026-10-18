# PS43 Bridge (hackathon demo)

Demo app for the PS43 Foundation "Building Bridges to Education" challenge (Cameroon).
One installable web app (PWA) with three modules, chosen by a role switcher in the header.
NO logins and NO backend in this demo.

## Modules
1. Admin Map (/admin, online): map of schools coloured by readiness tier 0-3
   (grey = unassessed), filters, school side panel with "Why this score?" bars,
   priority list by need score ("Next to equip" = assessed without a kit; "In progress"
   collapsed), "Needs attention" card, partners layer, donor report.
   "Find a school" search above the map (all schools; relaxes filters that hide the choice).
   "Resources and gaps" card: partner pledges vs. what the next N schools to equip need.
2. Field Tools (/field, offline): school survey form, shipment list, QR scan of devices,
   confirm delivery, monthly check-in form, sync status.
3. Learning (/learn/teacher, /learn/student, offline): student lessons + quizzes,
   teacher class progress view, versioned course packs. One course: Times Tables (v1, v2).

## Data
- Seed data is JSON in src/data/ (schools, surveys, shipments, partners, kits, pledges, courses).
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
  - Partner pledges: seed in src/data/pledges.json, new ones go to "pledges" (never edited);
    "Mark delivered" is its own record in "pledgeEvents". getPledges() also counts this
    device's queued pledges, so gaps update while Offline.
- A header toggle switches Online/Offline. Offline writes go to an upload queue;
  going Online flushes the queue through api.ts.
- api.ts fires an update on every change; the browser "storage" event refreshes other windows.
- Tier and need-score rules live in src/lib/scoring.ts. Partner matching lives in
  src/lib/matching.ts. Reuse them; don't duplicate the logic.
  getScoreBreakdown() gives the need score and its per-factor points; needScore() calls it.
- Resource needs per tier (TIER_NEEDS, demo estimates partly from kits.json), need-vs-pledge
  gaps and the shared priority ranking (rankByNeed) live in src/lib/resourceGaps.ts.
- "Needs attention" items come from getAttentionItems() in src/lib/attention.ts (thresholds
  at the top). Derived from getSchools() only, nothing stored. "Now" is the real clock (no
  demo clock; "Simulate 30 days" writes check-ins dated now).
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




