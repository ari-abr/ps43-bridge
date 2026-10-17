# Seed data

Read-only seed files (demo data: real school locations, fictional names, simulated records).
Regenerate with `npm run seed` (see `scripts/seed.ts`).

- `schools.json`: 300 schools in three regions
- `demo-state.json`: starting surveys, shipments and delivery confirmations
- `partners.json`: fictional partners
- `kits.json`: one kit per readiness tier
- `courses/`: the Times Tables course packs (v1, v2) and their manifest

All runtime changes are saved in localStorage (keys starting with `ps43:`) through `src/lib/api.ts`.
