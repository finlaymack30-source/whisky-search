/**
 * Shared Supabase helpers for the whisky data pipeline.
 *
 * The supabase client is created once from env vars. All exported functions
 * throw on unexpected DB errors so callers receive unambiguous failures.
 *
 * Required env vars:
 *   SUPABASE_URL          — project URL (falls back to the hardcoded default)
 *   SUPABASE_SERVICE_KEY  — service-role key (required)
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? 'https://bxqokujhuofblkrzvlke.supabase.co'

const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
if (!SUPABASE_SERVICE_KEY) {
  console.error('[db] SUPABASE_SERVICE_KEY is not set — DB operations will fail.')
}

/** @type {import('@supabase/supabase-js').SupabaseClient} */
export const supabase = SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null

function requireSupabase() {
  if (!supabase) {
    throw new Error('[db] SUPABASE_SERVICE_KEY is not set (supabase client unavailable)')
  }
  return supabase
}

// ── Lookup helpers ────────────────────────────────────────────────────────────

/**
 * Find an existing whisky row by its TWE product URL.
 * Returns the full row object, or null if not found.
 *
 * @param {string} twe_url
 * @returns {Promise<Record<string,unknown>|null>}
 */
export async function findByTweUrl(twe_url) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('whiskies')
    .select('*')
    .eq('twe_url', twe_url)
    .maybeSingle()

  if (error) throw new Error(`[db.findByTweUrl] ${error.message} (url=${twe_url})`)
  return data ?? null
}

/**
 * Find an existing whisky row by its bottle fingerprint.
 * Returns the full row object, or null if not found.
 *
 * @param {string} bottle_fingerprint
 * @returns {Promise<Record<string,unknown>|null>}
 */
export async function findByBottleFingerprint(bottle_fingerprint) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('whiskies')
    .select('*')
    .eq('bottle_fingerprint', bottle_fingerprint)
    .maybeSingle()

  if (error) {
    throw new Error(
      `[db.findByBottleFingerprint] ${error.message} (fingerprint=${bottle_fingerprint})`
    )
  }
  return data ?? null
}

// ── Upsert ────────────────────────────────────────────────────────────────────

/**
 * Insert or update a whisky record identified by its twe_url.
 * Uses a SELECT-then-INSERT/UPDATE strategy because there is no unique DB
 * constraint on twe_url; this avoids duplicate rows while remaining safe for
 * concurrent single-process use.
 *
 * @param {Record<string,unknown>} record  — normalised whisky fields
 * @param {{ dryRun?: boolean }} [opts]
 * @returns {Promise<{ action: 'insert'|'update', id: number }>}
 */
export async function upsertBottle(record, { dryRun = false } = {}) {
  if (dryRun) {
    console.log('[dry-run] would upsert:', JSON.stringify(record, null, 2))
    return { action: 'insert', id: -1 }
  }

  const existing = record.twe_url ? await findByTweUrl(record.twe_url) : null

  if (existing) {
  const client = requireSupabase()
  const { data, error } = await client
      .from('whiskies')
      .update(record)
      .eq('id', existing.id)
      .select('id')
      .single()

    if (error) throw new Error(`[db.upsertBottle] update failed — ${error.message} (id=${existing.id})`)
    return { action: 'update', id: data.id }
  }

  const client = requireSupabase()
  const { data, error } = await client
    .from('whiskies')
    .insert(record)
    .select('id')
    .single()

  if (error) throw new Error(`[db.upsertBottle] insert failed — ${error.message} (title=${record.title})`)
  return { action: 'insert', id: data.id }
}

/**
 * Insert or update a whisky record identified by bottle_fingerprint.
 * Requires a UNIQUE constraint on whiskies.bottle_fingerprint.
 *
 * @param {Record<string,unknown>} record
 * @param {{ dryRun?: boolean }} [opts]
 * @returns {Promise<{ action: 'insert'|'update', id: number }>}
 */
export async function upsertBottleByFingerprint(record, { dryRun = false } = {}) {
  if (dryRun) {
    console.log('[dry-run] would upsert by fingerprint:', JSON.stringify(record, null, 2))
    return { action: 'insert', id: -1 }
  }

  const fp = record.bottle_fingerprint
  if (!fp) throw new Error('[db.upsertBottleByFingerprint] record missing bottle_fingerprint')

  const client = requireSupabase()
  const { data, error } = await client
    .from('whiskies')
    .upsert(record, { onConflict: 'bottle_fingerprint' })
    .select('id')
    .single()

  if (error) {
    throw new Error(
      `[db.upsertBottleByFingerprint] upsert failed — ${error.message} (fingerprint=${fp})`
    )
  }

  return { action: 'update', id: data.id }
}

// ── Batch upsert ──────────────────────────────────────────────────────────────

/**
 * Batch insert-or-update whisky records in a single DB round trip.
 * Records with a twe_url use Postgres ON CONFLICT — requires a UNIQUE
 * constraint on whiskies.twe_url (see SQL migration comment in twe-catalog.js).
 * Records without twe_url fall back to individual single-record upserts.
 *
 * @param {Record<string,unknown>[]} records
 * @param {{ dryRun?: boolean }} [opts]
 * @returns {Promise<number[]>}  ids of upserted rows
 */
