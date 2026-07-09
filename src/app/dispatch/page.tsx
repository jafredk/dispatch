'use client'

import { useEffect, useState } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { onAuthStateChanged, User } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { buildGatepassHtml, escapeHtml, renderItemsHtml, safeImport } from '@/lib/gatepass'
import LogoutButton from '@/components/LogoutButton'

const initialValues = {
  dispatchedBy: '',
  departmentFrom: '',
  serialNumber: '',
  tagNumber: '',
  dispatchDate: '',
  destination: '',
  item: '',
  reasons: '',
  authorizingOfficer: '',
  confirmationOfficer: ''
}

export default function DispatchPage() {
  const [form, setForm] = useState(initialValues)
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [authLoaded, setAuthLoaded] = useState(false)
  const [gatepassUrl, setGatepassUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!auth) {
      setStatus({ type: 'error', message: 'Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_* env vars.' })
      setAuthLoaded(true)
      return
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setAuthLoaded(true)
    })
    return () => unsubscribe()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!db) {
      setStatus({ type: 'error', message: 'Database is not configured. Check Firebase environment variables.' })
      return
    }

    if (!user) {
      setStatus({ type: 'error', message: 'You must be signed in to save dispatch details.' })
      return
    }

    setStatus({ type: 'info', message: 'Saving dispatch...' })
    setIsSaving(true)

    try {
      await addDoc(collection(db, 'dispatches'), {
        ...form,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        createdByEmail: user.email || null
      })

      setStatus({ type: 'success', message: 'Dispatch saved successfully.' })
      setForm(initialValues)
      // generate gatepass PDF and provide options
      generateGatepass({ ...form, createdBy: user.uid, createdByEmail: user.email || null })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save dispatch.'
      setStatus({ type: 'error', message })
    } finally {
      setIsSaving(false)
    }
  }

  // Generate gatepass PDF using jspdf + html2canvas if available; fallback to printable window
  const generateGatepass = async (data: Record<string, unknown>) => {
    try {
      const jsPdfModule = await safeImport('jspdf', 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js')
      const html2canvas = (await safeImport('html2canvas', 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js')) || (window as unknown as Record<string, unknown>).html2canvas
      const jsPDF = (jsPdfModule as Record<string, unknown>)?.jsPDF || ((jsPdfModule as Record<string, unknown>)?.default as Record<string, unknown>)?.jsPDF || (window as unknown as Record<string, unknown>).jsPDF || jsPdfModule

      // Create a temporary element with gatepass markup
      const container = document.createElement('div')
      container.style.width = '760px'
      container.style.padding = '28px'
      container.style.background = '#ffffff'
      container.style.color = '#111827'
      const htmlString = buildGatepassHtml(data)
      const parsed = new DOMParser().parseFromString(htmlString, 'text/html')
      const container = document.createElement('div')
      container.style.width = '760px'
      container.style.padding = '28px'
      container.style.background = '#ffffff'
      container.style.color = '#111827'
      container.style.fontFamily = 'Arial, Helvetica, sans-serif'

      const style = parsed.querySelector('style')
      if (style) {
        container.appendChild(style.cloneNode(true))
      }
      Array.from(parsed.body.childNodes).forEach((node) => {
        container.appendChild(node.cloneNode(true))
      })
      document.body.appendChild(container)

      const canvas = await (html2canvas as (el: HTMLElement, opts: Record<string, unknown>) => Promise<HTMLCanvasElement>)(container, { scale: 2, useCORS: true })
      const imgData = canvas.toDataURL('image/png')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdf = new (jsPDF as any)({ unit: 'px', format: 'a4' })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const targetHeight = pageHeight * 0.74
      const scale = Math.min((pageWidth - 60) / canvas.width, targetHeight / canvas.height)
      const imgWidth = canvas.width * scale
      const imgHeight = canvas.height * scale
      const x = (pageWidth - imgWidth) / 2
      const y = (pageHeight - imgHeight) / 2
      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight)

      const blob = pdf.output('blob')
      const url = URL.createObjectURL(blob)
      setGatepassUrl(url)

      // cleanup
      document.body.removeChild(container)
    } catch {
      // fallback: open a printable window with HTML
      const html = buildGatepassHtml(data)
      const w = window.open('', '_blank')
      if (w) {
        w.document.write(html)
        w.document.close()
      }
    }
  }

  // The buildGatepassHtml is imported from the shared library

  // cleanup generated object URL on unmount or change
  useEffect(() => {
    return () => {
      if (gatepassUrl) {
        try {
          URL.revokeObjectURL(gatepassUrl)
        } catch {
          // Ignore URL revocation errors
        }
      }
    }
  }, [gatepassUrl])

  const openGatepass = () => {
    if (!gatepassUrl) return
    window.open(gatepassUrl, '_blank')
  }

  const downloadGatepass = () => {
    if (!gatepassUrl) return
    const a = document.createElement('a')
    a.href = gatepassUrl
    a.download = 'gatepass.pdf'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const printGatepass = () => {
    if (!gatepassUrl) return
    const w = window.open(gatepassUrl, '_blank')
    if (w) {
      w.focus()
      w.onload = () => {
        try {
          w.print()
        } catch {
          // Ignore print errors
        }
      }
    } else {
      alert('Popup blocked. Please open the gatepass and print manually.')
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl rounded-3xl bg-white p-8 shadow-lg shadow-slate-200/50">
        <header className="mb-10 rounded-3xl border border-slate-200 bg-green-900 p-6 text-center text-white shadow-sm">
          <p className="text-sm uppercase tracking-[0.4em] text-slate-100">The Co-operative Bank of Kenya Ltd</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">Dispatch Details</h1>
          <p className="mt-2 text-slate-100">Fill in the dispatch information below.</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8">
          {status && (
            <div
              className={`rounded-2xl px-4 py-3 text-sm ${
                status.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : status.type === 'error'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-slate-50 text-slate-700 border border-slate-200'
              }`}
            >
              {status.message}
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Dispatched By</span>
              <input
                type="text"
                name="dispatchedBy"
                value={form.dispatchedBy}
                onChange={handleChange}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                placeholder="Enter name"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Department From</span>
              <input
                type="text"
                name="departmentFrom"
                value={form.departmentFrom}
                onChange={handleChange}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                placeholder="Enter department"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-semibold text-slate-700">Items</span>
              <textarea
                name="item"
                rows={4}
                value={form.item}
                onChange={handleChange}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                placeholder="Enter one item name per line"
              />
              <p className="mt-2 text-xs text-slate-500">Each line maps to the Item Name column on the gatepass table.</p>
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-semibold text-slate-700">Tag Numbers</span>
              <textarea
                name="tagNumber"
                rows={4}
                value={form.tagNumber}
                onChange={handleChange}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                placeholder="Enter one tag number per line"
              />
              <p className="mt-2 text-xs text-slate-500">Line 1 maps to item 1, line 2 maps to item 2, and so on.</p>
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-semibold text-slate-700">Serial Numbers</span>
              <textarea
                name="serialNumber"
                rows={4}
                value={form.serialNumber}
                onChange={handleChange}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                placeholder="Enter one serial number per line"
              />
              <p className="mt-2 text-xs text-slate-500">Line 1 maps to item 1, line 2 maps to item 2, and so on.</p>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Date</span>
              <input
                type="date"
                name="dispatchDate"
                value={form.dispatchDate}
                onChange={handleChange}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Destination</span>
              <input
                type="text"
                name="destination"
                value={form.destination}
                onChange={handleChange}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                placeholder="Enter destination"
              />
            </label>

          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="text-sm font-semibold text-slate-700">Reasons for Dispatch</span>
              <textarea
                name="reasons"
                rows={4}
                value={form.reasons}
                onChange={handleChange}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                placeholder="Provide the reason for dispatch"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Authorizing Officer</span>
              <input
                type="text"
                name="authorizingOfficer"
                value={form.authorizingOfficer}
                onChange={handleChange}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                placeholder="Enter authorizing officer"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Confirmation Officer</span>
              <input
                type="text"
                name="confirmationOfficer"
                value={form.confirmationOfficer}
                onChange={handleChange}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                placeholder="Enter confirmation officer"
              />
            </label>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-slate-600">
              {!authLoaded
                ? 'Checking authentication...'
                : user
                ? `Signed in as ${user.email ?? user.uid}`
                : 'Please sign in to save dispatch details.'}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="submit"
                disabled={isSaving || !user}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-7 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Dispatch'}
              </button>

              <LogoutButton className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-7 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-200" />
            </div>
          </div>
        </form>

        {gatepassUrl && (
          <div className="mt-6 flex items-center justify-between gap-3">
            <div className="text-sm text-slate-600">Gatepass generated.</div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={openGatepass}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Open Gatepass
              </button>

              <button
                type="button"
                onClick={downloadGatepass}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Download PDF
              </button>

              <button
                type="button"
                onClick={printGatepass}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Print
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
