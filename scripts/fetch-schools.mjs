// Downloads school locations from OpenStreetMap (Overpass API) for the demo regions.
// Run with: npm run fetch-schools
// Writes raw responses to data-raw/overpass-<region>.json and a cleaned list to data-raw/schools-raw.json.

import { mkdir, writeFile } from 'node:fs/promises'

const SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter', // backup, tried once if the main server fails
]
const USER_AGENT = 'PS43 Bridge hackathon demo'
const TIMEOUT_S = 60
const PAUSE_MS = 5000
const OUT_DIR = 'data-raw'

const REGIONS = [
  { key: 'littoral', name: 'Littoral', iso: 'CM-LT' },
  { key: 'west', name: 'West', iso: 'CM-OU' },
  { key: 'centre', name: 'Centre', iso: 'CM-CE' },
]

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function buildQuery(iso) {
  return `[out:json][timeout:${TIMEOUT_S}];
area["ISO3166-2"="${iso}"]->.region;
nwr["amenity"="school"](area.region);
out center;`
}

async function queryServer(server, query) {
  const res = await fetch(server, {
    method: 'POST',
    headers: {
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: 'data=' + encodeURIComponent(query),
    signal: AbortSignal.timeout((TIMEOUT_S + 15) * 1000),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}: ${text.slice(0, 300).replace(/\s+/g, ' ')}`)
  let json
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error(`Response was not JSON: ${text.slice(0, 300).replace(/\s+/g, ' ')}`)
  }
  // Overpass reports some failures (e.g. out of time/memory) inside a 200 response.
  if (json.remark && /error|timed out|out of memory/i.test(json.remark)) throw new Error(`Overpass remark: ${json.remark}`)
  return json
}

async function fetchRegion(region) {
  const query = buildQuery(region.iso)
  const errors = []
  for (const server of SERVERS) {
    try {
      const json = await queryServer(server, query)
      const count = json.elements?.length ?? 0
      if (count === 0) throw new Error('0 results returned')
      return { json, server }
    } catch (err) {
      const message = `${server} -> ${err.name === 'TimeoutError' ? 'request timed out' : err.message}`
      errors.push(message)
      console.error(`  ! ${region.name}: ${message}`)
    }
  }
  return { errors }
}

function toRow(el, regionName) {
  const lat = el.lat ?? el.center?.lat
  const lng = el.lon ?? el.center?.lon
  const name = (el.tags?.name ?? '').trim()
  return { osmId: `${el.type}/${el.id}`, name, region: regionName, lat, lng }
}

await mkdir(OUT_DIR, { recursive: true })

const failures = []
const stats = []
const byId = new Map()

for (let i = 0; i < REGIONS.length; i++) {
  const region = REGIONS[i]
  if (i > 0) await sleep(PAUSE_MS)
  console.log(`Fetching ${region.name} (${region.iso})...`)

  const result = await fetchRegion(region)
  if (!result.json) {
    failures.push({ region: region.name, errors: result.errors })
    stats.push({ region: region.name, total: 0, named: 0, unnamed: 0 })
    continue
  }

  await writeFile(`${OUT_DIR}/overpass-${region.key}.json`, JSON.stringify(result.json))
  const rows = result.json.elements.map((el) => toRow(el, region.name)).filter((r) => r.lat != null && r.lng != null)
  const named = rows.filter((r) => r.name)
  stats.push({ region: region.name, total: rows.length, named: named.length, unnamed: rows.length - named.length })
  for (const r of named) if (!byId.has(r.osmId)) byId.set(r.osmId, r)
  console.log(`  ok via ${result.server}`)
}

const schools = [...byId.values()]
await writeFile(`${OUT_DIR}/schools-raw.json`, JSON.stringify(schools, null, 2) + '\n')

console.log('\nSchools per region:')
console.table(stats.map((s) => ({ Region: s.region, 'All': s.total, 'With name': s.named, 'Without name': s.unnamed })))
console.log(`Saved ${schools.length} named, unique schools to ${OUT_DIR}/schools-raw.json`)
console.log('\nSample rows:')
console.log(schools.slice(0, 5))

if (failures.length) {
  console.error('\nFAILED regions:')
  for (const f of failures) {
    console.error(`- ${f.region}`)
    f.errors.forEach((e) => console.error(`    ${e}`))
  }
  process.exitCode = 1
}
