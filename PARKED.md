# PARKED — The Bottle Keep

Parked on branch `park-project`, 21 November 2026.

The site is live and functional but not being actively developed.
Do not delete data, tables, domains, or hosting.

**Canonical host:** `https://www.thebottlekeep.co.uk` (www).
Apex (`thebottlekeep.co.uk`) must redirect to www — configure this as a 308 in Vercel
dashboard (see manual chores below). `/` redirects to `/cask-valuation` via a 308 in
`vercel.json`.

**Node version:** Pinned to 22 (`.nvmrc`). Vite 8 requires `^20.19.0 || >=22.12.0`.
Set Vercel → Settings → General → Node.js Version to **22.x** before merging.

---

## What is live

| Thing | State |
|---|---|
| Cask valuation tool | Live and free — no login required |
| Auth / sign-in | Working — Supabase auth |
| Stripe / payments | Disabled — `PAYMENTS_ENABLED` flag is `false` |
| Mailing list sign-ups | Closed — forms replaced with static text |
| Exit-intent overlay | Removed |
| Market report page | Removed (was never published) |
| Distillery index page | Removed (was never published) |

---

## To reactivate payments

1. Set `VITE_PAYMENTS_ENABLED=true` in Vercel environment variables (browser bundle)
2. Set `PAYMENTS_ENABLED=true` in Netlify function environment variables (serverless —
   Stripe webhook and checkout are Netlify functions; Vercel hosts the frontend only)
3. Confirm `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
   and `SUPABASE_SERVICE_ROLE_KEY` are set in Netlify env vars
4. Replace personal bank account and phone number in Stripe with business details
   (see CLAUDE.md checklist)

---

## To reactivate mailing list

1. Restore the email capture form in `src/components/CaskValuator.jsx`
   (the sign-up form was removed in commit `10d0511`)
2. Restore `ExitIntentCapture` in `src/components/Layout.jsx`
   (gutted to `return null` in commit `10d0511`)
3. Apply the RLS policies in `supabase/policies.sql` if not already applied

---

## Credentials

All credentials are gitignored. They live in:

| Credential | Location |
|---|---|
| Supabase service-role key | File at repo root; also in Netlify env vars |
| WA scraper password | File at repo root |
| Stripe keys | Netlify env vars only |

See `scripts/backup.md` for backup and restore procedures.

---

## Data

| Asset | Location |
|---|---|
| Comparables (676 lots) | `src/data/allComparables.js` |
| AYC calibration lots | `data/ayc_lots.csv` |
| Calibration output | `scripts/calibration_output.csv` |
| Model documentation | `docs/model_explained.md` |
| Supabase tables | Cloud — see `scripts/backup.md` to export |

---

## Known issues (from calibration, November 2026)

1. **+29% positive bias on RLA lots** — model overestimates reserve-not-met lots
2. **Copula is decorative** — ρ = 0.291, not 0.72; copula adds ~1.1% to price
3. **12 unsourced constants** — base values, tier scores, cask multipliers
4. **LPA is linear** — no size discount for very large casks
5. **MONTHS_SINCE_PEAK** — now computed dynamically (fixed in this branch)

See `docs/model_explained.md` for full analysis.

---

## Rollback

If a deployment causes problems, use Vercel Instant Rollback in the dashboard
(Deployments → previous deployment → Promote to Production).

To tag the current state before merging so you can roll back via git:

```bash
git tag pre-park
git push origin pre-park
```

---

## Branch

All parking changes are on `park-project`. Not merged to main.

```bash
git push origin park-project
# then open a PR or:
git checkout main && git merge park-project
```

---

## Manual chores after deploy

Do these in the Vercel/third-party dashboards — they cannot be done from the repo.

| Chore | Where | Priority |
|---|---|---|
| Set Vercel Node.js version to **22.x** | Vercel → Settings → General → Node.js Version | **Before merging** |
| Confirm apex `thebottlekeep.co.uk` → `www` redirects as 308 | Vercel → Domains → redirect config | High |
| Apply RLS policies in `supabase/policies.sql` | Supabase dashboard → SQL editor | High |
| Enable 2FA on Vercel, GitHub, Supabase, Stripe, Cloudflare | Each service's security settings | High |
| Add domain property in Google Search Console | search.google.com/search-console | Medium |
| Submit sitemap `https://www.thebottlekeep.co.uk/sitemap.xml` | Search Console → Sitemaps | Medium |
| Confirm domain auto-renew is on | Cloudflare → Domains | Medium |
| Set up uptime monitor | UptimeRobot, BetterUptime, etc. | Medium |
| Three-month check-in: re-run calibration, review GA4 events | — | Deferred |

See `seo/README.md` for the full Search Console setup and query tracking runbook.
