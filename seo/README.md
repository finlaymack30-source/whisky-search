# SEO operations runbook

## 1. Verify domain in Search Console

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add property → **Domain** (covers www and apex) → `thebottlekeep.co.uk`
3. Verify via DNS TXT record (the `google-site-verification` meta tag in `index.html`
   is a backup but DNS verification covers all subdomains)
4. If you prefer HTML verification: the meta tag `rhZ817WTdYuHuGMziVS9DBpngxxowtLQnPswstsWY_8`
   is already in `index.html` and will be present in every prerendered page

## 2. Submit the sitemap

1. In Search Console: Sitemaps → Add a new sitemap
2. Enter: `https://www.thebottlekeep.co.uk/sitemap.xml`
3. Submit

The sitemap currently lists two URLs:
- `/cask-valuation` — the valuation tool
- `/what-is-lpa` — the LPA explainer

## 3. Reports to check monthly

| Report | Location | What to look for |
|---|---|---|
| Coverage | Index → Pages | Confirm both URLs are indexed; check for soft-404 or excluded pages |
| Core Web Vitals | Experience → Core Web Vitals | LCP and INP should be green; TBT is the main risk area |
| Search performance | Performance → Search results | Impressions and clicks for the target queries below |
| Manual actions | Security & manual actions | Should always be empty |

## 4. Three queries to track

Set these up in Search Console → Performance → Search results → + New → Query:

1. **`whisky cask valuation`** — the primary commercial query; tracks whether the tool ranks
2. **`what is LPA whisky`** — the upstream informational query; tracks the explainer page
3. **`thebottlekeep.co.uk`** — branded query; confirms the site is indexed and the sitelinks are clean

## 5. GA4 events

The following custom events fire in GA4 (property G-7Y0762LEJV):

| Event | Parameters | When |
|---|---|---|
| `page_view` | `page` | Every route change (via react-ga4 in App.jsx) |
| `cask_valued` | `distillery`, `fill_year`, `cask_type` | On successful form submission |
| `cask_result_viewed` | `tier`, `confidence` | Immediately after result is displayed |

To build a report in GA4: Explore → Blank → add `event_name` as dimension,
`event_count` as metric, then filter by the event names above.

## 6. Notes

- The apex domain (`thebottlekeep.co.uk`) redirects to `www`. Verify that Search
  Console shows `www.thebottlekeep.co.uk` as the canonical property, not the apex.
- The `park-project` branch changes are not merged to main. Merge before expecting
  the live site to reflect any of this work.
- Sitemap `lastmod` dates are static (set to the branch date). Update them manually
  if significant content changes are made.
