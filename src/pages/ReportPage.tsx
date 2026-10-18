import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getPledges, getSchools, subscribe, type PledgeView, type SchoolView } from '../lib/api'
import { DEFAULT_NEXT_COUNT, RESOURCE_LABELS, demandFor, isNextToEquip, rankByNeed, resourceGaps, type ResourceGap } from '../lib/resourceGaps'
import { TIER_LABELS, type Tier } from '../lib/scoring'
import { summarise, workingOfTotal } from '../lib/report'
import { loadWeights } from '../components/admin/PrioritySettings'
import { capitalise } from '../components/admin/tierStyle'
import { Arrow, ArrowLeft, Download } from '../components/ui/Icons'
import StatsBand from '../components/ui/StatsBand'

const REGIONS = ['Littoral', 'West', 'Centre']
const pct = (n: number | null) => (n === null ? '–' : `${n}%`)

interface Row {
  name: string
  region: string
  tier: string
  status: string
  devicesWorking: string
  activeLearners: string
  mastery: string
}

function toRow(s: SchoolView): Row {
  return {
    name: s.name,
    region: s.region,
    tier: s.tier === null ? 'Unassessed' : `Tier ${s.tier}`,
    status: capitalise(s.status),
    devicesWorking: workingOfTotal(s) ?? '–',
    activeLearners: s.progress ? String(s.progress.activeStudents) : '–',
    mastery: pct(s.progress?.masteryRate ?? null),
  }
}

/** "laptops 40 of 95 (short by 55)" */
function pledgePart(r: ResourceGap): string {
  const n = (v: number) => v.toLocaleString('en')
  const unit = r.resource === 'funding' ? ' CFA francs' : ''
  const tail = r.gap > 0 ? ` (short by ${n(r.gap)})` : r.surplus > 0 ? ` (${n(r.surplus)} spare)` : ''
  return `${RESOURCE_LABELS[r.resource].toLowerCase()} ${n(r.available)} of ${n(r.needed)}${unit}${tail}`
}

