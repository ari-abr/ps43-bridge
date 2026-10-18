// UI review: screenshots of every route at three widths, plus direct-link checks.
// Run with: node scripts/ui-review.ts [baseUrl]
//   default baseUrl: https://ps43bridge.netlify.app
//   local preview:   npm run build && npm run preview, then node scripts/ui-review.ts http://localhost:4173
// Output goes to ui-review/ (screenshots, print previews, report.json).

import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'
import type { Browser, BrowserContext, Page } from 'playwright'

const BASE = (process.argv[2] ?? 'https://ps43bridge.netlify.app').replace(/\/$/, '')
const OUT = 'ui-review'
const WIDTHS = [1440, 768, 375]

interface Shot {
  name: string
  path: string
  tab?: string
}

const SHOTS: Shot[] = [
  { name: 'home', path: '/' },
  { name: 'admin', path: '/admin' },
  { name: 'admin-report', path: '/admin/report' },
  { name: 'field-survey', path: '/field', tab: 'Survey' },
  { name: 'field-deliveries', path: '/field', tab: 'Deliveries' },
  { name: 'field-checkins', path: '/field', tab: 'Check-ins' },
  { name: 'learn-student', path: '/learn/student' },
  { name: 'learn-teacher', path: '/learn/teacher' },
  { name: 'curriculum', path: '/curriculum' },
  { name: 'compliance', path: '/compliance' },
  { name: 'roadmap', path: '/roadmap' },
]

const PRINT_ROUTES = ['/admin/report', '/compliance', '/curriculum', '/roadmap']

const report: Record<string, unknown> = { base: BASE, at: new Date().toISOString() }

/** Waits for the page and map tiles to settle (tiles come from OpenStreetMap). */
async function settle(page: Page) {
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(800)
}

async function open(page: Page, shot: Shot) {
  const res = await page.goto(BASE + shot.path, { waitUntil: 'domcontentloaded' })
  if (res && res.status() === 404) {
    // Direct link is broken on the host: open "/" and let the app's router navigate instead.
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
    await page.evaluate((p) => {
      history.pushState({}, '', p)
      dispatchEvent(new PopStateEvent('popstate'))
    }, shot.path)
  }
  if (shot.tab) await page.getByRole('tab', { name: shot.tab }).click()
  await settle(page)
}

/** Page checks: sideways scroll, small tap targets, low contrast text, display font. */
async function audit(page: Page, width: number) {
  return page.evaluate((width) => {
    const doc = document.documentElement
    const overflow = doc.scrollWidth > doc.clientWidth
    const wide: string[] = []
    const describe = (el: Element) =>
      `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''}`
    for (const el of Array.from(document.querySelectorAll('body *'))) {
      const r = el.getBoundingClientRect()
      if (r.width && r.right > doc.clientWidth + 1 && getComputedStyle(el).position !== 'fixed') {
        // Skip children of elements that scroll on purpose.
        let p = el.parentElement
        let scrolls = false
        while (p && p !== document.body) {
          const o = getComputedStyle(p).overflowX
          if (o === 'auto' || o === 'scroll' || o === 'hidden') { scrolls = true; break }
          p = p.parentElement
        }
        if (!scrolls) wide.push(`${describe(el)} right=${Math.round(r.right)}`)
      }
    }

    const small: string[] = []
    if (width < 500) {
      for (const el of Array.from(document.querySelectorAll('a[href], button, input, select, summary, [role="tab"]'))) {
        const r = el.getBoundingClientRect()
        if (!r.width || !r.height) continue
        // Inline links inside running text are exempt from the 44px rule (WCAG 2.5.8 inline exception).
        if (el.tagName === 'A' && getComputedStyle(el).display === 'inline') continue
        if (el instanceof HTMLInputElement && (el.type === 'radio' || el.type === 'checkbox') && el.closest('label')) continue
        if (r.height < 43.5 || r.width < 23.5) small.push(`${describe(el)} "${(el.textContent ?? '').trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`)
      }
    }

    const lum = (rgb: number[]) => {
      const [r, g, b] = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    const parse = (c: string) => (c.match(/[\d.]+/g) ?? []).map(Number)
    const bgOf = (el: Element | null): number[] => {
      while (el) {
        const c = parse(getComputedStyle(el).backgroundColor)
        if (c.length >= 3 && (c.length === 3 || c[3] > 0.5)) return c.slice(0, 3)
        el = el.parentElement
      }
      return [255, 255, 255]
    }
    const lowContrast = new Set<string>()
    for (const el of Array.from(document.querySelectorAll('body *'))) {
      const own = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent!.trim())
      if (!own) continue
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.display === 'none' || !el.getBoundingClientRect().width) continue
      if (el.closest('.leaflet-container') && !el.closest('.leaflet-control')) continue
      const fg = parse(cs.color)
      const bg = bgOf(el)
      const [a, b] = [lum(fg.slice(0, 3)), lum(bg)].sort((x, y) => y - x)
      const ratio = (a + 0.05) / (b + 0.05)
      const size = parseFloat(cs.fontSize)
      const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700)
      if (ratio < (large ? 3 : 4.5) && !(el as HTMLElement).closest('[disabled]'))
        lowContrast.add(`${describe(el)} "${el.textContent!.trim().slice(0, 30)}" ${ratio.toFixed(2)} fg=${cs.color} bg=rgb(${bg})`)
    }

    return {
      overflow,
      scrollWidth: doc.scrollWidth,
      wide: wide.slice(0, 15),
      smallTargets: small.slice(0, 40),
      lowContrast: Array.from(lowContrast).slice(0, 30),
      displayFont: document.fonts.check('40px "League Gothic"'),
    }
  }, width)
}

