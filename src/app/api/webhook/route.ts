import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

function toIsoDate(unixSeconds?: number | null) {
  if (!unixSeconds) return new Date().toISOString()
  return new Date(unixSeconds * 1000).toISOString()
}

function getCurrentPeriodEnd(subscription: Stripe.Subscription) {
  const raw = subscription as unknown as { current_period_end?: number }
  return raw.current_period_end ?? null
}

async function upsertSubscriptionFromCheckout(session: Stripe.Checkout.Session) {
  const stripe = getStripe()
  const supabaseAdmin = getSupabaseAdmin() as any
  const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null
  const customerId = typeof session.customer === 'string' ? session.customer : null

  if (!subscriptionId || !customerId) {
    throw new Error('Missing subscription/customer id in checkout session')
  }

  const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId)
  const subscription = subscriptionResponse as Stripe.Subscription

  const metadata = {
    ...subscription.metadata,
    ...session.metadata,
  }

  const userId = metadata.user_id
  const planType = metadata.plan_type
  const charityId = metadata.charity_id
  const contributionPercentage = Number(metadata.contribution_percentage)

  if (!userId || !planType || !charityId || !Number.isFinite(contributionPercentage)) {
    throw new Error('Missing required metadata to sync subscription')
  }

  if (contributionPercentage < 10) {
    throw new Error('Invalid contribution_percentage metadata')
  }

  const payload = {
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    plan_type: planType,
    status: subscription.status,
    charity_id: charityId,
    contribution_percentage: contributionPercentage,
    current_period_end: toIsoDate(getCurrentPeriodEnd(subscription)),
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('subscriptions')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle()

  if (existingError) {
    throw existingError
  }

  const existingId = (existing as { id?: string } | null)?.id

  if (existingId) {
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update(payload)
      .eq('id', existingId)

    if (updateError) throw updateError
    return
  }

  const { error: insertError } = await supabaseAdmin.from('subscriptions').insert(payload)
  if (insertError) throw insertError
}

async function syncSubscriptionUpdate(subscription: Stripe.Subscription) {
  const supabaseAdmin = getSupabaseAdmin() as any
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      status: subscription.status,
      current_period_end: toIsoDate(getCurrentPeriodEnd(subscription)),
      stripe_customer_id:
        typeof subscription.customer === 'string' ? subscription.customer : null,
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) throw error
}

async function syncSubscriptionDeleted(subscription: Stripe.Subscription) {
  const supabaseAdmin = getSupabaseAdmin() as any
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'canceled',
      current_period_end: toIsoDate(getCurrentPeriodEnd(subscription)),
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) throw error
}

export async function POST(req: Request) {
  const stripe = getStripe()
  const signature = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Missing webhook signature/secret' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    const body = await req.text()
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid webhook signature'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await upsertSubscriptionFromCheckout(session)
        break
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await syncSubscriptionUpdate(subscription)
        break
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await syncSubscriptionDeleted(subscription)
        break
      }
      default:
        break
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook processing failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
