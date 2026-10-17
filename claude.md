# PS43 Bridge (hackathon demo)

Demo app for the PS43 Foundation "Building Bridges to Education" challenge (Cameroon).
One installable web app (PWA) with three modules, chosen by a role switcher in the header.
NO logins and NO backend in this demo.

## Modules
1. Admin Map: map of schools coloured by readiness tier 0-3 (grey = unassessed),
   filters, school side panel, priority list by need score, partners list, donor report.
2. Field Tools: school survey form, shipment list, QR scan of devices,
   confirm delivery, monthly check-in form, sync status.
3. Learning: student lessons + quizzes, teacher class progress view,
   versioned course packs. One course: Times Tables (v1 and v2).

## Data

  going Online flushes the queue through api.ts.
- Listen for the browser "storage" event so a second window updates live.
- An a



dmin "Publish v2" button makes api.ts offer the newer course pack.
- Add a "Reset demo data" button.

## Stack
- React + Vite + TypeScript, vite-plugin-pwa, React Router
- Leaflet + OpenStreetMap
- One QR generator and one QR scanner library

## Rules
- Keep it simple. No extra libraries without asking.
- Only school-level totals go to the fake server, never individual student records.
- Tier = rules on survey answers. Need score = weighted sum. Kit = lookup by tier. No AI.
- Demo data uses fictional school and partner names, labelled "demo data".
- Show sync status on screen ("3 items waiting to upload").
- No photos stored (localStorage is small); use a "photo taken" checkbox instead.