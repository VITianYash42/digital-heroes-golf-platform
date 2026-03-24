'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

type ScoreRow = {
  id: string
  user_id: string
  stableford_score: number
  played_date: string
  created_at: string
}

type SubscriptionRow = {
  user_id: string
  status: string
  created_at: string
}

async function assertAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || profile?.role !== 'administrator') {
    throw new Error('Forbidden')
  }

  return user.id
}

function toPositiveNumber(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return parsed
}

function ensureScoreBounds(score: number) {
  if (!Number.isInteger(score) || score < 1 || score > 45) {
    throw new Error('Score must be an integer between 1 and 45.')
  }
}

export async function adminUpdateUserScore(formData: FormData) {
  await assertAdmin()

  const scoreId = String(formData.get('score_id') ?? '')
  const stablefordScore = Number(formData.get('stableford_score'))
  const playedDate = String(formData.get('played_date') ?? '')

  if (!scoreId || !playedDate) {
    throw new Error('Missing score update payload.')
  }

  ensureScoreBounds(stablefordScore)

  const admin = getSupabaseAdmin() as any
  const { error } = await admin
    .from('scores')
    .update({
      stableford_score: stablefordScore,
      played_date: playedDate,
    })
    .eq('id', scoreId)

  if (error) throw new Error(error.message)

  revalidatePath('/admin')
}

