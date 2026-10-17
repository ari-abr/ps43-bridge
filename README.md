# PS43 Bridge (hackathon demo)

A demo app for the PS43 Foundation "Building Bridges to Education" challenge in Cameroon. It shows how one
installable web app (PWA) can help a foundation find schools, decide who gets a kit first, deliver it,
and see whether students are learning on the devices.

There are no logins and no backend. A small fake server (`src/lib/api.ts`) keeps everything in the browser's
localStorage, so the whole demo runs on one laptop, offline.

## Install and run

You need a current Node.js (22 or newer).

```bash
npm install
npm run dev                      # development, http://localhost:5173
```

For the stage demo (and to test offline), run the production build. The service worker only works there:

```bash
npm run build && npm run preview # http://localhost:4173
```

Open the app once while Online so it can cache itself, then it also opens with no connection. To install it,
use the browser's "Install app" button in the address bar (Chrome or Edge), or "Add to Home screen" on a phone.

Other scripts: `npm run seed` rebuilds the seed data in `src/data/`, `npm run fetch-schools` downloads school
locations from OpenStreetMap again.

Notes:

- The phone camera (QR scanning) only works on `localhost` or HTTPS. On plain `http://` addresses the app says so
  and offers manual entry of the tag (for example `12` for `PS43-0012`).
- Map background tiles come from OpenStreetMap. Tiles you looked at while Online are cached; if the Wi-Fi drops
  before you have seen an area, the background is blank but all schools still show and can be clicked.
  Before a demo, open the Admin Map once Online and zoom around each region.

## The three modules

Pick a role in the header (on a phone it is under "Menu"):

| Role | Page | Works offline | What it does |
| --- | --- | --- | --- |
| Admin | `/admin` | No (needs Online to approve kits and publish) | Map of 300 schools coloured by readiness tier (grey = unassessed), filters, school panel, priority list by need score, partner matching, kit approval, shipments, learning colours, donor report (`/admin/report`), printable QR tags |
| Coordinator, in Field Tools | `/field` | Yes | School survey form, deliveries (scan QR tags and confirm), monthly device check-in, upload queue |
| Teacher and Student, in Learning | `/learn/teacher`, `/learn/student` | Yes | Times Tables lessons and quiz, class progress for the teacher, delivery confirmation by the teacher, course updates (v1 to v2) |

The header toggle switches the demo Online or Offline. While Offline, saves go to an upload queue and the header
shows "3 items waiting to upload". Going Online sends the queue.

Rules are plain code, no AI: tier = rules on survey answers (`src/lib/scoring.ts`), need score = weighted sum
(`src/lib/scoring.ts`), kit = lookup by tier, partners = lookup by tier and distance (`src/lib/matching.ts`).

## Demo controls and the demo scene

On the Admin page, open **Demo controls**:

- **Set up demo scene** resets all data, then chooses three grey (unassessed) schools, one per region, for the live
  survey, and one assessed Tier 1 school with an approved kit (9 devices) for the delivery demo. Their names are
  shown in the box, so you know which to use on stage. It needs Online.
- **Publish Times Tables v2** makes version 2 the one devices should install.
- **Simulate 30 days** fills every school with a verified kit with simulated learning totals and a device check-in.
- **Reset demo data** clears everything this app saved (also in the header).

Developer hook: set `localStorage["ps43:debug:failUploads"] = "1"` in the browser console to make every upload
fail, to test that items stay queued and retry. It is not shown in the app.

## Real vs simulated

Real:

- School locations (from OpenStreetMap).
- The app itself: offline use, the upload queue, QR scanning, the scoring rules.

Simulated (labelled "demo data" in the app):

- School names (fictional, so no real school is rated or named).
- All surveys, readiness tiers, shipments, delivery confirmations, check-ins and learning figures.
- Partners (fictional suppliers and transporters).
- The server: `src/lib/api.ts` is a fake server that waits about 300 ms per call and stores data in localStorage.
  Nothing leaves the device.

Privacy: only school-level totals go to the fake server. Student names and individual results stay on the
device. No photos are stored; delivery uses a "photo taken" checkbox.

## Stack

React, Vite and TypeScript, vite-plugin-pwa, React Router, Leaflet with react-leaflet and OpenStreetMap tiles,
`qrcode` for QR tags and `qr-scanner` for scanning.
