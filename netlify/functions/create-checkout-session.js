const Stripe = require('stripe')
const { createClient } = require('@supabase/supabase-js')

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  const token = (event.headers['authorization'] || '').replace('Bearer ', '')
  if (!token) {
    return { statusCode: 401, body: JSON.stringify({ error: 'No token' }) }
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bxqokujhuofblkrzvlke.supabase.co'

  // Verify the user's JWT using the service role client
  const supabase = createClient(
    SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY)

  // Derive the origin for redirect URLs — works locally and in production
  const origin =
    event.headers['origin'] ||
    (event.headers['referer'] || '').replace(/\/$/, '').split('/').slice(0, 3).join('/') ||
    'https://www.thebottlekeep.co.uk'

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{
      price_data: {
        currency: 'gbp',
        product_data: {
          name: 'The Bottle Keep — Full Access',
          description: 'Unlimited whisky cask valuations, comparable sales data, and market intelligence.',
        },
        unit_amount: 4900, // £49.00 in pence
        recurring: { interval: 'month' },
      },
      quantity: 1,
    }],
    customer_email: user.email,
    client_reference_id: user.id,
    success_url: `${origin}/cask-valuation?checkout=success`,
    cancel_url: `${origin}/cask-valuation`,
  })

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: session.url }),
  }
}
