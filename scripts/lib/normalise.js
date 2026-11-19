/**
 * Data normalisation for whisky records.
 *
 * All functions are pure and have no external dependencies.
 * They are designed to be defensive — unexpected input returns a sensible
 * default rather than throwing.
 */

// ── Distillery → Region map ───────────────────────────────────────────────────

/**
 * Maps well-known distillery names (lowercase) to their canonical region.
 * Used by inferRegion when explicit region data is absent.
 *
 * @type {Record<string, string>}
 */
export const DISTILLERY_REGION = {
  // Islay
  ardbeg: 'Islay',
  bowmore: 'Islay',
  bruichladdich: 'Islay',
  bunnahabhain: 'Islay',
  caol_ila: 'Islay',
  'caol ila': 'Islay',
  kilchoman: 'Islay',
  lagavulin: 'Islay',
  laphroaig: 'Islay',
  ardnahoe: 'Islay',
  port_charlotte: 'Islay',
  'port charlotte': 'Islay',
  portintruan: 'Islay',

  // Speyside
  aberlour: 'Speyside',
  balvenie: 'Speyside',
  cragganmore: 'Speyside',
  dalwhinnie: 'Speyside',
  glenfarclas: 'Speyside',
  glenfiddich: 'Speyside',
  glenlivet: 'Speyside',
  'the glenlivet': 'Speyside',
  glenrothes: 'Speyside',
  'the glenrothes': 'Speyside',
  macallan: 'Speyside',
  'the macallan': 'Speyside',
  mortlach: 'Speyside',
  strathisla: 'Speyside',
  craigellachie: 'Speyside',
  benriach: 'Speyside',
  'glen grant': 'Speyside',
  speyside: 'Speyside',

  // Highland
  dalmore: 'Highland',
  'the dalmore': 'Highland',
  edradour: 'Highland',
  glenmorangie: 'Highland',
  highland_park: 'Highland',
  'highland park': 'Highland',
  oban: 'Highland',
  tomatin: 'Highland',
  blair_athol: 'Highland',
  'blair athol': 'Highland',
  balblair: 'Highland',
  clynelish: 'Highland',
  glendronach: 'Highland',
  'the glendronach': 'Highland',
  glengoyne: 'Highland',
  aberfeldy: 'Highland',
  royal_lochnagar: 'Highland',
  'royal lochnagar': 'Highland',

  // Lowland
  auchentoshan: 'Lowland',
  bladnoch: 'Lowland',
  glenkinchie: 'Lowland',
  ailsa_bay: 'Lowland',
  'ailsa bay': 'Lowland',
  rosebank: 'Lowland',
  littlemill: 'Lowland',

  // Campbeltown
  glen_scotia: 'Campbeltown',
  'glen scotia': 'Campbeltown',
  glengyle: 'Campbeltown',
  springbank: 'Campbeltown',
  longrow: 'Campbeltown',
  hazelburn: 'Campbeltown',

  // Islands
  arran: 'Islands',
  'isle of arran': 'Islands',
  jura: 'Islands',
  'isle of jura': 'Islands',
  talisker: 'Islands',
  tobermory: 'Islands',
  ledaig: 'Islands',
  scapa: 'Islands',
  torabhaig: 'Islands',
  raasay: 'Islands',

  // Irish
  bushmills: 'Irish',
  'old bushmills': 'Irish',
  midleton: 'Irish',
  redbreast: 'Irish',
  jameson: 'Irish',
  kilbeggan: 'Irish',
  teeling: 'Irish',
  tullamore: 'Irish',
  'tullamore dew': 'Irish',
  powers: 'Irish',
  tyrconnell: 'Irish',
  greenspot: 'Irish',
  'green spot': 'Irish',
  dingle: 'Irish',
  waterford: 'Irish',

  // Japanese
  hakushu: 'Japanese',
  hibiki: 'Japanese',
  nikka: 'Japanese',
  suntory: 'Japanese',
  yamazaki: 'Japanese',
  yoichi: 'Japanese',
  miyagikyo: 'Japanese',
  chichibu: 'Japanese',
  fuji: 'Japanese',
  mars: 'Japanese',
  'mars shinshu': 'Japanese',
  akashi: 'Japanese',

  // American
  buffalo_trace: 'American',
  'buffalo trace': 'American',
  makers_mark: 'American',
  "maker's mark": 'American',
  jim_beam: 'American',
  'jim beam': 'American',
  wild_turkey: 'American',
  'wild turkey': 'American',
  jack_daniels: 'American',
  "jack daniel's": 'American',
  woodford_reserve: 'American',
  'woodford reserve': 'American',
  four_roses: 'American',
  'four roses': 'American',
  heaven_hill: 'American',
  'heaven hill': 'American',
  knob_creek: 'American',
  'knob creek': 'American',

  // Taiwan
  kavalan: 'Taiwan',
  omar: 'Taiwan',

  // Swedish
  mackmyra: 'Swedish',
  spirit_of_hven: 'Swedish',
  'spirit of hven': 'Swedish',
  high_coast: 'Swedish',
  'high coast': 'Swedish',

  // Welsh
  penderyn: 'Welsh',

  // Australian
  sullivans_cove: 'Australian',
  "sullivans cove": 'Australian',
  "sullivan's cove": 'Australian',
  starward: 'Australian',
  lark: 'Australian',

  // Indian
  amrut: 'Indian',
  paul_john: 'Indian',
  'paul john': 'Indian',
  rampur: 'Indian',
}