/** Fresh context per route, as if someone pasted the link: status, console errors, failed requests. */
async function directLinks(browser: Browser) {
  const out: Record<string, unknown> = {}
  const paths = [...new Set(SHOTS.map((s) => s.path)), '/print/tags/demo']
  for (const path of paths) {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    const consoleErrors: string[] = []
    const failed: string[] = []
    page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()))
    page.on('pageerror', (e) => consoleErrors.push(String(e)))
    page.on('requestfailed', (r) => failed.push(`${r.url()} ${r.failure()?.errorText}`))
    page.on('response', (r) => r.status() >= 400 && failed.push(`${r.status()} ${r.url()}`))
    const res = await page.goto(BASE + path, { waitUntil: 'domcontentloaded' })
    await settle(page)
    const status = res?.status()
    const reload = await page.reload({ waitUntil: 'domcontentloaded' })
    out[path] = {
      status,
      afterRefresh: reload?.status(),
      title: await page.title(),
      hasApp: (await page.locator('#root > *').count()) > 0,
      consoleErrors,
      failed,
    }
    await ctx.close()
  }
  return out
}

async function setUpScene(page: Page) {
  await open(page, { name: 'admin', path: '/admin' })
  await page.getByText('Demo controls').click()
  await page.getByRole('button', { name: 'Set up demo scene' }).click()
  await page.getByRole('button', { name: 'Yes, clear and set up' }).click()
  await page.getByText('Demo scene ready.').waitFor({ timeout: 20000 })
}

async function resetData(page: Page) {
  await open(page, { name: 'admin', path: '/admin' })
  await page.getByText('Demo controls').click()
  await page.locator('#main').getByRole('button', { name: 'Reset demo data' }).click()
  await Promise.all([page.waitForEvent('load'), page.getByRole('button', { name: 'Yes, reset' }).click()])
}

async function captureAll(ctx: BrowserContext, state: string) {
  const audits: Record<string, unknown> = {}
  const page = await ctx.newPage()
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 })
    for (const shot of SHOTS) {
      await open(page, shot)
      await page.screenshot({ path: `${OUT}/${state}-${shot.name}-${width}.png`, fullPage: true })
      audits[`${shot.name}@${width}`] = await audit(page, width)
    }
    // Phone menu, open.
    if (width < 1024) {
      await open(page, { name: 'menu', path: '/admin' })
      await page.getByRole('button', { name: 'Open menu' }).click()
      await page.screenshot({ path: `${OUT}/${state}-menu-open-${width}.png` })
    }
  }
  await page.close()
  return audits
}

async function capturePrint(ctx: BrowserContext) {
  const page = await ctx.newPage()
  await page.setViewportSize({ width: 794, height: 1123 })
  await page.emulateMedia({ media: 'print' })
  for (const path of PRINT_ROUTES) {
    const name = path.slice(1).replace(/\//g, '-')
    await page.goto(BASE + path, { waitUntil: 'domcontentloaded' })
    await settle(page)
    await page.screenshot({ path: `${OUT}/print-${name}.png`, fullPage: true })
    await page.pdf({ path: `${OUT}/print-${name}.pdf`, format: 'A4', printBackground: false })
  }
  await page.close()
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch()

  console.log('Direct links…')
  report.directLinks = await directLinks(browser)

  // The app's own routing still works from "/", so screenshots navigate in-app if direct links 404.
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })

  console.log('Demo scene…')
  await setUpScene(page)
  report.demo = await captureAll(ctx, 'demo')
  console.log('Print previews…')
  await capturePrint(ctx)

  console.log('Empty state…')
  await resetData(page)
  report.empty = await captureAll(ctx, 'empty')

  report.serviceWorker = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker?.getRegistration()
    return { registered: !!reg, active: reg?.active?.scriptURL ?? null }
  })

  await browser.close()
  writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))
  console.log(`Done: ${OUT}/report.json`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