const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`

function downloadCsv(rows: Row[], region: string) {
  const head = ['School', 'Region', 'Tier', 'Shipment status', 'Devices working', 'Active learners', 'Mastery rate']
  const lines = [head, ...rows.map((r) => [r.name, r.region, r.tier, r.status, r.devicesWorking, r.activeLearners, r.mastery])]
  // The BOM makes Excel read the accents (é, ï) correctly.
  const blob = new Blob(['﻿' + lines.map((l) => l.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ps43-schools-${region === 'all' ? 'all-regions' : region.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Print-friendly donor report (A4). The region comes from the link on the Admin page: /admin/report?region=West */
export default function ReportPage() {
  const [params] = useSearchParams()
  const region = REGIONS.includes(params.get('region') ?? '') ? params.get('region')! : 'all'
  const [all, setAll] = useState<SchoolView[] | null>(null)
  const [pledges, setPledges] = useState<PledgeView[] | null>(null)

  useEffect(() => {
    let live = true
    const load = () => {
      void getSchools().then((s) => live && setAll(s))
      void getPledges().then((p) => live && setPledges(p))
    }
    load()
    const off = subscribe(load)
    return () => {
      live = false
      off()
    }
  }, [])

  const schools = useMemo(() => (all ?? []).filter((s) => region === 'all' || s.region === region), [all, region])
  const sum = useMemo(() => summarise(schools), [schools])
  const rows = useMemo(
    () =>
      schools
        .filter((s) => s.shipment)
        .sort((a, b) => a.region.localeCompare(b.region) || a.name.localeCompare(b.name))
        .map(toRow),
    [schools],
  )
  // The same "next to equip" ranking as the Admin page (saved Priority settings), for this report's region.
  const nextSchools = useMemo(
    () => rankByNeed(schools, loadWeights()).filter((r) => isNextToEquip(r.school)).slice(0, DEFAULT_NEXT_COUNT),
    [schools],
  )
  const pledgeGaps = useMemo(
    () => (pledges ? resourceGaps(demandFor(nextSchools.map((r) => r.school.tier!)), pledges) : null),
    [nextSchools, pledges],
  )
  const hasSimulated = schools.some((s) => s.progress?.simulated || s.checkin?.simulated)

  if (all === null) return <p className="print-note">Loading report…</p>

  const tierRows = ([0, 1, 2, 3] as Tier[]).map((t) => ({ label: TIER_LABELS[t], n: schools.filter((s) => s.tier === t).length }))
  const unassessed = schools.filter((s) => s.tier === null).length

  const headline: [string, string | number, string?][] = [
    ['Schools Mapped', sum.schoolsMapped, 'real school locations'],
    ['Schools Assessed', sum.assessed, 'surveyed by a coordinator'],
    ['Schools Reached', sum.kitsDelivered, 'kit delivered, confirmed by the coordinator'],
    ['Kits Verified', sum.kitsVerified, 'confirmed by coordinator and teacher'],
    ['Technology Equipped', sum.devicesDelivered, 'devices delivered'],
    ['Devices Working', sum.devicesWorkingPct === null ? '–' : `${sum.devicesWorkingPct}%`, sum.devicesChecked ? `${sum.devicesWorking} of ${sum.devicesChecked} checked` : 'no check-ins yet'],
    ['Youth Reached', sum.schoolsWithProgress ? sum.activeLearners : '–', sum.schoolsWithProgress ? `active learners, ${sum.schoolsWithProgress} school${sum.schoolsWithProgress === 1 ? '' : 's'} reporting` : 'no learning data yet'],
    ['Mastery Rate', pct(sum.averageMastery), 'learners scoring 80% or more'],
    ['Requests Received', sum.requestsReceived, 'equipment and resource requests from schools'],
    ['Requests Fulfilled', sum.requestsFulfilled, 'linked shipment delivered'],
  ]

  return (
    <main className="print-page report">
      <div className="print-toolbar">
        <Link to="/admin" className="btn-link">
          <ArrowLeft /> Admin Map
        </Link>
        <span className="toolbar-actions">
          <button type="button" className="btn-secondary" onClick={() => downloadCsv(rows, region)} disabled={rows.length === 0}>
            <Download /> Download CSV
          </button>
          <button type="button" className="btn-primary" onClick={() => window.print()}>
            Print / Save as PDF <Arrow />
          </button>
        </span>
      </div>

      <header className="report-head">
        <p className="eyebrow">PS43 Foundation · Building Bridges to Education</p>
        <h1 className="display">Progress report</h1>
        <p className="report-meta">
          {region === 'all' ? 'All regions' : `${region} region`} · {new Date().toLocaleDateString([], { dateStyle: 'long' })}{' '}
          · <strong>Demo data</strong>
        </p>
      </header>
      <p className="small muted report-disclaimer">
        Made with PS43 Bridge, a hackathon prototype (not an official PS43 Foundation product). School locations are
        real; school names, partners and all survey, shipment and learning figures are simulated.
        {hasSimulated && ' Includes simulated 30-day learning and device data.'}
      </p>

      <section className="report-section">
        <h2 className="label-rule">Our impact in numbers</h2>
        <StatsBand label="Headline numbers" items={headline.map(([label, value, hint]) => ({ label, value, hint }))} />
      </section>

      {pledgeGaps && nextSchools.length > 0 && (
        <section className="report-section">
          <h2>Pledged resources vs. needs</h2>
          <p>
            Pledged resources vs. needs for the next {nextSchools.length} school{nextSchools.length === 1 ? '' : 's'} to equip:{' '}
            {pledgeGaps.map(pledgePart).join('; ')}. Pledges from fictional partners; needs are demo estimates per kit.
          </p>
        </section>
      )}

      <section className="report-section">
        <h2>Schools by readiness tier</h2>
        <table className="report-table small-table">
          <thead>
            <tr>
              <th>Tier</th>
              <th className="num">Schools</th>
            </tr>
          </thead>
          <tbody>
            {tierRows.map((t) => (
              <tr key={t.label}>
                <td>{t.label}</td>
                <td className="num">{t.n}</td>
              </tr>
            ))}
            <tr className="subtotal">
              <td>Assessed</td>
              <td className="num">{sum.assessed}</td>
            </tr>
            <tr>
              <td>Unassessed</td>
              <td className="num">{unassessed}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="report-section">
        <h2>Schools with a kit ({rows.length})</h2>
        {rows.length === 0 ? (
          <p className="muted">No school has a kit yet.</p>
        ) : (
          <table className="report-table stack-table">
            <thead>
              <tr>
                <th>School</th>
                <th>Region</th>
                <th>Tier</th>
                <th>Shipment</th>
                <th className="num">Devices working</th>
                <th className="num">Active learners</th>
                <th className="num">Mastery</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name}>
                  <td data-label="School">{r.name}</td>
                  <td data-label="Region">{r.region}</td>
                  <td data-label="Tier">{r.tier}</td>
                  <td data-label="Shipment">{r.status}</td>
                  <td className="num" data-label="Devices working">{r.devicesWorking}</td>
                  <td className="num" data-label="Active learners">{r.activeLearners}</td>
                  <td className="num" data-label="Mastery">{r.mastery}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="report-section report-method">
        <h2>How this data is collected</h2>
        <ul>
          <li>
            <strong>Surveys:</strong> field coordinators visit each school and record power, signal, pupils, teachers and
            a secure room. The readiness tier follows from those answers by simple rules.
          </li>
          <li>
            <strong>Delivery:</strong> a kit counts as delivered when the coordinator has scanned the QR tag on each
            device and confirmed, and as verified when the teacher has also confirmed what arrived.
          </li>
          <li>
            <strong>Device check-ins:</strong> every month a coordinator counts the devices that are working, broken or
            missing.
          </li>
          <li>
            <strong>Learning totals:</strong> each school&apos;s devices send school-level totals only (active students,
            lessons, quiz attempts, mastery rate), also when they have been offline for a while.
          </li>
          <li>
            <strong>Privacy:</strong> student names and individual results never leave the school&apos;s device.
          </li>
        </ul>
      </section>
    </main>
  )
}
