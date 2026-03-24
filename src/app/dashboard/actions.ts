'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitScore(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const score = parseInt(formData.get('score') as string, 10)
  const date = formData.get('date') as string

  if (isNaN(score) || score < 1 || score > 45) {
    throw new Error('Score must be between 1 and 45')
  }

  // Insert the new score
  const { error: insertError } = await supabase.from('scores').insert({
    user_id: user.id,
    stableford_score: score,
    played_date: date,
  })

  if (insertError) throw new Error(insertError.message)

  // Enforce Max 5 scores rule (delete oldest if more than 5)
  const { data: userScores } = await supabase
    .from('scores')
    .select('id')
    .eq('user_id', user.id)
    .order('played_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (userScores && userScores.length > 5) {
    const scoresToDelete = userScores.slice(5).map(s => s.id)
    await supabase
      .from('scores')
      .delete()
      .in('id', scoresToDelete)
  }

  revalidatePath('/dashboard')
}

export async function updateContribution(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const percentage = parseFloat(formData.get('percentage') as string)
  if (percentage < 10) throw new Error('Minimum contribution is 10%')

  await supabase.from('subscriptions').update({ contribution_percentage: percentage }).eq('user_id', user.id)
  revalidatePath('/dashboard')
}

export async function uploadWinningProof(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const winningId = formData.get('winning_id') as string | null
  const file = formData.get('proof') as File | null

  if (!file || file.size === 0) {
    throw new Error('Please select a proof file to upload')
  }

  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin'
  const filePath = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('winner-proofs')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    throw new Error(uploadError.message)
  }

  if (winningId) {
    // If a winnings table exists, attach uploaded proof and mark submitted.
    await supabase
      .from('winnings')
      .update({ proof_path: filePath, payment_status: 'proof_submitted' })
      .eq('id', winningId)
      .eq('user_id', user.id)
  }

  revalidatePath('/dashboard')
}