// ── Distillery inference ──────────────────────────────────────────────────────

/**
 * Best-effort distillery extraction from a bottle title.
 * Two-pass: known DISTILLERY_REGION keys first, then text-before-age pattern.
 *
 * @param {string} title
 * @returns {string|null}
 */
export function inferDistillery(title = '') {
  if (!title) return null
  const lower = title.toLowerCase()

  // Pass 1: match against known distilleries (longest match wins)
  let best = null
  let bestLen = 0
  for (const key of Object.keys(DISTILLERY_REGION)) {
    if (lower.includes(key) && key.length > bestLen) {
      best = key
      bestLen = key.length
    }
  }
  if (best) {
    return best.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }

  // Pass 2: extract the word(s) before the first age/year mention
  const beforeAge = title.match(/^(.+?)\s+\d{1,2}\s*[-\s]?(?:year|yr|yo)\b/i)
  if (beforeAge) return beforeAge[1].trim()

  return null
}

// ── Region alias normalisation ────────────────────────────────────────────────

/**
 * Maps raw / messy region strings (lowercase) to their canonical form.
 * Entries should cover all common variations seen in scraped data.
 *
 * @type {Record<string, string>}
 */
export const REGION_ALIASES = {
  // Highland
  highland: 'Highland',
  highlands: 'Highland',
  'the highlands': 'Highland',
  'highland region': 'Highland',
  'scottish highlands': 'Highland',

  // Speyside
  speyside: 'Speyside',
  'the speyside': 'Speyside',
  'speyside region': 'Speyside',

  // Islay
  islay: 'Islay',
  'isle of islay': 'Islay',

  // Lowland
  lowland: 'Lowland',
  lowlands: 'Lowland',
  'the lowlands': 'Lowland',
  'lowland region': 'Lowland',

  // Campbeltown
  campbeltown: 'Campbeltown',
  'campbeltown region': 'Campbeltown',

  // Islands
  islands: 'Islands',
  island: 'Islands',
  'scottish islands': 'Islands',
  'island region': 'Islands',

  // Irish
  ireland: 'Irish',
  irish: 'Irish',
  'northern ireland': 'Irish',
  'republic of ireland': 'Irish',

  // Japanese
  japan: 'Japanese',
  japanese: 'Japanese',

  // American
  american: 'American',
  usa: 'American',
  kentucky: 'American',
  tennessee: 'American',
  bourbon: 'American',
  'american whiskey': 'American',

  // Taiwan
  taiwan: 'Taiwan',
  taiwanese: 'Taiwan',

  // Swedish
  sweden: 'Swedish',
  swedish: 'Swedish',
  scandinavia: 'Swedish',

  // Welsh
  wales: 'Welsh',
  welsh: 'Welsh',

  // Australian
  australia: 'Australian',
  australian: 'Australian',

  // Indian
  india: 'Indian',
  indian: 'Indian',

  // Canadian
  canada: 'Canadian',
  canadian: 'Canadian',

  // World / Other
  world: 'World',
  'world whisky': 'World',
  'rest of world': 'World',
}

// ── Type normalisation ────────────────────────────────────────────────────────

