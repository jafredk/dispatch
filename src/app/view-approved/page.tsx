'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, User } from 'firebase/auth'
import { collection, getDocs, query } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'

interface ApprovedDispatch {
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
  status: string
  approvedBy?: string
  approvedDate?: string
  createdAt: unknown
  createdBy: string
  createdByEmail: string
}

export default function ViewApprovedPage() {
  const [user, setUser] = useState<User | null>(null)
  const [authLoaded, setAuthLoaded] = useState(false)
  const [approvedDispatches, setApprovedDispatches] = useState<ApprovedDispatch[]>([])
  const [loading, setLoading] = useState(true)
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
      fetchApprovedDispatches()
    }
  }, [user])

  const fetchApprovedDispatches = async () => {
    try {
      setLoading(true)
      const q = query(collection(db, 'dispatches'))
      const querySnapshot = await getDocs(q)
      const data: ApprovedDispatch[] = []
      querySnapshot.forEach((doc) => {
        const docData = doc.data() as Omit<ApprovedDispatch, 'id'>
        if (docData.status === 'approved' || docData.status === 'rejected') {
          data.push({ id: doc.id, ...docData })
        }
      })
      setApprovedDispatches(data)
    } catch (error) {
      console.error('Error fetching approved dispatches:', error)
    } finally {
      setLoading(false)
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
        {/* Header */}
        <header className="mb-8 rounded-3xl border border-slate-200 bg-green-900 p-6 text-center text-white shadow-sm">
          <p className="text-sm uppercase tracking-[0.4em] text-slate-100">The Co-operative Bank of Kenya Ltd</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">Review Results</h1>
          <p className="mt-2 text-slate-100">View approved and rejected dispatches</p>
        </header>

        {/* Content */}
        <div className="rounded-3xl bg-white p-8 shadow-lg shadow-slate-200/50">
          {loading ? (
            <div className="text-center py-10">
              <p className="text-slate-600">Loading review results...</p>
            </div>
          ) : approvedDispatches.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-slate-600 mb-6">No review results found.</p>
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
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Conf Officer</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedDispatches.map((dispatch) => (
                      <tr key={dispatch.id} className="border-b border-slate-200 hover:bg-slate-50 transition">
                        <td className="px-4 py-3 text-sm text-slate-900">{dispatch.dispatchedBy}</td>
                        <td className="px-4 py-3 text-sm text-slate-900">{dispatch.departmentFrom}</td>
                        <td className="px-4 py-3 text-sm text-slate-900">{dispatch.item}</td>
                        <td className="px-4 py-3 text-sm text-slate-900">{dispatch.destination}</td>
                        <td className="px-4 py-3 text-sm text-slate-900">{dispatch.dispatchDate}</td>
                        <td className="px-4 py-3 text-sm text-slate-900">{dispatch.confirmationOfficer}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${dispatch.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {dispatch.status === 'approved' ? 'Approved' : 'Rejected'}
                          </span>
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
