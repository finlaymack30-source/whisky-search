/**
 * Post-build static prerender script.
 *
 * Reads dist/index.html and writes per-route HTML files with correct
 * title, description, canonical, og:* and JSON-LD injected into <head>.
 * Vercel serves static files before rewrites, so each prerendered file
 * is served directly to crawlers.
 *
 * Run after vite build:  node scripts/prerender.js
 */

import { readFileSync, mkdirSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dist = join(__dirname, '../dist')

const BASE_URL = 'https://www.thebottlekeep.co.uk'

const ROUTES = [
  {
    path: 'cask-valuation',
    title: 'Whisky Cask Valuation Tool — Free Indicative Estimate | The Bottle Keep',
    description: 'Free indicative whisky cask valuation built on auction comparable data. Get a data-grounded starting point — calibrated to 2026 clearance rates. Not financial advice; consult a broker for a formal appraisal.',
    ogDescription: 'An independent indicative estimate of whisky cask value, using auction comparable sales. Only 2.1% of casks cleared reserve at auction in 2026. Free to use — not a guaranteed price.',
    canonical: `${BASE_URL}/cask-valuation`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'FinancialProduct',
      name: 'Whisky Cask Valuation Tool',
      description: 'Free indicative whisky cask valuation built on auction comparable data.',
      url: `${BASE_URL}/cask-valuation`,
      provider: {
        '@type': 'Organization',
        name: 'The Bottle Keep',
        url: BASE_URL,
      },
    },
  },
  {
    path: 'what-is-lpa',
    title: 'What is LPA? Whisky Cask Measurement Explained | The Bottle Keep',
    description: 'LPA (Litres of Pure Alcohol) is the standard measure used to value and trade whisky casks. Learn how it is calculated, where to find it, and how it affects your cask\'s indicative value.',
    ogDescription: 'LPA = litres × ABV ÷ 100. It is the unit brokers, distilleries and auction houses use to price whisky casks. Find it on your warehouse statement or delivery order.',
    canonical: `${BASE_URL}/what-is-lpa`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'What is LPA? Whisky Cask Measurement Explained',
      description: 'LPA (Litres of Pure Alcohol) is the standard measure used to value and trade whisky casks.',
      url: `${BASE_URL}/what-is-lpa`,
      publisher: {
        '@type': 'Organization',
        name: 'The Bottle Keep',
        url: BASE_URL,
      },
    },
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

  // Replace the generic title and inject the meta block after <head>
  const html = shell
    .replace('<title>The Bottle Keep</title>', metaBlock.trimStart())

  const outDir = join(dist, route.path)
  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, 'index.html'), html, 'utf8')
  console.log(`prerendered /${route.path}`)
}

console.log('prerender complete')