export async function adminAddUserScore(formData: FormData) {
  await assertAdmin()

  const userId = String(formData.get('user_id') ?? '')
  const stablefordScore = Number(formData.get('stableford_score'))
  const playedDate = String(formData.get('played_date') ?? '')

  if (!userId || !playedDate) {
    throw new Error('Missing score create payload.')
  }

  ensureScoreBounds(stablefordScore)

  const admin = getSupabaseAdmin() as any
  const { error: insertError } = await admin.from('scores').insert({
    user_id: userId,
    stableford_score: stablefordScore,
    played_date: playedDate,
  })

  if (insertError) throw new Error(insertError.message)

  const { data: userScores, error: listError } = await admin
    .from('scores')
    .select('id')
    .eq('user_id', userId)
    .order('played_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (listError) throw new Error(listError.message)

  if ((userScores ?? []).length > 5) {
    const scoreIdsToDelete = (userScores as Array<{ id: string }>).slice(5).map((row) => row.id)
    const { error: deleteError } = await admin.from('scores').delete().in('id', scoreIdsToDelete)
    if (deleteError) throw new Error(deleteError.message)
  }

  revalidatePath('/admin')
}

export async function adminUpdateSubscriptionStatus(formData: FormData) {
  await assertAdmin()

  const subscriptionId = String(formData.get('subscription_id') ?? '')
  const status = String(formData.get('status') ?? '')

  if (!subscriptionId || !status) {
    throw new Error('Missing subscription update payload.')
  }

  const admin = getSupabaseAdmin() as any
  const { error } = await admin
    .from('subscriptions')
    .update({ status })
    .eq('id', subscriptionId)

  if (error) throw new Error(error.message)
  revalidatePath('/admin')
}

export async function adminCreateCharity(formData: FormData) {
  await assertAdmin()

  const name = String(formData.get('name') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const active = formData.get('active') === 'on'

  if (!name) {
    throw new Error('Charity name is required.')
  }

  const admin = getSupabaseAdmin() as any
  const { error } = await admin.from('charities').insert({
    name,
    description: description || null,
    active,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/admin')
}

export async function adminUpdateCharity(formData: FormData) {
  await assertAdmin()

  const charityId = String(formData.get('charity_id') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const active = formData.get('active') === 'on'

  if (!charityId || !name) {
    throw new Error('Missing charity update payload.')
  }

  const admin = getSupabaseAdmin() as any
  const { error } = await admin
    .from('charities')
    .update({
      name,
      description: description || null,
      active,
    })
    .eq('id', charityId)

  if (error) throw new Error(error.message)
  revalidatePath('/admin')
}

export async function adminDeleteCharity(formData: FormData) {
  await assertAdmin()

  const charityId = String(formData.get('charity_id') ?? '')
  if (!charityId) {
    throw new Error('Missing charity delete payload.')
  }

  const admin = getSupabaseAdmin() as any
  const { error } = await admin.from('charities').delete().eq('id', charityId)

  if (error) throw new Error(error.message)
  revalidatePath('/admin')
}

export async function adminSimulateDraw(formData: FormData) {
  await assertAdmin()

  const logic = String(formData.get('draw_logic') ?? 'random')
  const iterations = Math.max(1, Math.min(5000, Math.floor(toPositiveNumber(formData.get('iterations'), 100))))
  const drawMonth = String(formData.get('draw_month') ?? new Date().toISOString().slice(0, 10))
  const prizePool = Math.max(0, toPositiveNumber(formData.get('prize_pool'), 0))

  const admin = getSupabaseAdmin() as any
  const { data: activeSubscriptions, error: subError } = await admin
    .from('subscriptions')
    .select('user_id, status, created_at')
    .in('status', ['active', 'trialing'])

  if (subError) throw new Error(subError.message)

  const subscriptions = (activeSubscriptions ?? []) as SubscriptionRow[]
  const uniqueUserIds = [...new Set(subscriptions.map((row) => row.user_id))]

  const { data: scores, error: scoreError } = await admin
    .from('scores')
    .select('id, user_id, stableford_score, played_date, created_at')
    .in('user_id', uniqueUserIds)
    .order('played_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (scoreError) throw new Error(scoreError.message)

  const scoresByUser = new Map<string, ScoreRow[]>()
  for (const row of (scores ?? []) as ScoreRow[]) {
    const current = scoresByUser.get(row.user_id) ?? []
    current.push(row)
    scoresByUser.set(row.user_id, current)
  }

  let simulatedWinnerIds: string[] = []
  if (logic === 'algorithmic') {
    simulatedWinnerIds = uniqueUserIds
      .map((userId) => {
        const recent = (scoresByUser.get(userId) ?? []).slice(0, 5)
        const avg = recent.length
          ? recent.reduce((sum, s) => sum + Number(s.stableford_score), 0) / recent.length
          : 0
        return { userId, score: avg }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((row) => row.userId)
  } else {
    const shuffled = [...uniqueUserIds]
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      const temp = shuffled[i]
      shuffled[i] = shuffled[j]
      shuffled[j] = temp
    }
    simulatedWinnerIds = shuffled.slice(0, 3)
  }

  const summary = {
    logic,
    iterations,
    drawMonth,
    prizePool,
    participantCount: uniqueUserIds.length,
    simulatedWinnerCount: simulatedWinnerIds.length,
    simulatedWinnerIds,
  }

  const { error: insertError } = await admin.from('draws').insert({
    draw_month: drawMonth,
    prize_pool: prizePool,
    status: 'simulated',
    executed_at: new Date().toISOString(),
  })

  if (insertError) throw new Error(insertError.message)

  console.log('[admin] draw simulation summary', summary)
  revalidatePath('/admin')
}

export async function adminPublishDrawResults(formData: FormData) {
  await assertAdmin()

  const logic = String(formData.get('draw_logic') ?? 'random')
  const drawMonth = String(formData.get('draw_month') ?? new Date().toISOString().slice(0, 10))
  const prizePool = Math.max(0, toPositiveNumber(formData.get('prize_pool'), 0))
  const carriedJackpot = Math.max(0, toPositiveNumber(formData.get('carried_jackpot'), 0))
  const monthlyJackpotContribution = Math.max(0, toPositiveNumber(formData.get('jackpot_contribution'), 0))
  const jackpotBeforePayout = carriedJackpot + monthlyJackpotContribution

  const admin = getSupabaseAdmin() as any
  const { data: activeSubscriptions, error: subError } = await admin
    .from('subscriptions')
    .select('user_id')
    .in('status', ['active', 'trialing'])

  if (subError) throw new Error(subError.message)

  const participantIds = [...new Set((activeSubscriptions ?? []).map((row: { user_id: string }) => row.user_id))]

  const { data: scoreRows, error: scoreError } = await admin
    .from('scores')
    .select('id, user_id, stableford_score, played_date, created_at')
    .in('user_id', participantIds)
    .order('played_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (scoreError) throw new Error(scoreError.message)

  const scoresByUser = new Map<string, ScoreRow[]>()
  for (const row of (scoreRows ?? []) as ScoreRow[]) {
    const current = scoresByUser.get(row.user_id) ?? []
    current.push(row)
    scoresByUser.set(row.user_id, current)
  }

  let winnerIds: string[] = []
  if (logic === 'algorithmic') {
    winnerIds = participantIds
      .map((userId) => {
        const recent = (scoresByUser.get(userId) ?? []).slice(0, 5)
        const avg = recent.length
          ? recent.reduce((sum, s) => sum + Number(s.stableford_score), 0) / recent.length
          : 0
        return { userId, avg }
      })
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 3)
      .map((row) => row.userId)
  } else {
    const shuffled = [...participantIds]
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      const temp = shuffled[i]
      shuffled[i] = shuffled[j]
      shuffled[j] = temp
    }
    winnerIds = shuffled.slice(0, 3)
  }

  const firstPrize = Number((prizePool * 0.4).toFixed(2))
  const secondPrize = Number((prizePool * 0.35).toFixed(2))
  const thirdPrize = Number((prizePool * 0.25).toFixed(2))

  const fiveMatchUsers = participantIds.filter((userId) => {
    const recent = (scoresByUser.get(userId) ?? []).slice(0, 5)
    return recent.length === 5
  })

  const jackpotWinnersCount = fiveMatchUsers.length
  const jackpotPerWinner = jackpotWinnersCount > 0 ? Number((jackpotBeforePayout / jackpotWinnersCount).toFixed(2)) : 0
  const jackpotRollover = jackpotWinnersCount > 0 ? 0 : jackpotBeforePayout

  const { data: drawRow, error: drawInsertError } = await admin
    .from('draws')
    .insert({
      draw_month: drawMonth,
      prize_pool: prizePool,
      status: 'completed',
      executed_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (drawInsertError) throw new Error(drawInsertError.message)

  const drawId = drawRow?.id as string

  const winningsPayload: Array<Record<string, unknown>> = []
  if (winnerIds[0]) {
    winningsPayload.push({
      user_id: winnerIds[0],
      draw_id: drawId,
      amount: firstPrize,
      payment_status: 'pending',
      proof_path: null,
    })
  }
  if (winnerIds[1]) {
    winningsPayload.push({
      user_id: winnerIds[1],
      draw_id: drawId,
      amount: secondPrize,
      payment_status: 'pending',
      proof_path: null,
    })
  }
  if (winnerIds[2]) {
    winningsPayload.push({
      user_id: winnerIds[2],
      draw_id: drawId,
      amount: thirdPrize,
      payment_status: 'pending',
      proof_path: null,
    })
  }

  if (jackpotPerWinner > 0) {
    for (const userId of fiveMatchUsers) {
      winningsPayload.push({
        user_id: userId,
        draw_id: drawId,
        amount: jackpotPerWinner,
        payment_status: 'pending',
        proof_path: null,
      })
    }
  }

  if (winningsPayload.length > 0) {
    const { error: winningsInsertError } = await admin.from('winnings').insert(winningsPayload)
    if (winningsInsertError) {
      const message = String(winningsInsertError.message || '').toLowerCase()
      if (!message.includes('relation "public.winnings" does not exist')) {
        throw new Error(winningsInsertError.message)
      }
    }
  }

  console.log('[admin] draw published', {
    drawId,
    logic,
    winnerIds,
    firstPrize,
    secondPrize,
    thirdPrize,
    jackpotBeforePayout,
    jackpotWinnersCount,
    jackpotPerWinner,
    jackpotRollover,
  })

  revalidatePath('/admin')
}

export async function adminApproveWinnerProof(formData: FormData) {
  await assertAdmin()

  const winningId = String(formData.get('winning_id') ?? '')
  if (!winningId) throw new Error('Missing winning approval payload.')

  const admin = getSupabaseAdmin() as any
  const { error } = await admin
    .from('winnings')
    .update({ payment_status: 'proof_approved' })
    .eq('id', winningId)

  if (error) throw new Error(error.message)
  revalidatePath('/admin')
}

export async function adminRejectWinnerProof(formData: FormData) {
  await assertAdmin()

  const winningId = String(formData.get('winning_id') ?? '')
  if (!winningId) throw new Error('Missing winning rejection payload.')

  const admin = getSupabaseAdmin() as any
  const { error } = await admin
    .from('winnings')
    .update({ payment_status: 'proof_rejected' })
    .eq('id', winningId)

  if (error) throw new Error(error.message)
  revalidatePath('/admin')
}

export async function adminMarkWinnerPaid(formData: FormData) {
  await assertAdmin()

  const winningId = String(formData.get('winning_id') ?? '')
  if (!winningId) throw new Error('Missing mark paid payload.')

  const admin = getSupabaseAdmin() as any
  const { error } = await admin
    .from('winnings')
    .update({ payment_status: 'paid' })
    .eq('id', winningId)

  if (error) throw new Error(error.message)
  revalidatePath('/admin')
}