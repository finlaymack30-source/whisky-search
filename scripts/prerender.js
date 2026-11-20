/**
 * Post-build static prerender script.
 *
 * Reads dist/index.html and writes per-route HTML files with:
 *   - correct title, description, canonical, og:* and JSON-LD in <head>
 *   - static body content for text-heavy pages (injected into #root so
 *     React rehydrates over it; crawlers see real content without JS)
 *
 * Vercel serves static files before rewrites, so each prerendered file
 * is served directly to crawlers.
 *
 * Run after vite build: node scripts/prerender.js
 */

import { readFileSync, mkdirSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dist = join(__dirname, '../dist')

const BASE_URL = 'https://www.thebottlekeep.co.uk'

// Static body HTML for the LPA explainer — matches LpaPage.jsx content.
// Injected into <div id="root"> so crawlers see real text; React replaces
// it on load with the interactive component.
const LPA_BODY_HTML = `
<article style="max-width:680px;margin:0 auto;padding:56px 48px 96px;font-family:'DM Sans',system-ui,sans-serif">
  <nav style="font-size:11px;color:#9A9080;margin-bottom:32px">
    <a href="/cask-valuation" style="color:#9A9080;text-decoration:none">Cask Valuation</a>
    &rsaquo; What is LPA?
  </nav>
  <h1 style="font-family:Georgia,serif;font-size:40px;font-weight:500;line-height:1.08;color:#1A1A18;letter-spacing:-0.01em;margin-bottom:16px">
    What is LPA?
  </h1>
  <p style="font-size:16px;color:#9A9080;font-weight:300;line-height:1.6;margin-bottom:48px">
    LPA stands for Litres of Pure Alcohol — the standard unit used by distilleries,
    brokers, warehouses and auction houses to measure and price whisky casks.
  </p>

  <section style="margin-bottom:40px">
    <h2 style="font-family:Georgia,serif;font-size:20px;font-weight:400;color:#1A1A18;margin-bottom:14px">How LPA is calculated</h2>
    <p style="font-size:14px;color:#4A4540;font-weight:300;line-height:1.75;margin-bottom:14px">
      LPA measures the volume of pure (100% ABV) alcohol in a cask, regardless of the actual fill volume. The formula is:
    </p>
    <div style="background:#F0EDE6;border:1px solid #E8E4DC;padding:18px 24px;margin-bottom:20px;font-family:monospace;font-size:15px;color:#1A1A18">
      LPA = fill volume (litres) &times; ABV (%) &divide; 100
    </div>
    <p style="font-size:14px;color:#4A4540;font-weight:300;line-height:1.75;margin-bottom:14px">
      For example: a cask containing 250 litres at 63.5% ABV holds 158.75 LPA.
    </p>
    <p style="font-size:14px;color:#4A4540;font-weight:300;line-height:1.75;margin-bottom:14px">
      ABV can rise or fall during maturation depending on warehouse conditions. Your LPA figure changes with each re-gauge.
    </p>
  </section>

  <section style="margin-bottom:40px">
    <h2 style="font-family:Georgia,serif;font-size:20px;font-weight:400;color:#1A1A18;margin-bottom:14px">Where to find your LPA</h2>
    <p style="font-size:14px;color:#4A4540;font-weight:300;line-height:1.75;margin-bottom:14px">Your current LPA is stated on:</p>
    <ul style="padding-left:24px;margin-bottom:14px">
      <li style="font-size:14px;color:#4A4540;font-weight:300;line-height:1.75;margin-bottom:4px">Your warehouse receipt or regauge certificate</li>
      <li style="font-size:14px;color:#4A4540;font-weight:300;line-height:1.75;margin-bottom:4px">Your delivery order (DO)</li>
      <li style="font-size:14px;color:#4A4540;font-weight:300;line-height:1.75;margin-bottom:4px">Your warehouse management statement</li>
      <li style="font-size:14px;color:#4A4540;font-weight:300;line-height:1.75;margin-bottom:4px">A distillery certificate of ownership, if recently issued</li>
    </ul>
    <p style="font-size:14px;color:#4A4540;font-weight:300;line-height:1.75;margin-bottom:14px">
      If you do not have a recent document, your warehouse can issue a regauge on request. Brokers typically require an up-to-date LPA figure before valuing or listing a cask.
    </p>
  </section>

  <section style="margin-bottom:40px">
    <h2 style="font-family:Georgia,serif;font-size:20px;font-weight:400;color:#1A1A18;margin-bottom:14px">Typical LPA ranges by cask type</h2>
    <p style="font-size:14px;color:#4A4540;font-weight:300;line-height:1.75;margin-bottom:14px">LPA varies with cask size and fill level. Approximate typical ranges:</p>
    <table style="border-collapse:collapse;width:100%;margin-bottom:14px;border:1px solid #E8E4DC">
      <tbody>
        <tr style="border-bottom:1px solid #E8E4DC"><td style="padding:10px 16px;font-size:13px;color:#1A1A18">Octave</td><td style="padding:10px 16px;font-size:13px;font-family:monospace;color:#9A9080">50&ndash;65 LPA</td></tr>
        <tr style="border-bottom:1px solid #E8E4DC;background:#FAFAF7"><td style="padding:10px 16px;font-size:13px;color:#1A1A18">Quarter cask</td><td style="padding:10px 16px;font-size:13px;font-family:monospace;color:#9A9080">90&ndash;115 LPA</td></tr>
        <tr style="border-bottom:1px solid #E8E4DC"><td style="padding:10px 16px;font-size:13px;color:#1A1A18">Barrel</td><td style="padding:10px 16px;font-size:13px;font-family:monospace;color:#9A9080">160&ndash;190 LPA</td></tr>
        <tr style="border-bottom:1px solid #E8E4DC;background:#FAFAF7"><td style="padding:10px 16px;font-size:13px;color:#1A1A18">Hogshead</td><td style="padding:10px 16px;font-size:13px;font-family:monospace;color:#9A9080">185&ndash;215 LPA</td></tr>
        <tr style="border-bottom:1px solid #E8E4DC"><td style="padding:10px 16px;font-size:13px;color:#1A1A18">Puncheon</td><td style="padding:10px 16px;font-size:13px;font-family:monospace;color:#9A9080">400&ndash;450 LPA</td></tr>
        <tr><td style="padding:10px 16px;font-size:13px;color:#1A1A18;background:#FAFAF7">Butt</td><td style="padding:10px 16px;font-size:13px;font-family:monospace;color:#9A9080;background:#FAFAF7">430&ndash;480 LPA</td></tr>
      </tbody>
    </table>
    <p style="font-size:12px;color:#9A9080;font-style:italic">
      Illustrative ranges only. Your actual LPA depends on fill volume, current ABV and evaporation losses since filling.
    </p>
  </section>

  <section style="margin-bottom:40px">
    <h2 style="font-family:Georgia,serif;font-size:20px;font-weight:400;color:#1A1A18;margin-bottom:14px">How LPA is used in cask valuation</h2>
    <p style="font-size:14px;color:#4A4540;font-weight:300;line-height:1.75;margin-bottom:14px">
      Cask prices are almost always quoted as &pound; per LPA (&pound;/LPA), which allows casks of different sizes to be compared directly.
      Auction houses, brokers and private sales all use &pound;/LPA. When comparing offers or valuations, always check whether a price is quoted per LPA or as a total &mdash; and whether the LPA figure used is current.
    </p>
  </section>

  <section style="margin-bottom:40px">
    <h2 style="font-family:Georgia,serif;font-size:20px;font-weight:400;color:#1A1A18;margin-bottom:14px">Limitations and what this tool does not cover</h2>
    <p style="font-size:14px;color:#4A4540;font-weight:300;line-height:1.75;margin-bottom:14px">
      The <a href="/cask-valuation" style="color:#1A1A18;border-bottom:1px solid #E8E4DC">cask valuation tool</a>
      produces an indicative estimate only. It is not a formal appraisal and should not be used as the sole basis for buying, selling or insuring a cask.
    </p>
    <ul style="padding-left:24px;margin-bottom:14px">
      <li style="font-size:14px;color:#4A4540;font-weight:300;line-height:1.75;margin-bottom:8px">The estimate is based on auction comparable sales data and carries material uncertainty.</li>
      <li style="font-size:14px;color:#4A4540;font-weight:300;line-height:1.75;margin-bottom:8px">Condition, storage location, documentation quality and provenance can all affect realised price &mdash; none of these are captured in the model.</li>
      <li style="font-size:14px;color:#4A4540;font-weight:300;line-height:1.75;margin-bottom:8px">The cask market is illiquid. Auction clearance rates have been low in 2026; a valuation does not imply a buyer exists at that price.</li>
      <li style="font-size:14px;color:#4A4540;font-weight:300;line-height:1.75;margin-bottom:8px">LPA figures change over time as the cask continues to mature and evaporate. Use a current regauge for any formal transaction.</li>
    </ul>
  </section>

  <div style="border-top:1px solid #E8E4DC;padding-top:32px;text-align:center">
    <a href="/cask-valuation" style="display:inline-block;padding:12px 28px;background:#1A1A18;color:#F5F2EC;font-family:'DM Sans',system-ui,sans-serif;font-size:10px;font-weight:400;letter-spacing:0.2em;text-transform:uppercase;text-decoration:none">
      Get an indicative cask valuation
    </a>
  </div>
</article>
`

const ROUTES = [
  {
    path: 'cask-valuation',
    title: 'Whisky Cask Valuation Tool — Free Indicative Estimate | The Bottle Keep',
    description: 'Free indicative whisky cask valuation built on auction comparable data. Get a data-grounded starting point — calibrated to 2026 clearance rates. Not financial advice; consult a broker for a formal appraisal.',
    ogDescription: 'An independent indicative estimate of whisky cask value, using auction comparable sales. Only 2.1% of casks cleared reserve at auction in 2026. Free to use — not a guaranteed price.',
    canonical: `${BASE_URL}/cask-valuation`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Whisky Cask Valuation Tool',
      description: 'Free indicative whisky cask valuation built on auction comparable data.',
      url: `${BASE_URL}/cask-valuation`,
      isPartOf: { '@type': 'WebSite', url: BASE_URL },
    },
    // No body injection — the form is interactive and relies on JS
    bodyHtml: null,
  },
  {
    path: 'what-is-lpa',
    title: 'What is LPA? Whisky Cask Measurement Explained | The Bottle Keep',
    description: 'LPA (Litres of Pure Alcohol) is the standard unit used to price and trade whisky casks. Learn how it is calculated, where to find it on your documents, and how it is used in cask valuation.',
    ogDescription: 'LPA = litres × ABV ÷ 100. The standard unit brokers and auction houses use to price whisky casks. Find your LPA on your warehouse statement or delivery order.',
    canonical: `${BASE_URL}/what-is-lpa`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'What is LPA? Whisky Cask Measurement Explained',
      description: 'LPA (Litres of Pure Alcohol) is the standard unit used to price and trade whisky casks.',
      url: `${BASE_URL}/what-is-lpa`,
      publisher: { '@type': 'Organization', name: 'The Bottle Keep', url: BASE_URL },
    },
    bodyHtml: LPA_BODY_HTML,
  },
]

const shell = readFileSync(join(dist, 'index.html'), 'utf8')

for (const route of ROUTES) {
  const metaBlock = `
    <title>${route.title}</title>
    <meta name="description" content="${route.description}" />
    <meta property="og:title" content="${route.title}" />
    <meta property="og:description" content="${route.ogDescription}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${route.canonical}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${route.title}" />
    <meta name="twitter:description" content="${route.ogDescription}" />
    <link rel="canonical" href="${route.canonical}" />
    <script type="application/ld+json">${JSON.stringify(route.jsonLd)}</script>`

  let html = shell.replace('<title>The Bottle Keep</title>', metaBlock.trimStart())

  if (route.bodyHtml) {
    // Inject static content into #root so crawlers see real text.
    // React mounts into the same div and replaces it on load.
    html = html.replace('<div id="root"></div>', `<div id="root">${route.bodyHtml}</div>`)
  }

  const outDir = join(dist, route.path)
  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, 'index.html'), html, 'utf8')

  const hasBody = route.bodyHtml ? 'head+body' : 'head only'
  console.log(`prerendered /${route.path} (${hasBody})`)
}

console.log('prerender complete')