export async function upsertBottles(records, { dryRun = false } = {}) {
  if (!records.length) return []
  if (dryRun) {
    console.log(`[dry-run] would batch-upsert ${records.length} records`)
    return records.map(() => -1)
  }

  const withUrl    = records.filter(r => r.twe_url)
  const withoutUrl = records.filter(r => !r.twe_url)
  const ids = []

  if (withUrl.length) {
    const client = requireSupabase()
    const { data, error } = await client
      .from('whiskies')
      .upsert(withUrl, { onConflict: 'twe_url' })
      .select('id')
    if (error) throw new Error(`[db.upsertBottles] ${error.message}`)
    ids.push(...(data ?? []).map(r => r.id))
  }

  for (const record of withoutUrl) {
    const { id } = await upsertBottle(record)
    ids.push(id)
  }

  return ids
}

// ── Auction sales ─────────────────────────────────────────────────────────────

/**
 * Insert or update an auction sale row identified by (source, lot_url).
 * Requires a UNIQUE constraint on auction_sales(source, lot_url).
 *
 * @param {Record<string,unknown>} record
 * @param {{ dryRun?: boolean }} [opts]
 * @returns {Promise<number>} id of upserted row
 */
export async function upsertAuctionSale(record, { dryRun = false } = {}) {
  if (dryRun) {
    console.log('[dry-run] would upsert auction sale:', JSON.stringify(record, null, 2))
    return -1
  }

  const client = requireSupabase()
  const { data, error } = await client
    .from('auction_sales')
    .upsert(record, { onConflict: 'source,lot_url' })
    .select('id')
    .single()

  if (error) {
    throw new Error(
      `[db.upsertAuctionSale] upsert failed — ${error.message} (source=${record.source}, lot_url=${record.lot_url})`
    )
  }

  return data.id
}

// ── Price history ─────────────────────────────────────────────────────────────

/**
 * Record a price observation in the price_history table.
 * Called after every successful price fetch so trend analysis has data.
 *
 * @param {number} whiskyId
 * @param {number} priceGbp
 * @param {string} [source='twe']
 * @returns {Promise<void>}
 */
export async function recordPriceHistory(whiskyId, priceGbp, source = 'twe', { previousPrice = null } = {}) {
  if (previousPrice !== null && Math.abs(priceGbp - previousPrice) < 0.01) return

  const client = requireSupabase()
  const { error } = await client.from('price_history').insert({
    whisky_id: whiskyId,
    price_gbp: priceGbp,
    source,
    recorded_at: new Date().toISOString(),
  })

  if (error) {
    throw new Error(
      `[db.recordPriceHistory] failed — ${error.message} (whisky_id=${whiskyId})`
    )
  }
}

/**
 * Compare the two most recent price_history entries for a bottle and write
 * the trend ('up' | 'down' | 'stable') back to whiskies.price_trend.
 * The ±£0.50 threshold prevents noise from rounding triggering spurious trends.
 * Returns the trend string, or null when fewer than 2 data points exist.
 *
 * @param {number} whiskyId
 * @returns {Promise<'up'|'down'|'stable'|null>}
 */
export async function computeAndSaveTrend(whiskyId) {
  const THRESHOLD = 0.5

  const client = requireSupabase()
  const { data, error } = await client
    .from('price_history')
    .select('price_gbp, recorded_at')
    .eq('whisky_id', whiskyId)
    .order('recorded_at', { ascending: false })
    .limit(2)

  if (error) throw new Error(`[db.computeAndSaveTrend] query failed — ${error.message}`)
  if (!data || data.length < 2) return null

  const [latest, previous] = data
  const diff = Number(latest.price_gbp) - Number(previous.price_gbp)

  let trend
  if (diff > THRESHOLD) trend = 'up'
  else if (diff < -THRESHOLD) trend = 'down'
  else trend = 'stable'

  const { error: updateError } = await client
    .from('whiskies')
    .update({ price_trend: trend })
    .eq('id', whiskyId)

  if (updateError) {
    throw new Error(
      `[db.computeAndSaveTrend] update failed — ${updateError.message} (id=${whiskyId})`
    )
  }

  return trend
}

// ── Stale-price query ─────────────────────────────────────────────────────────

/**
 * Return whisky rows that need a price refresh.
 * Ordered so that the stalest (or never-fetched) records come first.
 *
 * @param {{ staleDays?: number, id?: number|null }} [opts]
 * @returns {Promise<Record<string,unknown>[]>}
 */
export async function getBottlesForPriceSync({ staleDays = 7, id = null } = {}) {
  const client = requireSupabase()
  let query = client
    .from('whiskies')
    .select('id, title, twe_url, price_gbp, price_updated_at')
    .not('twe_url', 'is', null)
    .order('price_updated_at', { ascending: true, nullsFirst: true })

  if (id !== null) {
    query = query.eq('id', id)
  } else {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - staleDays)
    // Include rows where price_updated_at is null OR older than the cutoff
    query = query.or(
      `price_updated_at.is.null,price_updated_at.lt.${cutoff.toISOString()}`
    )
  }

  const { data, error } = await query

  if (error) throw new Error(`[db.getBottlesForPriceSync] query failed — ${error.message}`)
  return data ?? []
}
