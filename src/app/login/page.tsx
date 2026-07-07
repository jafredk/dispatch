'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (!auth) {
        setError('Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_* env vars in Vercel.')
        return
      }
      if (!email || !password) {
        setError('Please fill in all fields')
        return
      }

      await signInWithEmailAndPassword(auth, email, password)
      router.push('/main')
    } catch (err: unknown) {
      const message = (err as Record<string, unknown>)?.message || 'Login failed. Please try again.'
      setError(message as string)
      console.error('Firebase sign-in error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-900 mb-4">
              <span className="text-2xl text-white font-bold">CB</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Co-operative Bank</h1>
            <p className="text-sm text-slate-600 mt-1">of Kenya</p>
            <p className="text-xs text-slate-500 mt-4">Dispatch Management System</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Email Address</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-200"
                placeholder="Enter your email"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-200"
                placeholder="Enter your password"
                required
              />
            </label>

            {error && (
              <div className="rounded-2xl bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-2xl bg-green-900 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500">
              © 2026 Co-operative Bank of Kenya Ltd. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
