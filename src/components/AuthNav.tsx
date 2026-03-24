'use client'

import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { signout } from '@/app/auth/actions'
import { type User } from '@supabase/supabase-js'

export default function AuthNav() {
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
    }
    fetchUser()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  return (
    <nav className="flex gap-6 items-center font-medium shadow-sm">
      {user ? (
        <>
          <Link href="/dashboard" className="text-slate-600 hover:text-slate-900 transition-colors">
            Dashboard
          </Link>
          <form action={signout}>
            <button
              type="submit"
              className="bg-slate-100 text-slate-700 px-5 py-2 rounded-full hover:bg-slate-200 transition-transform hover:scale-105 active:scale-95 shadow-sm"
            >
              Log Out
            </button>
          </form>
        </>
      ) : (
        <>
          <Link href="/login" className="text-slate-600 hover:text-slate-900 transition-colors">
            Log In
          </Link>
          <Link
            href="/signup"
            className="bg-slate-900 text-white px-5 py-2 rounded-full hover:bg-slate-800 transition-transform hover:scale-105 active:scale-95 shadow-md"
          >
            Subscribe
          </Link>
        </>
      )}
    </nav>
  )
}