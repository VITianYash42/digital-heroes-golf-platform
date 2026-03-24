import Link from 'next/link'
import { signup } from '@/app/auth/actions'
import { ArrowRightIcon } from '@heroicons/react/24/outline'

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ message: string }>
}) {
  const { message } = await searchParams

  return (
    <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2 mx-auto mt-24">
      <div className="text-center mb-8">
        <Link href="/" className="text-2xl font-extrabold tracking-tight text-slate-900 flex justify-center mb-6">
          Impact<span className="text-rose-600">Platform</span>
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Create an Account</h1>
        <p className="text-slate-600">Start delivering real impact today.</p>
      </div>

      <form className="flex-1 flex flex-col w-full gap-5 text-slate-700 bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50" action={signup}>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold" htmlFor="fullName">
            Full Name
          </label>
          <input
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
            name="fullName"
            placeholder="John Doe"
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold" htmlFor="email">
            Email
          </label>
          <input
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
            name="email"
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold" htmlFor="password">
            Password
          </label>
          <input
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
            type="password"
            name="password"
            placeholder="••••••••"
            required
          />
        </div>
        
        <button className="group mt-4 flex items-center justify-center gap-2 bg-rose-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-rose-700 transition-all shadow-md shadow-rose-200">
          Subscribe Now
          <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>

        {message && (
          <p className="mt-4 p-4 bg-rose-50 text-rose-600 text-center text-sm rounded-xl">
            {message}
          </p>
        )}

        <div className="mt-6 text-center text-sm">
          <span className="text-slate-500">Already have an account? </span>
          <Link href="/login" className="font-semibold text-slate-900 hover:text-slate-700 transition-colors">
            Sign In
          </Link>
        </div>
      </form>
    </div>
  )
}