const TYPE_PATTERNS = [
  [/single\s+malt/i, 'Single Malt'],
  [/blended?\s+malt/i, 'Blended Malt'],
  // "blend" must come after "blended malt" so the malt variant wins
  [/blended?\s+scotch/i, 'Blend'],
  [/\bblend\b/i, 'Blend'],
  [/single\s+grain/i, 'Single Grain'],
  [/\bbourbon\b/i, 'Bourbon'],
  [/\brye\b/i, 'Rye'],
  [/\birish\b/i, 'Irish'],
  [/\bjapanese\b/i, 'Japanese'],
  [/\bcanadian\b/i, 'Canadian'],
]

/**
 * Derive a canonical whisky type from a raw type string and an optional
 * category hint (e.g. the scraper category slug).
 * Returns one of: Single Malt, Blended Malt, Blend, Single Grain, Bourbon,
 * Rye, Irish, Japanese, Canadian, World.
 *
 * @param {string} [raw='']
 * @param {string} [categoryHint='']
 * @returns {string}
 */
export function normaliseType(raw = '', categoryHint = '') {
  // Replace hyphens with spaces so slug-style hints like "single-malt-scotch-whisky" match
  const combined = `${raw} ${categoryHint}`.replace(/-/g, ' ').trim()
  for (const [pattern, canonical] of TYPE_PATTERNS) {
    if (pattern.test(combined)) return canonical
  }
  return 'World'
}

// ── Region inference ──────────────────────────────────────────────────────────

/**
 * Best-effort region inference from available metadata.
 * Precedence: known distillery lookup → REGION_ALIASES on combined text.
 *
 * @param {string} [title='']
 * @param {string} [distillery='']
 * @param {string} [categoryType='']
 * @returns {string|null}
 */
export function inferRegion(title = '', distillery = '', categoryType = '') {
  // 1. Direct distillery lookup
  const distLower = distillery.toLowerCase().trim()
  if (distLower && DISTILLERY_REGION[distLower]) {
    return DISTILLERY_REGION[distLower]
  }

  // 2. Partial match — find any distillery key inside the title/distillery
  const combined = `${distillery} ${title}`.toLowerCase()
  for (const [key, region] of Object.entries(DISTILLERY_REGION)) {
    if (combined.includes(key)) return region
  }

  // 3. Region alias on categoryType only — applying aliases to the title
  //    causes false positives (e.g. "Bourbon Cask" → "American" for Scotch)
  const categoryLower = categoryType.toLowerCase()
  if (categoryLower) {
    for (const [alias, canonical] of Object.entries(REGION_ALIASES)) {
      if (categoryLower.includes(alias)) return canonical
    }
  }

  return null
}

/**
 * Normalise a raw region string to its canonical form.
 * Returns the original (trimmed) value if no alias matches.
 *
 * @param {string} raw
 * @returns {string}
 */
export function normaliseRegion(raw) {
  if (!raw) return raw
  const lower = raw.toLowerCase().trim()
  return REGION_ALIASES[lower] ?? raw.trim()
}

// ── Attribute extraction ──────────────────────────────────────────────────────

/**
 * Extract an integer age from a text string.
 * Handles formats: "12 Year Old", "12yo", "12 Yr", "12-year-old", "Aged 12 Years".
 * Returns null when no age is found or the number is outside [1, 99].
 *
 * @param {string} text
 * @returns {number|null}
 */
export function extractAge(text) {
  if (!text) return null
  const patterns = [
    /aged?\s+(\d{1,2})\s+years?/i,
    /(\d{1,2})\s*-?\s*years?\s*old/i,
    /(\d{1,2})\s*-?\s*yr/i,
    /(\d{1,2})\s*yo\b/i,
    // plain number followed by "year" or "ans" (French labels)
    /\b(\d{1,2})\s+ans\b/i,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const age = parseInt(match[1], 10)
      if (age >= 1 && age <= 99) return age
    }
  }
  return null
}

/**
 * Extract an ABV percentage from a text string.
 * Handles formats: "46.0% ABV", "43% vol", "cask strength 57.3%".
 * Returns null when no valid ABV is found (valid range: 20–90%).
 *
 * @param {string} text
 * @returns {number|null}
 */
export function extractAbv(text) {
  if (!text) return null
  const patterns = [
    /(\d{2,3}(?:\.\d{1,2})?)\s*%\s*(?:abv|vol|alc)/i,
    /(?:abv|vol|alc)[:\s]*(\d{2,3}(?:\.\d{1,2})?)\s*%/i,
    // bare percentage when ABV-like context is present
    /\b(\d{2,3}(?:\.\d{1,2})?)\s*%/,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const abv = parseFloat(match[1])
      if (abv >= 20 && abv <= 90) return abv
    }
  }
  return null
}

