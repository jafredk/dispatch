'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, User } from 'firebase/auth'
import { collection, getDocs, query, updateDoc, doc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { isReviewerEmail } from '@/lib/roles'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'
import { generateGatepassPdf } from '@/lib/gatepass'

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
  createdAt: unknown
  createdBy: string
  createdByEmail: string
  status?: string
  reviewedBy?: string
  reviewedAt?: unknown
  reviewNote?: string
}

export default function ViewDispatchesPage() {
  const [user, setUser] = useState<User | null>(null)
  const [authLoaded, setAuthLoaded] = useState(false)
  const [dispatches, setDispatches] = useState<Dispatch[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({})
  const [gatepassUrls, setGatepassUrls] = useState<Record<string, string>>({})
  const [generatingGatepass, setGeneratingGatepass] = useState<string | null>(null)
  const router = useRouter()
  const isReviewer = isReviewerEmail(user?.email)

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
      fetchDispatches()
    }
  }, [user])

  useEffect(() => {
    return () => {
      Object.values(gatepassUrls).forEach((url) => {
        try {
          URL.revokeObjectURL(url)
        } catch {
          // Ignore URL revocation errors
        }
      })
    }
  }, [gatepassUrls])

  const fetchDispatches = async () => {
    try {
      setLoading(true)
      const q = query(collection(db, 'dispatches'))
      const querySnapshot = await getDocs(q)
      const data: Dispatch[] = []
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Dispatch)
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

  const handleGenerateGatepass = async (dispatch: Dispatch) => {
    if (gatepassUrls[dispatch.id]) return
    setGeneratingGatepass(dispatch.id)
    try {
      const url = await generateGatepassPdf(dispatch as unknown as Record<string, unknown>)
      if (url) {
        setGatepassUrls((prev) => ({ ...prev, [dispatch.id]: url }))
      }
    } catch (err) {
      console.error('Gatepass generation failed:', err)
    } finally {
      setGeneratingGatepass(null)
    }
  }

  const handleOpenGatepass = (dispatchId: string) => {
    const url = gatepassUrls[dispatchId]
    if (!url) return
    window.open(url, '_blank')
  }

  const handleDownloadGatepass = (dispatch: Dispatch) => {
    const url = gatepassUrls[dispatch.id]
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = `gatepass-${dispatch.serialNumber || 'dispatch'}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
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
        {/* Header */}
        <header className="mb-8 rounded-3xl border border-slate-200 bg-green-900 p-6 text-center text-white shadow-sm">
          <p className="text-sm uppercase tracking-[0.4em] text-slate-100">The Co-operative Bank of Kenya Ltd</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">Dispatched Items</h1>
          <p className="mt-2 text-slate-100">View all dispatch records</p>
        </header>

        {/* Content */}
        <div className="rounded-3xl bg-white p-8 shadow-lg shadow-slate-200/50">
          {loading ? (
            <div className="text-center py-10">
              <p className="text-slate-600">Loading dispatches...</p>
            </div>
          ) : dispatches.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-slate-600 mb-6">No dispatches found.</p>
              <Link href="/main">
                <button className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-6 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
                  Back to Dashboard
                </button>
              </Link>
            </div>
          ) : (
            <div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Dispatched By</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Department</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Item</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Destination</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Gatepass</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dispatches.map((dispatch) => (
                      <tr key={dispatch.id} className="border-b border-slate-200 hover:bg-slate-50 transition">
                        <td className="px-4 py-3 text-sm text-slate-900">{dispatch.dispatchedBy}</td>
                        <td className="px-4 py-3 text-sm text-slate-900">{dispatch.departmentFrom}</td>
                        <td className="px-4 py-3 text-sm text-slate-900">{dispatch.item}</td>
                        <td className="px-4 py-3 text-sm text-slate-900">{dispatch.destination}</td>
                        <td className="px-4 py-3 text-sm text-slate-900">{dispatch.dispatchDate}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex gap-1.5">
                            {gatepassUrls[dispatch.id] ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenGatepass(dispatch.id)}
                                  className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition"
                                  title="Open gatepass PDF in new tab"
                                >
                                  Open
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadGatepass(dispatch)}
                                  className="rounded-lg bg-slate-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition"
                                  title="Download gatepass PDF"
                                >
                                  Download
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleGenerateGatepass(dispatch)}
                                disabled={generatingGatepass === dispatch.id}
                                className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-50"
                                title="Generate gatepass PDF"
                              >
                                {generatingGatepass === dispatch.id ? 'Generating...' : 'Generate'}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900">
                          {isReviewer ? (
                            <>
                              <textarea
                                value={reviewNotes[dispatch.id] || ''}
                                onChange={(e) =>
                                  setReviewNotes((prev) => ({ ...prev, [dispatch.id]: e.target.value }))
                                }
                                className="mb-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs"
                                rows={2}
                                placeholder="Optional note"
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleReview(dispatch.id, 'approved')}
                                  disabled={reviewingId === dispatch.id}
                                  className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  {reviewingId === dispatch.id ? 'Saving...' : 'Approve'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReview(dispatch.id, 'rejected')}
                                  disabled={reviewingId === dispatch.id}
                                  className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                                >
                                  {reviewingId === dispatch.id ? 'Saving...' : 'Reject'}
                                </button>
                              </div>
                            </>
                          ) : (
                            <span className="text-xs text-slate-500">Reviewer-only</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-8 flex gap-3">
                <Link href="/main">
                  <button className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-6 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
                    Back to Dashboard
                  </button>
                </Link>
                <LogoutButton className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100" />
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
