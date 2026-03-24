'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function toAuthMessage(errorMessage: string) {
  const normalized = errorMessage.toLowerCase()

  if (normalized.includes('rate limit')) {
    return 'Email rate limit exceeded. Please wait a minute, check your inbox for any previous confirmation email, then try again.'
  }

  if (normalized.includes('invalid login credentials')) {
    return 'Invalid email or password.'
  }

  if (normalized.includes('email not confirmed')) {
    return 'Please confirm your email before logging in.'
  }

  if (normalized.includes('user already registered')) {
    return 'This email is already registered. Try logging in instead.'
  }

  return errorMessage
}

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    const message = encodeURIComponent(toAuthMessage(error.message))
    return redirect(`/login?message=${message}`)
  }

  return redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      }
    }
  })

  if (error) {
    if (error.message.toLowerCase().includes('rate limit')) {
      // Optional dev fallback: if service role is present, create a confirmed user
      // without sending an email so onboarding is not blocked by provider throttling.
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

      if (serviceRoleKey && supabaseUrl) {
        const adminClient = createSupabaseClient(supabaseUrl, serviceRoleKey)
        const { data: created, error: createError } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
          },
        })

        if (!createError && created.user) {
          // Ensure profile exists even if trigger has not been applied yet.
          await adminClient.from('profiles').upsert({
            id: created.user.id,
            email,
            full_name: fullName,
            role: 'registered_subscriber',
          })

          const { error: loginError } = await supabase.auth.signInWithPassword({
            email,
            password,
          })

          if (!loginError) {
            return redirect('/dashboard')
          }
        }
      }

      const message = encodeURIComponent(
        'Email rate limit exceeded. If you already received a verification email, use that link and then log in. For local development, set SUPABASE_SERVICE_ROLE_KEY in .env.local to bypass email confirmation during signup.'
      )
      return redirect(`/login?message=${message}`)
    }

    const message = encodeURIComponent(toAuthMessage(error.message))
    return redirect(`/signup?message=${message}`)
  }

  // If email confirmation is enabled, the user won't have an active session yet.
  const { data: userResult } = await supabase.auth.getUser()
  if (!userResult.user) {
    const message = encodeURIComponent('Account created. Please verify your email, then log in.')
    return redirect(`/login?message=${message}`)
  }

  return redirect('/dashboard')
}

export async function signout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return redirect('/')
}