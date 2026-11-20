// ─── Feature flags ────────────────────────────────────────────────────────────
//
// PAYMENTS_ENABLED
//   false (default) — Stripe checkout and webhook routes return 404.
//   Payment UI is not shown anywhere in the current single-route app.
//
//   To re-enable:
//     1. Set VITE_PAYMENTS_ENABLED=true in Netlify/Vercel env vars (browser bundle).
//     2. Set PAYMENTS_ENABLED=true in Netlify function env vars (serverless).
//     3. Confirm STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY
//        are set in the serverless environment.
//     4. Replace personal bank account and phone number in Stripe dashboard
//        with business details before going live (see CLAUDE.md).

export const PAYMENTS_ENABLED =
  import.meta.env.VITE_PAYMENTS_ENABLED === 'true'