/**
 * Extract bottle size in ml from text (title/specs).
 * Handles: "70cl", "700ml", "0.7L", "1 litre".
 *
 * @param {string} text
 * @returns {number|null}
 */
export function extractSizeMl(text) {
  if (!text) return null
  const t = String(text)

  // 70cl / 75cl etc.
  const cl = t.match(/\b(\d{1,3}(?:\.\d+)?)\s*cl\b/i)
  if (cl) {
    const ml = Math.round(parseFloat(cl[1]) * 10)
    return ml > 0 ? ml : null
  }

  // 700ml
  const ml = t.match(/\b(\d{2,4})\s*ml\b/i)
  if (ml) {
    const n = parseInt(ml[1], 10)
    return n > 0 ? n : null
  }

  // 0.7L / 1L / 1 litre
  const litres = t.match(/\b(\d(?:\.\d+)?)\s*(?:l|litre|liter)\b/i)
  if (litres) {
    const n = Math.round(parseFloat(litres[1]) * 1000)
    return n > 0 ? n : null
  }

  return null
}

/**
 * Attempt to separate cask "type" (base) from "finish" (wine/beer/etc.).
 * Returns { cask_type, cask_finish } (either may be null).
 *
 * @param {string} text
 */
export function parseCaskMaturation(text) {
  if (!text) return { cask_type: null, cask_finish: null }
  const t = String(text).replace(/\s+/g, ' ').trim()
  const lower = t.toLowerCase()

  // Common finish phrasing: "Finished in X casks", "X Cask Finish"
  const finishMatch =
    t.match(/finished in\s+(.+?)\s+casks?/i) ??
    t.match(/(.+?)\s+cask\s+finish\b/i) ??
    t.match(/\bfinish(?:ed)?\b[:\s-]*(.+)$/i)

  // If it looks like a wine/beer/grape finish, treat as finish
  if (finishMatch) {
    const finish = (finishMatch[1] ?? '').trim()
    if (finish) return { cask_type: t, cask_finish: finish }
  }

  // Heuristic: "Sauvignon Cask" / "Sauternes Cask" → finish-like token
  const wineLike = /(sauvignon|sauternes|sherry|oloroso|px|port|madeira|marsala|rum|bourbon|virgin oak|wine|beer|brandy|cognac)/i
  if (wineLike.test(lower) && /\bcask\b/i.test(t)) {
    return { cask_type: t, cask_finish: t }
  }

  return { cask_type: t, cask_finish: null }
}

// ── Title cleaning ────────────────────────────────────────────────────────────

const TRAILING_TYPE_PHRASES = [
  'single malt scotch whisky',
  'blended scotch whisky',
  'blended malt scotch whisky',
  'single grain scotch whisky',
  'scotch whisky',
  'irish whiskey',
  'japanese whisky',
  'american whiskey',
  'bourbon whiskey',
  'rye whiskey',
  'canadian whisky',
  'world whisky',
  'single malt whisky',
  'blended whisky',
]

/**
 * Clean a raw product title: trim, collapse whitespace, and remove trailing
 * generic type descriptors that add no searchable information.
 *
 * @param {string} title
 * @returns {string}
 */
export function cleanTitle(title) {
  if (!title) return ''
  let t = title.replace(/\s+/g, ' ').trim()
  const lower = t.toLowerCase()
  for (const phrase of TRAILING_TYPE_PHRASES) {
    if (lower.endsWith(phrase)) {
      t = t.slice(0, t.length - phrase.length).replace(/[\s\-–—|,]+$/, '').trim()
      break
    }
  }
  return t
}

// ── Master normaliser ─────────────────────────────────────────────────────────

/**
 * Apply all normalisers to a raw scraped record and return a clean object
 * ready for database insertion.
 * Fields not present in `raw` are omitted from the result rather than set to null,
 * so partial records can be safely merged with existing DB rows.
 *
 * @param {Record<string,unknown>} raw
 * @returns {Record<string,unknown>}
 */
