// Quick test: open one Whiskybase search and dump what we find
// node scripts/wb-test.js
import { chromium } from 'playwright-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { writeFileSync } from 'fs'

chromium.use(StealthPlugin())

const QUERY = 'Ardbeg 10'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
await page.setExtraHTTPHeaders({
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
})

console.log(`Searching Whiskybase for: "${QUERY}"`)
try {
  await page.goto(`https://www.whiskybase.com/search?q=${encodeURIComponent(QUERY)}`, {
    waitUntil: 'networkidle', timeout: 25000,
  })
} catch {
  // fall through
}
await page.waitForTimeout(2000)

const html = await page.content()
writeFileSync('/tmp/wb-test.html', html)
await page.screenshot({ path: '/tmp/wb-test.png', fullPage: true })

// Find all /bottle/ links
const links = await page.evaluate(() =>
  Array.from(document.querySelectorAll('a[href*="/whisky/"]'))
    .map(a => ({ href: a.href, text: a.textContent.trim().slice(0, 80) }))
    .filter((v, i, arr) => arr.findIndex(x => x.href === v.href) === i)
    .slice(0, 15)
)

console.log(`\nBottle links found: ${links.length}`)
links.forEach(l => console.log(` ${l.href}  |  "${l.text}"`))

// Test price fetching on the first result
if (links.length > 0) {
  const testId = links[0].href.match(/\/whisky\/(\d+)/)?.[1]
  console.log(`\nFetching prices for ID ${testId}...`)
  try {
    await page.goto(`https://www.whiskybase.com/whiskies/whisky/${testId}`, {
      waitUntil: 'networkidle', timeout: 25000,
    })
  } catch { /* fall through */ }
  await page.waitForTimeout(2000)

  await page.screenshot({ path: '/tmp/wb-bottle.png', fullPage: false })

  const priceData = await page.evaluate(() => {
    const body = document.body.innerText ?? ''
    const shopMatch = body.match(/Found\s+(\d+)\s+online\s+shop/i)
    const lowestMatch = body.match(/[Ll]owest price[^€\d]*€?\s*([\d,]+\.?\d*)/i)
      ?? body.match(/€\s*([\d,]+\.\d{2})/)
    return {
      shopCount: shopMatch ? parseInt(shopMatch[1]) : null,
      lowestEur: lowestMatch ? parseFloat(lowestMatch[1].replace(',', '')) : null,
      bodySnippet: body.slice(0, 600),
    }
  })

  console.log('Shop count:', priceData.shopCount)
  console.log('Lowest EUR:', priceData.lowestEur)
  console.log('\nPage text snippet:\n', priceData.bodySnippet)
  console.log('\nBottle screenshot → /tmp/wb-bottle.png')
}

await browser.close()
