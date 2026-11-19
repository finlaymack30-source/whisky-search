/**
 * Backfill distillery field for existing DB rows where it is NULL.
 * Uses inferDistillery() from the normaliser — no scraping required.
 *
 * Usage:
 *   SUPABASE_SERVICE_KEY='...' node scripts/backfill-distillery.js
 *   SUPABASE_SERVICE_KEY='...' node scripts/backfill-distillery.js --dry-run
 */

import { inferDistillery } from './lib/normalise.js'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fdeodyuoequwxvbqwivt.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY
if (!SUPABASE_KEY) { console.error('SUPABASE_SERVICE_KEY not set'); process.exit(1) }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const dryRun = process.argv.includes('--dry-run')

async function run() {
  let from = 0
  const pageSize = 1000
  let fixed = 0
  let skipped = 0

  console.log(`Backfilling distillery from titles${dryRun ? ' [dry-run]' : ''}…`)

  while (true) {
    const { data, error } = await supabase
      .from('whiskies')
      .select('id, title, distillery')
      .is('distillery', null)
      .range(from, from + pageSize - 1)

    if (error) { console.error(error.message); process.exit(1) }
    if (!data || data.length === 0) break

    const updates = []
    for (const row of data) {
      const distillery = inferDistillery(row.title ?? '')
      if (distillery) {
        updates.push({ id: row.id, distillery })
      } else {
        skipped++
      }
    }

    if (updates.length > 0 && !dryRun) {
      for (const u of updates) {
        await supabase.from('whiskies').update({ distillery: u.distillery }).eq('id', u.id)
      }
    }

    if (dryRun) {
      for (const u of updates.slice(0, 10)) {
        console.log(`  ${u.id}: "${u.distillery}"`)
      }
    }

    fixed += updates.length
    process.stdout.write(`\r  processed ${from + data.length} rows — ${fixed} fixed, ${skipped} unresolvable`)
    from += pageSize

    if (data.length < pageSize) break
  }

  process.stdout.write('\n')
  console.log(`Done — ${fixed} distilleries filled, ${skipped} titles had no match`)
}

run()