export function normaliseBottle(raw) {
  const record = {}

  if (raw.title !== undefined) record.title = cleanTitle(String(raw.title ?? ''))
  if (raw.distillery !== undefined) {
    const scraped = (raw.distillery ?? '').toString().trim()
    // If scraped value isn't a known distillery, it's likely a collection/series name — override with title inference
    const isKnown = scraped && DISTILLERY_REGION[scraped.toLowerCase()]
    record.distillery = (isKnown ? scraped : null) || inferDistillery(String(raw.title ?? ''))
  } else if (raw.title) {
    const fromTitle = inferDistillery(String(raw.title))
    if (fromTitle) record.distillery = fromTitle
  }
  if (raw.image_url !== undefined) record.image_url = raw.image_url ?? null
  if (raw.twe_url !== undefined) record.twe_url = raw.twe_url ?? null
  if (raw.buy_url !== undefined) record.buy_url = raw.buy_url ?? null
  if (raw.price_updated_at !== undefined) record.price_updated_at = raw.price_updated_at ?? null
  if (raw.price_shop_count !== undefined) record.price_shop_count = raw.price_shop_count ?? null

  // Type
  if (raw.type !== undefined || raw.categoryHint !== undefined) {
    record.type = normaliseType(
      raw.type != null ? String(raw.type) : '',
      raw.categoryHint != null ? String(raw.categoryHint) : ''
    )
  }

  // Age — accept pre-parsed integer or extract from title/age text
  if (raw.age !== undefined) {
    const parsed = typeof raw.age === 'number' ? raw.age : extractAge(String(raw.age ?? ''))
    record.age = parsed
  } else if (raw.title) {
    const fromTitle = extractAge(String(raw.title))
    if (fromTitle) record.age = fromTitle
  }

  // ABV
  if (raw.abv !== undefined) {
    const parsed = typeof raw.abv === 'number' ? raw.abv : extractAbv(String(raw.abv ?? ''))
    record.abv = parsed
  }

  // Price
  if (raw.price_gbp !== undefined) {
    const p = parseFloat(raw.price_gbp)
    record.price_gbp = isNaN(p) ? null : p
  }

  // Cask type
  if (raw.cask_type !== undefined) {
    const parsed = raw.cask_type ? parseCaskMaturation(String(raw.cask_type)) : { cask_type: null, cask_finish: null }
    record.cask_type = parsed.cask_type
    if (raw.cask_finish !== undefined) {
      record.cask_finish = raw.cask_finish ? String(raw.cask_finish).trim() : null
    } else if (parsed.cask_finish) {
      record.cask_finish = parsed.cask_finish
    }
  }

  // Tasting notes
  if (raw.tasting_note !== undefined) {
    record.tasting_note = raw.tasting_note ? String(raw.tasting_note).trim() : null
  }

  // Region — prefer explicit raw.region, then infer
  const rawRegion = raw.region != null ? String(raw.region) : ''
  if (rawRegion) {
    record.region = normaliseRegion(rawRegion)
  } else {
    const inferred = inferRegion(
      raw.title != null ? String(raw.title) : '',
      raw.distillery != null ? String(raw.distillery) : '',
      raw.type != null ? String(raw.type) : (raw.categoryHint != null ? String(raw.categoryHint) : '')
    )
    if (inferred) record.region = inferred
  }

  return record
}

// ── Canonical identity / fingerprint ──────────────────────────────────────────

function _normKey(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Compute a stable bottle fingerprint for cross-lot dedupe.
 * Returns a SHA-256 hex string.
 *
 * @param {Record<string,unknown>} record  Normalised (or near-normalised) record
 * @returns {Promise<string>}
 */
export async function computeBottleFingerprint(record) {
  const { createHash } = await import('node:crypto')

  const title = record.canonical_name ?? record.title ?? ''
  const distillery = record.distillery ?? ''
  const age = record.age ?? record.stated_age_text ?? ''
  const abv = record.abv != null ? Number(record.abv).toFixed(1) : ''

  const sizeMl =
    record.size_ml != null ? String(record.size_ml) : (extractSizeMl(String(record.title ?? ''))?.toString() ?? '')

  const cask = record.cask_finish ?? record.cask_type ?? ''
  const series = record.series ?? record.release ?? ''

  const parts = [
    _normKey(distillery),
    _normKey(title),
    _normKey(age),
    _normKey(abv),
    _normKey(sizeMl),
    _normKey(cask),
    _normKey(series),
  ]

  return createHash('sha256').update(parts.join('|')).digest('hex')
}
