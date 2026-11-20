# Backup runbook

## What needs backing up

| Asset | Current location | In git? |
|---|---|---|
| Comparables data | `src/data/allComparables.js` | Yes |
| AYC calibration data | `data/ayc_lots.csv` | Yes |
| Calibration output | `scripts/calibration_output.csv` | Yes |
| Model docs | `docs/model_explained.md` | Yes |
| Supabase: `mailing_list` table | Supabase cloud | No — export manually |
| Supabase: `user_subscriptions` table | Supabase cloud | No — export manually |
| Supabase: `whiskies` table | Supabase cloud | No — export manually |
| Supabase: `auction_sales` table | Supabase cloud | No — export manually |
| Supabase storage buckets | Supabase cloud | No — export manually |

---

## Export Supabase database (Supabase CLI)

Install the CLI once:
```bash
brew install supabase/tap/supabase
```

Log in:
```bash
supabase login
```

Link to the project (project ref is in the Supabase dashboard URL):
```bash
supabase link --project-ref bxqokujhuofblkrzvlke
```

Export the full schema + data as SQL:
```bash
supabase db dump --data-only -f backup/supabase_data_$(date +%Y%m%d).sql
supabase db dump -f backup/supabase_schema_$(date +%Y%m%d).sql
```

Or export individual tables as CSV via the Supabase dashboard:
  Table Editor → select table → Download CSV

---

## Export Supabase storage buckets

Via Supabase CLI (requires `supabase storage` commands, available from CLI v1.100+):
```bash
supabase storage cp -r ss:///  backup/storage/
```

Or via the dashboard: Storage → select bucket → download files manually.

---

## Export mailing list (quick)

```bash
# Requires SUPABASE_SERVICE_ROLE_KEY in environment
node -e "
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const { data } = await sb.from('mailing_list').select('email, created_at')
console.log(JSON.stringify(data, null, 2))
" > backup/mailing_list_$(date +%Y%m%d).json
```

---

## Tagging a restore point

```bash
git tag pre-park        # mark before parking
git tag backup-YYYYMMDD # periodic snapshots
```

Tags are local until explicitly pushed:
```bash
git push origin pre-park
```

---

## Notes

- The Supabase project ref (`bxqokujhuofblkrzvlke`) is public (embedded in the anon key).
  The service-role key is **not** in git — it lives in a file at the repo root
  (`SUPABASE_SERVICE_KEY=...`) which is gitignored. Keep a copy in a password manager.
- Netlify environment variables (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
  SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are set in the
  Netlify dashboard. Export them from Site Settings → Environment Variables before
  decommissioning.
