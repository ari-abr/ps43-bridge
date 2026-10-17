import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getSchools, subscribe, type SchoolView } from '../lib/api'
import { TIER_LABELS, type Tier } from '../lib/scoring'
import { summarise, workingOfTotal } from '../lib/report'
import { capitalise } from '../components/admin/tierStyle'

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

  useEffect(() => {
    let live = true
    const load = () => void getSchools().then((s) => live && setAll(s))
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
  const hasSimulated = schools.some((s) => s.progress?.simulated || s.checkin?.simulated)

  if (all === null) return <p className="print-note">Loading report…</p>

  const tierRows = ([0, 1, 2, 3] as Tier[]).map((t) => ({ label: TIER_LABELS[t], n: schools.filter((s) => s.tier === t).length }))
  const unassessed = schools.filter((s) => s.tier === null).length

  const headline: [string, string | number, string?][] = [
    ['Schools mapped', sum.schoolsMapped],
    ['Schools assessed', sum.assessed],
    ['Kits delivered', sum.kitsDelivered, 'confirmed by the field coordinator'],
    ['Kits verified', sum.kitsVerified, 'confirmed by coordinator and teacher'],
    ['Devices delivered', sum.devicesDelivered],
    ['Devices working', sum.devicesWorkingPct === null ? '–' : `${sum.devicesWorkingPct}%`, sum.devicesChecked ? `${sum.devicesWorking} of ${sum.devicesChecked} checked` : 'no check-ins yet'],
    ['Active learners', sum.schoolsWithProgress ? sum.activeLearners : '–', sum.schoolsWithProgress ? `${sum.schoolsWithProgress} school${sum.schoolsWithProgress === 1 ? '' : 's'} reporting` : 'no learning data yet'],
    ['Average mastery rate', pct(sum.averageMastery), 'share of learners scoring 80% or more'],
  ]

  return (
    <div className="print-page report">
      <div className="print-toolbar">
        <Link to="/admin">← Admin Map</Link>
        <span className="toolbar-actions">
          <button type="button" className="btn-secondary" onClick={() => downloadCsv(rows, region)} disabled={rows.length === 0}>
            Download CSV
          </button>
          <button type="button" className="btn-primary" onClick={() => window.print()}>
            Print / Save as PDF
          </button>
        </span>
      </div>

      <header className="report-head">
        <h1>PS43 Bridge: progress report</h1>
        <p>
          {region === 'all' ? 'All regions' : `${region} region`} · {new Date().toLocaleDateString([], { dateStyle: 'long' })}{' '}
          <span className="pill pill-demo">Demo data</span>
        </p>
        <p className="small muted">
          Building Bridges to Education, Cameroon. School locations are real; school names, partners and all survey,
          shipment and learning figures are simulated for this demo.
          {hasSimulated && ' Includes simulated 30-day learning and device data.'}
        </p>
      </header>

      <section className="report-section">
        <h2>Headline numbers</h2>
        <div className="report-grid">
          {headline.map(([label, value, note]) => (
            <div key={label} className="report-stat">
              <div className="report-value">{value}</div>
              <div className="report-label">{label}</div>
              {note && <div className="report-note">{note}</div>}
            </div>
          ))}
        </div>
      </section>

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
          <table className="report-table">
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
                  <td>{r.name}</td>
                  <td>{r.region}</td>
                  <td>{r.tier}</td>
                  <td>{r.status}</td>
                  <td className="num">{r.devicesWorking}</td>
                  <td className="num">{r.activeLearners}</td>
                  <td className="num">{r.mastery}</td>
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
    </div>
  )
}
