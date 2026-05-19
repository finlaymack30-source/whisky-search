const Stripe = require('stripe')
const { createClient } = require('@supabase/supabase-js')

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY)

  // Verify webhook signature
  let stripeEvent
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      event.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return { statusCode: 400, body: `Webhook error: ${err.message}` }
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  switch (stripeEvent.type) {
    case 'checkout.session.completed': {
      const cs = stripeEvent.data.object
      if (cs.mode !== 'subscription') break

      const sub = await stripe.subscriptions.retrieve(cs.subscription)
      const paidUntil = new Date(sub.current_period_end * 1000).toISOString()

      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          stripe_customer_id: cs.customer,
          stripe_subscription_id: cs.subscription,
          paid_until: paidUntil,
        })
        .eq('user_id', cs.client_reference_id)

      if (error) console.error('DB update failed (checkout.session.completed):', error)
      break
    }

    case 'invoice.payment_succeeded': {
      const invoice = stripeEvent.data.object
      // Skip the initial payment — already handled by checkout.session.completed
      if (!invoice.subscription || invoice.billing_reason === 'subscription_create') break

      const sub = await stripe.subscriptions.retrieve(invoice.subscription)
      const paidUntil = new Date(sub.current_period_end * 1000).toISOString()

      const { error } = await supabase
        .from('user_subscriptions')
        .update({ paid_until: paidUntil })
        .eq('stripe_subscription_id', invoice.subscription)

      if (error) console.error('DB update failed (invoice.payment_succeeded):', error)
      break
    }

    case 'customer.subscription.deleted': {
      // Subscription cancelled — expire immediately
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ paid_until: new Date().toISOString() })
        .eq('stripe_subscription_id', stripeEvent.data.object.id)

      if (error) console.error('DB update failed (customer.subscription.deleted):', error)
      break
    }

    default:
      break
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) }
}
