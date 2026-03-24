import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import {
  adminAddUserScore,
  adminApproveWinnerProof,
  adminCreateCharity,
  adminDeleteCharity,
  adminMarkWinnerPaid,
  adminPublishDrawResults,
  adminRejectWinnerProof,
  adminSimulateDraw,
  adminUpdateCharity,
  adminUpdateSubscriptionStatus,
  adminUpdateUserScore,
} from './actions'

type TabKey = 'users' | 'draws' | 'charities' | 'winners' | 'reports'

type SearchParamsInput =
  | Record<string, string | string[] | undefined>
  | Promise<Record<string, string | string[] | undefined>>

type ProfileRow = {
  id: string
  email: string
  full_name: string | null
  role: string
  created_at: string
}

type SubscriptionRow = {
  id: string
  user_id: string
  charity_id: string | null
  contribution_percentage: number | null
  status: string
  created_at: string
}

type ScoreRow = {
  id: string
  user_id: string
  stableford_score: number
  played_date: string
  created_at: string
}

type CharityRow = {
  id: string
  name: string
  description: string | null
  active: boolean
  created_at: string
}

type DrawRow = {
  id: string
  draw_month: string
  prize_pool: number
  status: string
  created_at: string
  executed_at: string | null
}

type WinningRow = {
  id: string
  user_id: string
  draw_id: string | null
  amount: number
  payment_status: string
  proof_path: string | null
  created_at: string
}

const TAB_ITEMS: Array<{ key: TabKey; label: string }> = [
  { key: 'users', label: 'User Management' },
  { key: 'draws', label: 'Draw Management' },
  { key: 'charities', label: 'Charity Management' },
  { key: 'winners', label: 'Winners Management' },
  { key: 'reports', label: 'Reports & Analytics' },
]

