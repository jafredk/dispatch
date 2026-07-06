'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, User } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { isReviewerEmail } from '@/lib/roles'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'

export default function MainPage() {
  const [user, setUser] = useState<User | null>(null)
  const [authLoaded, setAuthLoaded] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/login')
      } else {
        setUser(currentUser)
      }
      setAuthLoaded(true)
    })
    return () => unsubscribe()
  }, [router])

  if (!authLoaded) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-slate-600">Loading...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <header className="mb-12 rounded-3xl border border-slate-200 bg-green-900 p-8 text-center text-white shadow-sm">
          <p className="text-sm uppercase tracking-[0.4em] text-slate-100">The Co-operative Bank of Kenya Ltd</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">Dispatch Management System</h1>
          <p className="mt-2 text-slate-100">Welcome, {user?.email}</p>
        </header>

        {/* Main Content */}
        <div className="rounded-3xl bg-white p-8 shadow-lg shadow-slate-200/50">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">What would you like to do?</h2>

          {/* Action Buttons Grid */}
          <div className="grid gap-6 md:grid-cols-3 mb-10">
            {/* Dispatch Items Button */}
            <Link href="/dispatch">
              <button className="w-full h-full rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-8 text-center text-white shadow-md transition hover:shadow-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400">
                <div className="mb-4 text-4xl">📦</div>
                <h3 className="text-xl font-bold mb-2">Dispatch Items</h3>
                <p className="text-sm text-blue-100">Create a new dispatch record</p>
              </button>
            </Link>

            {/* View Dispatched Items Button */}
            <Link href="/view-dispatches">
              <button className="w-full h-full rounded-2xl bg-gradient-to-br from-purple-600 to-purple-700 p-8 text-center text-white shadow-md transition hover:shadow-lg hover:from-purple-700 hover:to-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-400">
                <div className="mb-4 text-4xl">📋</div>
                <h3 className="text-xl font-bold mb-2">View Dispatched Items</h3>
                <p className="text-sm text-purple-100">See all dispatch records</p>
              </button>
            </Link>

            {/* Review Pending Dispatches Button */}
            {isReviewerEmail(user?.email) && (
              <Link href="/review-dispatches">
                <button className="w-full h-full rounded-2xl bg-gradient-to-br from-amber-600 to-orange-700 p-8 text-center text-white shadow-md transition hover:shadow-lg hover:from-amber-700 hover:to-orange-800 focus:outline-none focus:ring-2 focus:ring-amber-400">
                  <div className="mb-4 text-4xl">📝</div>
                  <h3 className="text-xl font-bold mb-2">Review Dispatches</h3>
                  <p className="text-sm text-amber-100">Approve or reject pending dispatches</p>
                </button>
              </Link>
            )}

            {/* View Approved Items Button */}
            <Link href="/view-approved">
              <button className="w-full h-full rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 p-8 text-center text-white shadow-md transition hover:shadow-lg hover:from-emerald-700 hover:to-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-400">
                <div className="mb-4 text-4xl">✅</div>
                <h3 className="text-xl font-bold mb-2">View Approved Items</h3>
                <p className="text-sm text-emerald-100">Approved dispatches only</p>
              </button>
            </Link>

            {/* Search Dispatch Items Button */}
            <Link href="/search">
              <button className="w-full h-full rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 p-8 text-center text-white shadow-md transition hover:shadow-lg hover:from-slate-700 hover:to-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400">
                <div className="mb-4 text-4xl">🔎</div>
                <h3 className="text-xl font-bold mb-2">Search Dispatches</h3>
                <p className="text-sm text-slate-100">Filter items and view gatepasses</p>
              </button>
            </Link>
          </div>

          {/* Logout Button */}
          <div className="flex justify-center">
            <LogoutButton className="rounded-2xl border border-slate-300 bg-white px-8 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-200" />
          </div>
        </div>
      </div>
    </main>
  )
}
