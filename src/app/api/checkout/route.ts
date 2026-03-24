import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createClient } from '@/utils/supabase/server'

type CheckoutBody = {
  user_id: string
  plan_type: 'monthly' | 'yearly'
  charity_id: string
  contribution_percentage: number
}

function getPriceId(planType: 'monthly' | 'yearly') {
  if (planType === 'monthly') return process.env.STRIPE_MONTHLY_PRICE_ID
  return process.env.STRIPE_YEARLY_PRICE_ID
}

export async function POST(req: Request) {
  try {
    const stripe = getStripe()
    const body = (await req.json()) as CheckoutBody
    const { user_id, plan_type, charity_id, contribution_percentage } = body

    if (!user_id || !plan_type || !charity_id || contribution_percentage == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (plan_type !== 'monthly' && plan_type !== 'yearly') {
      return NextResponse.json({ error: 'Invalid plan_type' }, { status: 400 })
    }

    if (Number(contribution_percentage) < 10) {
      return NextResponse.json(
        { error: 'Minimum contribution_percentage is 10' },
        { status: 400 }
      )
    }

    const priceId = getPriceId(plan_type)
    if (!priceId) {
      return NextResponse.json(
        { error: `Missing Stripe price id for plan ${plan_type}` },
        { status: 500 }
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.id !== user_id) {
      return NextResponse.json({ error: 'Invalid user_id for current session' }, { status: 403 })
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    const metadata = {
      user_id,
      plan_type,
      charity_id,
      contribution_percentage: String(contribution_percentage),
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/dashboard?checkout=success`,
      cancel_url: `${siteUrl}/dashboard?checkout=cancelled`,
      client_reference_id: user_id,
      customer_email: user.email,
      metadata,
      subscription_data: {
        metadata,
      },
    })

    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