function parseActiveTab(rawTab: string | string[] | undefined): TabKey {
  const tab = Array.isArray(rawTab) ? rawTab[0] : rawTab
  if (tab === 'users' || tab === 'draws' || tab === 'charities' || tab === 'winners' || tab === 'reports') {
    return tab
  }
  return 'users'
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams?: SearchParamsInput
}) {
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {})
  const activeTab = parseActiveTab(resolvedSearchParams.tab)

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'administrator') {
    redirect('/dashboard')
  }

  const admin = getSupabaseAdmin() as any

  const [{ data: profilesData }, { data: subscriptionsData }, { data: scoresData }, { data: charitiesData }, { data: drawsData }] =
    await Promise.all([
      admin.from('profiles').select('id, email, full_name, role, created_at').order('created_at', { ascending: false }),
      admin
        .from('subscriptions')
        .select('id, user_id, charity_id, contribution_percentage, status, created_at')
        .order('created_at', { ascending: false }),
      admin
        .from('scores')
        .select('id, user_id, stableford_score, played_date, created_at')
        .order('played_date', { ascending: false })
        .order('created_at', { ascending: false }),
      admin.from('charities').select('id, name, description, active, created_at').order('name', { ascending: true }),
      admin
        .from('draws')
        .select('id, draw_month, prize_pool, status, created_at, executed_at')
        .order('draw_month', { ascending: false })
        .order('created_at', { ascending: false }),
    ])

  const profiles = (profilesData ?? []) as ProfileRow[]
  const subscriptions = (subscriptionsData ?? []) as SubscriptionRow[]
  const scores = (scoresData ?? []) as ScoreRow[]
  const charities = (charitiesData ?? []) as CharityRow[]
  const draws = (drawsData ?? []) as DrawRow[]

  const latestSubscriptionByUser = new Map<string, SubscriptionRow>()
  for (const subscription of subscriptions) {
    if (!latestSubscriptionByUser.has(subscription.user_id)) {
      latestSubscriptionByUser.set(subscription.user_id, subscription)
    }
  }

  const scoresByUser = new Map<string, ScoreRow[]>()
  for (const score of scores) {
    const current = scoresByUser.get(score.user_id) ?? []
    if (current.length < 5) {
      current.push(score)
      scoresByUser.set(score.user_id, current)
    }
  }

  const charityById = new Map(charities.map((charity) => [charity.id, charity]))

  let winningsTableAvailable = true
  let winners: WinningRow[] = []
  try {
    const { data: winningsData, error: winningsError } = await admin
      .from('winnings')
      .select('id, user_id, draw_id, amount, payment_status, proof_path, created_at')
      .order('created_at', { ascending: false })

    if (winningsError) {
      const message = String(winningsError.message || '').toLowerCase()
      winningsTableAvailable = !message.includes('relation "public.winnings" does not exist')
      if (winningsTableAvailable) {
        throw new Error(winningsError.message)
      }
    } else {
      winners = (winningsData ?? []) as WinningRow[]
    }
  } catch {
    winningsTableAvailable = false
    winners = []
  }

  const pendingProofWinners = winners.filter((winner) => {
    if (!winner.proof_path) return false
    return winner.payment_status !== 'proof_approved' && winner.payment_status !== 'paid'
  })

  const totalUsers = profiles.length
  const totalPrizePool = draws.reduce((sum, draw) => sum + Number(draw.prize_pool ?? 0), 0)
  const totalDraws = draws.length
  const completedDraws = draws.filter((draw) => draw.status === 'completed').length
  const simulatedDraws = draws.filter((draw) => draw.status === 'simulated').length

  const charityContributionTotals = charities.map((charity) => {
    const related = subscriptions.filter((subscription) => subscription.charity_id === charity.id)
    const activeRelated = related.filter(
      (subscription) => subscription.status === 'active' || subscription.status === 'trialing'
    )
    const configuredContribution = activeRelated.reduce(
      (sum, subscription) => sum + Number(subscription.contribution_percentage ?? 0),
      0
    )

    return {
      charity,
      activeSubscriberCount: activeRelated.length,
      configuredContribution,
    }
  })

  return (
    <div className="min-h-screen bg-slate-100 p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Admin Dashboard</h1>
          <p className="mt-2 text-sm text-slate-600">
            Manage users, run official draws, maintain charities, validate winner proofs, and monitor platform analytics.
          </p>
        </header>

        <nav className="overflow-x-auto rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
          <ul className="flex min-w-max gap-2">
            {TAB_ITEMS.map((tab) => {
              const selected = tab.key === activeTab
              return (
                <li key={tab.key}>
                  <a
                    href={`/admin?tab=${tab.key}`}
                    className={`inline-flex rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      selected
                        ? 'bg-red-600 text-white shadow'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>

        {activeTab === 'users' && (
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-bold text-slate-900">User Management</h2>
            <p className="mt-1 text-sm text-slate-600">
              Review all users, subscription statuses, and edit golf scores directly.
            </p>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-700">User</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Role</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Subscription</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Scores (Edit/Add)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {profiles.map((row) => {
                    const subscription = latestSubscriptionByUser.get(row.id)
                    const userScores = scoresByUser.get(row.id) ?? []

                    return (
                      <tr key={row.id} className="align-top">
                        <td className="px-4 py-4">
                          <p className="font-semibold text-slate-900">{row.full_name || 'Unnamed User'}</p>
                          <p className="text-xs text-slate-500">{row.email}</p>
                          <p className="mt-1 text-xs text-slate-400">Joined {new Date(row.created_at).toLocaleDateString()}</p>
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {row.role}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {subscription ? (
                            <form action={adminUpdateSubscriptionStatus} className="space-y-2">
                              <input type="hidden" name="subscription_id" value={subscription.id} />
                              <select
                                name="status"
                                defaultValue={subscription.status}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                              >
                                <option value="active">active</option>
                                <option value="trialing">trialing</option>
                                <option value="past_due">past_due</option>
                                <option value="canceled">canceled</option>
                                <option value="incomplete">incomplete</option>
                              </select>
                              <button
                                type="submit"
                                className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
                              >
                                Update Status
                              </button>
                            </form>
                          ) : (
                            <span className="text-xs text-slate-500">No subscription</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-3">
                            {userScores.map((score) => (
                              <form key={score.id} action={adminUpdateUserScore} className="rounded-lg border border-slate-200 p-3">
                                <input type="hidden" name="score_id" value={score.id} />
                                <div className="grid grid-cols-2 gap-2">
                                  <input
                                    name="stableford_score"
                                    type="number"
                                    min={1}
                                    max={45}
                                    defaultValue={score.stableford_score}
                                    className="rounded-md border border-slate-300 px-2 py-1"
                                  />
                                  <input
                                    name="played_date"
                                    type="date"
                                    defaultValue={score.played_date}
                                    className="rounded-md border border-slate-300 px-2 py-1"
                                  />
                                </div>
                                <button
                                  type="submit"
                                  className="mt-2 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                                >
                                  Save Score
                                </button>
                              </form>
                            ))}

                            <form action={adminAddUserScore} className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                              <input type="hidden" name="user_id" value={row.id} />
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  name="stableford_score"
                                  type="number"
                                  min={1}
                                  max={45}
                                  required
                                  placeholder="Score"
                                  className="rounded-md border border-emerald-300 px-2 py-1"
                                />
                                <input
                                  name="played_date"
                                  type="date"
                                  required
                                  className="rounded-md border border-emerald-300 px-2 py-1"
                                />
                              </div>
                              <button
                                type="submit"
                                className="mt-2 rounded-md bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-800"
                              >
                                Add Score
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'draws' && (
          <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Draw Management</h2>
              <p className="mt-1 text-sm text-slate-600">
                Configure random or algorithmic draw logic, run simulations, and publish official results with fixed 40/35/25 splits.
              </p>
            </div>

            <form className="grid gap-4 rounded-xl border border-slate-200 p-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Draw Month</label>
                <input
                  type="date"
                  name="draw_month"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Prize Pool (USD)</label>
                <input
                  type="number"
                  name="prize_pool"
                  min={0}
                  step="0.01"
                  defaultValue={1000}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Draw Logic</label>
                <select name="draw_logic" defaultValue="random" className="w-full rounded-lg border border-slate-300 px-3 py-2">
                  <option value="random">Random</option>
                  <option value="algorithmic">Algorithmic</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Simulation Iterations</label>
                <input
                  type="number"
                  name="iterations"
                  min={1}
                  max={5000}
                  defaultValue={100}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Carried Jackpot (USD)</label>
                <input
                  type="number"
                  name="carried_jackpot"
                  min={0}
                  step="0.01"
                  defaultValue={0}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Monthly Jackpot Contribution (USD)</label>
                <input
                  type="number"
                  name="jackpot_contribution"
                  min={0}
                  step="0.01"
                  defaultValue={0}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div className="md:col-span-2 lg:col-span-3 flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  formAction={adminSimulateDraw}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
                >
                  Run Simulation
                </button>
                <button
                  type="submit"
                  formAction={adminPublishDrawResults}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Publish Official Results
                </button>
              </div>

              <p className="md:col-span-2 lg:col-span-3 text-xs text-slate-500">
                Publishing computes prize split as 40% / 35% / 25%, and applies 5-match jackpot payout when eligible entries exist; otherwise jackpot is rolled over.
              </p>
            </form>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-700">Draw Month</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Prize Pool</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Executed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {draws.slice(0, 20).map((draw) => (
                    <tr key={draw.id}>
                      <td className="px-4 py-3">{new Date(draw.draw_month).toLocaleDateString()}</td>
                      <td className="px-4 py-3">{formatMoney(Number(draw.prize_pool ?? 0))}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {draw.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{draw.executed_at ? new Date(draw.executed_at).toLocaleString() : 'Not executed'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'charities' && (
          <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Charity Management</h2>
              <p className="mt-1 text-sm text-slate-600">Create, edit, activate/deactivate, and delete charities.</p>
            </div>

            <form action={adminCreateCharity} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
              <input
                name="name"
                required
                placeholder="Charity name"
                className="rounded-lg border border-slate-300 px-3 py-2"
              />
              <input
                name="description"
                placeholder="Short description"
                className="rounded-lg border border-slate-300 px-3 py-2"
              />
              <div className="flex items-center justify-between gap-3">
                <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input type="checkbox" name="active" defaultChecked className="h-4 w-4 rounded border-slate-300" />
                  Active
                </label>
                <button type="submit" className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
                  Add Charity
                </button>
              </div>
            </form>

            <div className="space-y-3">
              {charities.map((charity) => (
                <div key={charity.id} className="rounded-xl border border-slate-200 p-4">
                  <form action={adminUpdateCharity} className="grid gap-3 md:grid-cols-4">
                    <input type="hidden" name="charity_id" value={charity.id} />
                    <input
                      name="name"
                      required
                      defaultValue={charity.name}
                      className="rounded-lg border border-slate-300 px-3 py-2"
                    />
                    <input
                      name="description"
                      defaultValue={charity.description ?? ''}
                      className="rounded-lg border border-slate-300 px-3 py-2"
                    />
                    <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                      <input type="checkbox" name="active" defaultChecked={charity.active} className="h-4 w-4 rounded border-slate-300" />
                      Active
                    </label>
                    <div className="flex gap-2">
                      <button type="submit" className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700">
                        Save
                      </button>
                    </div>
                  </form>

                  <form action={adminDeleteCharity} className="mt-3">
                    <input type="hidden" name="charity_id" value={charity.id} />
                    <button type="submit" className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-800">
                      Delete
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'winners' && (
          <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Winners Management</h2>
              <p className="mt-1 text-sm text-slate-600">
                Review winners with pending proofs and process approval, rejection, or payout completion.
              </p>
            </div>

            {!winningsTableAvailable ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Winners table is not available in the current database schema yet. Create a `winnings` table to enable proof review and payout workflows.
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  Pending proofs: <span className="font-bold text-slate-900">{pendingProofWinners.length}</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-slate-700">Winner</th>
                        <th className="px-4 py-3 font-semibold text-slate-700">Amount</th>
                        <th className="px-4 py-3 font-semibold text-slate-700">Proof</th>
                        <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
                        <th className="px-4 py-3 font-semibold text-slate-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {winners.map((winner) => {
                        const winnerProfile = profiles.find((profileRow) => profileRow.id === winner.user_id)
                        return (
                          <tr key={winner.id}>
                            <td className="px-4 py-3">
                              <p className="font-semibold text-slate-900">{winnerProfile?.full_name || 'Unknown Winner'}</p>
                              <p className="text-xs text-slate-500">{winnerProfile?.email || winner.user_id}</p>
                            </td>
                            <td className="px-4 py-3">{formatMoney(Number(winner.amount ?? 0))}</td>
                            <td className="px-4 py-3">
                              {winner.proof_path ? (
                                <span className="text-xs font-medium text-emerald-700">Uploaded</span>
                              ) : (
                                <span className="text-xs text-slate-500">Not uploaded</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                {winner.payment_status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                <form action={adminApproveWinnerProof}>
                                  <input type="hidden" name="winning_id" value={winner.id} />
                                  <button type="submit" className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800">
                                    Approve
                                  </button>
                                </form>
                                <form action={adminRejectWinnerProof}>
                                  <input type="hidden" name="winning_id" value={winner.id} />
                                  <button type="submit" className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700">
                                    Reject
                                  </button>
                                </form>
                                <form action={adminMarkWinnerPaid}>
                                  <input type="hidden" name="winning_id" value={winner.id} />
                                  <button type="submit" className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">
                                    Mark as Paid
                                  </button>
                                </form>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        )}

        {activeTab === 'reports' && (
          <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Reports & Analytics</h2>
              <p className="mt-1 text-sm text-slate-600">
                Aggregate insights across users, draw operations, prize pools, and charity contribution settings.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl bg-slate-900 p-4 text-white">
                <p className="text-xs uppercase tracking-wider text-slate-300">Total Users</p>
                <p className="mt-2 text-3xl font-bold">{totalUsers}</p>
              </div>
              <div className="rounded-xl bg-red-600 p-4 text-white">
                <p className="text-xs uppercase tracking-wider text-red-100">Total Prize Pool</p>
                <p className="mt-2 text-3xl font-bold">{formatMoney(totalPrizePool)}</p>
              </div>
              <div className="rounded-xl bg-emerald-700 p-4 text-white">
                <p className="text-xs uppercase tracking-wider text-emerald-100">Completed Draws</p>
                <p className="mt-2 text-3xl font-bold">{completedDraws}</p>
              </div>
              <div className="rounded-xl bg-amber-500 p-4 text-white">
                <p className="text-xs uppercase tracking-wider text-amber-100">Pending Proofs</p>
                <p className="mt-2 text-3xl font-bold">{pendingProofWinners.length}</p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Draw Statistics</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  <li>Total draws recorded: <span className="font-semibold text-slate-900">{totalDraws}</span></li>
                  <li>Completed draws: <span className="font-semibold text-slate-900">{completedDraws}</span></li>
                  <li>Simulated draws: <span className="font-semibold text-slate-900">{simulatedDraws}</span></li>
                  <li>Completion rate: <span className="font-semibold text-slate-900">{totalDraws > 0 ? `${Math.round((completedDraws / totalDraws) * 100)}%` : '0%'}</span></li>
                </ul>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Charity Contribution Totals</h3>
                <div className="mt-3 space-y-2 text-sm">
                  {charityContributionTotals.map(({ charity, activeSubscriberCount, configuredContribution }) => (
                    <div key={charity.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                      <span className="font-medium text-slate-800">{charity.name}</span>
                      <span className="text-slate-600">
                        {activeSubscriberCount} active users, {configuredContribution.toFixed(2)} total configured %
                      </span>
                    </div>
                  ))}
                  {charityContributionTotals.length === 0 && (
                    <p className="text-slate-500">No charities configured yet.</p>
                  )}
                </div>
              </div>
            </div>

            {draws.length > 0 && (
              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Recent Draw Results</h3>
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left">
                      <tr>
                        <th className="px-3 py-2 font-semibold text-slate-700">Date</th>
                        <th className="px-3 py-2 font-semibold text-slate-700">Status</th>
                        <th className="px-3 py-2 font-semibold text-slate-700">Prize Pool</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {draws.slice(0, 10).map((draw) => (
                        <tr key={draw.id}>
                          <td className="px-3 py-2">{new Date(draw.draw_month).toLocaleDateString()}</td>
                          <td className="px-3 py-2">{draw.status}</td>
                          <td className="px-3 py-2">{formatMoney(Number(draw.prize_pool ?? 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Prize split policy reference for published draws: <span className="font-semibold text-slate-900">40%</span> first place,
              <span className="font-semibold text-slate-900"> 35%</span> second place,
              <span className="font-semibold text-slate-900"> 25%</span> third place.
            </div>
          </section>
        )}
      </div>
    </div>
  )
}