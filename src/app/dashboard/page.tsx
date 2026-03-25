import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()

  // 1) Active session check
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  // 2) Profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    return (
      <div className="mx-auto mt-16 max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <h1 className="text-xl font-bold">Profile Setup Incomplete</h1>
        <p className="mt-2 text-sm">
          Your account is authenticated, but no profile row was found in the `profiles` table for this user.
          This blocks dashboard flows. Ask an admin to create your profile entry in Supabase.
        </p>
      </div>
    )
  }

  if (profile?.role === 'administrator') {
    redirect('/admin')
  }

  // 3) Latest subscription with charity
  const { data: subscriptionRows } = await supabase
    .from('subscriptions')
    .select(`
      *,
      charities (
        name
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)

  const subscription = subscriptionRows?.[0] ?? null
  const isSubscribed = subscription?.status === 'active' || subscription?.status === 'trialing'

  // 4) Charities for checkout state
  const { data: charities } = await supabase
    .from('charities')
    .select('id, name')
    .eq('active', true)
    .order('name', { ascending: true })

  // 5) Latest 5 scores in reverse chronological order
  const { data: scores } = await supabase
    .from('scores')
    .select('*')
    .eq('user_id', user.id)
    .order('played_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(5)

  // 6) Winnings overview (graceful fallback if table not present yet)
  const { data: winningsRows, error: winningsError } = await supabase
    .from('winnings')
    .select('id, amount, payment_status, draw_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const winnings = winningsError ? [] : (winningsRows ?? [])
  const totalWon = winnings.reduce((sum: number, row: any) => sum + Number(row.amount ?? 0), 0)
  const pendingWinning = winnings.find((row: any) => row.payment_status === 'pending') ?? null

  return (
    <DashboardClient
      userId={user.id}
      profile={profile || {}}
      subscription={subscription}
      isSubscribed={Boolean(isSubscribed)}
      charities={charities || []}
      scores={scores || []}
      totalWon={totalWon}
      pendingWinning={pendingWinning}
      latestPaymentStatus={pendingWinning?.payment_status || (winnings[0]?.payment_status ?? 'paid')}
    />
  )
}