'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { collection, getDocs, query, updateDoc, doc } from 'firebase/firestore'
import { onAuthStateChanged, User } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { isReviewerEmail } from '@/lib/roles'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'

interface Dispatch {
  id: string
  dispatchedBy: string
  departmentFrom: string
  serialNumber: string
  tagNumber: string
  dispatchDate: string
  destination: string
  item: string
  reasons: string
  authorizingOfficer: string
  confirmationOfficer: string
  createdBy: string
  createdByEmail: string
  status?: string
  reviewedBy?: string
  reviewedAt?: string
  reviewNote?: string
}

export default function ReviewDispatchesPage() {
  const [user, setUser] = useState<User | null>(null)
  const [authLoaded, setAuthLoaded] = useState(false)
  const [dispatches, setDispatches] = useState<Dispatch[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({})
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

  useEffect(() => {
    if (user) {
      if (!isReviewerEmail(user.email)) {
        router.push('/main')
        return
      }
      fetchDispatches()
    }
  }, [router, user])

  const fetchDispatches = async () => {
    try {
      setLoading(true)
      const q = query(collection(db, 'dispatches'))
      const querySnapshot = await getDocs(q)
      const data: Dispatch[] = []
      querySnapshot.forEach((docSnap) => {
        const docData = docSnap.data() as Dispatch
        if (!docData.status || docData.status === 'pending') {
          data.push({ id: docSnap.id, ...docData })
        }
      })
      setDispatches(data)
    } catch (error) {
      console.error('Error fetching dispatches:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async (dispatchId: string, action: 'approved' | 'rejected') => {
    if (!user) return
    try {
      setReviewingId(dispatchId)
      const note = reviewNotes[dispatchId] || (action === 'approved' ? 'Approved by reviewer' : 'Rejected by reviewer')
      await updateDoc(doc(db, 'dispatches', dispatchId), {
        status: action,
        reviewedBy: user.email || user.uid,
        reviewedAt: new Date().toISOString(),
        reviewNote: note
      })
      await fetchDispatches()
      setReviewNotes((prev) => {
        const next = { ...prev }
        delete next[dispatchId]
        return next
      })
    } catch (error) {
      console.error('Review error:', error)
    } finally {
      setReviewingId(null)
    }
  }

  if (!authLoaded) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-slate-600">Loading...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-3xl border border-slate-200 bg-green-900 p-6 text-center text-white shadow-sm">
          <p className="text-sm uppercase tracking-[0.4em] text-slate-100">The Co-operative Bank of Kenya Ltd</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">Review Dispatches</h1>
          <p className="mt-2 text-slate-100">Approve or reject pending dispatch requests</p>
        </header>

        <div className="rounded-3xl bg-white p-8 shadow-lg shadow-slate-200/50">
          {loading ? (
            <div className="text-center py-10 text-slate-600">Loading pending dispatches...</div>
          ) : dispatches.length === 0 ? (
            <div className="text-center py-10 text-slate-600">No pending dispatches found.</div>
          ) : (
            <div className="space-y-4">
              {dispatches.map((dispatch) => (
                <div key={dispatch.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 text-sm text-slate-700">
                      <div><strong>Dispatched By:</strong> {dispatch.dispatchedBy}</div>
                      <div><strong>Department:</strong> {dispatch.departmentFrom}</div>
                      <div><strong>Item:</strong> {dispatch.item}</div>
                      <div><strong>Destination:</strong> {dispatch.destination}</div>
                      <div><strong>Date:</strong> {dispatch.dispatchDate}</div>
                    </div>
                    <div className="space-y-2 text-sm text-slate-700">
                      <div><strong>Serial No:</strong> {dispatch.serialNumber}</div>
                      <div><strong>Tag No:</strong> {dispatch.tagNumber}</div>
                      <div><strong>Authorizing Officer:</strong> {dispatch.authorizingOfficer}</div>
                      <div><strong>Confirmation Officer:</strong> {dispatch.confirmationOfficer}</div>
                      <div><strong>Reason:</strong> {dispatch.reasons}</div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <textarea
                      value={reviewNotes[dispatch.id] || ''}
                      onChange={(e) => setReviewNotes((prev) => ({ ...prev, [dispatch.id]: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm"
                      rows={2}
                      placeholder="Add a review note (optional)"
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => handleReview(dispatch.id, 'approved')}
                      disabled={reviewingId === dispatch.id}
                      className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {reviewingId === dispatch.id ? 'Saving...' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReview(dispatch.id, 'rejected')}
                      disabled={reviewingId === dispatch.id}
                      className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                    >
                      {reviewingId === dispatch.id ? 'Saving...' : 'Reject'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 flex gap-3">
            <Link href="/main">
              <button className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-6 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
                Back to Dashboard
              </button>
            </Link>
            <LogoutButton className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100" />
          </div>
        </div>
      </div>
    </main>
  )
}
