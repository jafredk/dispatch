'use client'

import { useEffect, useState } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { onAuthStateChanged, User } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
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
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setAuthLoaded(true)
    })
    return () => unsubscribe()
  }, [])

  // Safe dynamic import to avoid bundler resolving missing modules; CDN fallback
  const safeImport = async (moduleName: string, cdnUrl?: string): Promise<any> => {
    if (typeof window === 'undefined') throw new Error('safeImport only available in browser')
    try {
      // eslint-disable-next-line no-new-func
      const importer = new Function('name', 'return import(name)')
      return await importer(moduleName)
    } catch (err) {
      if (!cdnUrl) throw err
      await new Promise<void>((resolve, reject) => {
        const existing = document.querySelector(`script[data-src="${cdnUrl}"]`)
        if (existing) return resolve()
        const s = document.createElement('script')
        s.setAttribute('data-src', cdnUrl)
        s.src = cdnUrl
        s.onload = () => resolve()
        s.onerror = () => reject(new Error('CDN load failed'))
        document.head.appendChild(s)
      })
      const win: any = window as any
      if (moduleName === 'jspdf') return { jsPDF: win.jspdf?.jsPDF || win.jsPDF || win.jspdf }
      if (moduleName === 'html2canvas') return win.html2canvas
      return null
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

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
  const generateGatepass = async (data: any) => {
    try {
      const jsPdfModule: any = await safeImport('jspdf', 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js')
      const html2canvas: any = (await safeImport('html2canvas', 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js')) || (window as any).html2canvas
      const jsPDF: any = jsPdfModule?.jsPDF || jsPdfModule?.default?.jsPDF || (window as any).jsPDF || jsPdfModule

      // Create a temporary element with gatepass markup
      const container = document.createElement('div')
      container.style.width = '760px'
      container.style.padding = '28px'
      container.style.background = '#ffffff'
      container.style.color = '#111827'
      container.style.fontFamily = 'Arial, Helvetica, sans-serif'
      container.innerHTML = `
        <div style="position:relative;border:2px solid #0f766e;padding:24px 24px 20px;border-radius:14px;background:linear-gradient(180deg,#ffffff 0%,#f9fafb 100%);box-shadow:0 8px 30px rgba(15,23,42,0.08);overflow:hidden;">
          <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;opacity:0.08;font-size:120px;font-weight:800;color:#0f766e;transform:rotate(-25deg);">COOP</div>

          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:2px solid #0f766e;padding-bottom:10px;margin-bottom:14px;">
            <div style="width:58px;height:58px;border-radius:50%;border:2px solid #0f766e;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:#0f766e;background:#ecfeff;">CBK</div>
            <div style="flex:1;text-align:center;">
              <div style="font-size:17px;font-weight:700;color:#0f766e;letter-spacing:1px;">THE CO-OPERATIVE BANK OF KENYA LTD</div>
              <div style="font-size:14px;font-weight:600;margin-top:4px;color:#374151;">GATEPASS / DISPATCH NOTE</div>
            </div>
            <div style="width:58px;height:58px;border-radius:50%;border:2px dashed #0f766e;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#0f766e;text-align:center;line-height:1.1;">OFFICIAL</div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 20px;font-size:13px;line-height:1.45;margin-bottom:10px;">
            <div><strong>Dispatched By:</strong> ${escapeHtml(data.dispatchedBy || '')}</div>
            <div><strong>Department:</strong> ${escapeHtml(data.departmentFrom || '')}</div>
            <div><strong>Serial No:</strong> ${escapeHtml(data.serialNumber || '')}</div>
            <div><strong>Tag No:</strong> ${escapeHtml(data.tagNumber || '')}</div>
            <div><strong>Date:</strong> ${escapeHtml(data.dispatchDate || '')}</div>
            <div><strong>Destination:</strong> ${escapeHtml(data.destination || '')}</div>
          </div>

          <div style="border:1px solid #d1d5db;border-radius:10px;padding:12px 14px;background:#fff;margin:8px 0 10px;">
            <div style="font-size:13px;font-weight:700;color:#111827;margin-bottom:6px;">Item</div>
            <div style="font-size:13px;">${escapeHtml(data.item || '')}</div>
          </div>

          <div style="border:1px solid #d1d5db;border-radius:10px;padding:12px 14px;background:#fff;margin-bottom:10px;">
            <div style="font-size:13px;font-weight:700;color:#111827;margin-bottom:6px;">Reasons for Dispatch</div>
            <div style="font-size:13px;white-space:pre-wrap;">${escapeHtml(data.reasons || '')}</div>
          </div>

          <div style="display:flex;justify-content:space-between;gap:16px;margin-top:12px;border-top:1px dashed #cbd5e1;padding-top:10px;">
            <div style="flex:1;">
              <div style="font-size:13px;font-weight:700;color:#111827;margin-bottom:6px;">Authorizing Officer</div>
              <div style="font-size:13px;">${escapeHtml(data.authorizingOfficer || '')}</div>
            </div>
            <div style="flex:1;">
              <div style="font-size:13px;font-weight:700;color:#111827;margin-bottom:6px;">Confirmation Officer</div>
              <div style="font-size:13px;">${escapeHtml(data.confirmationOfficer || '')}</div>
            </div>
          </div>

          <div style="margin-top:12px;border-top:1px solid #e5e7eb;padding-top:10px;display:flex;justify-content:space-between;align-items:flex-end;font-size:12px;color:#6b7280;">
            <div>Generated electronically • Print-ready gatepass</div>
            <div style="text-align:right;line-height:1.4;">
              <div style="font-weight:700;color:#111827;">Signature</div>
              <div style="width:140px;height:44px;border-top:1px solid #111827;margin-top:6px;"></div>
            </div>
          </div>
        </div>`

      document.body.appendChild(container)

      const canvas = await (html2canvas as any)(container, { scale: 2, useCORS: true })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ unit: 'px', format: 'a4' })
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
    } catch (err) {
      // fallback: open a printable window with HTML
      const html = buildGatepassHtml(data)
      const w = window.open('', '_blank')
      if (w) {
        w.document.write(html)
        w.document.close()
      }
    }
  }

  const buildGatepassHtml = (data: any) => {
    return `<!doctype html><html><head><meta charset="utf-8"><title>Gatepass</title><style>body{font-family:Arial,Helvetica,sans-serif;color:#111827;padding:24px;background:#f8fafc}.card{position:relative;border:2px solid #0f766e;padding:24px;border-radius:14px;background:linear-gradient(180deg,#fff 0%,#f9fafb 100%);max-width:760px;margin:0 auto;box-shadow:0 8px 30px rgba(15,23,42,.08);overflow:hidden}.watermark{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:.08;font-size:120px;font-weight:800;color:#0f766e;transform:rotate(-25deg);pointer-events:none}.header{display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:2px solid #0f766e;padding-bottom:10px;margin-bottom:14px}.logo{width:58px;height:58px;border-radius:50%;border:2px solid #0f766e;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:#0f766e;background:#ecfeff}.title{flex:1;text-align:center}.title1{font-size:17px;font-weight:700;color:#0f766e;letter-spacing:1px}.title2{font-size:14px;font-weight:600;margin-top:4px;color:#374151}.badge{width:58px;height:58px;border-radius:50%;border:2px dashed #0f766e;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#0f766e;text-align:center;line-height:1.1}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 20px;font-size:13px;line-height:1.45}.box{border:1px solid #d1d5db;border-radius:10px;padding:12px 14px;background:#fff;margin:10px 0 12px}.label{font-size:13px;font-weight:700;color:#111827;margin-bottom:6px}.footer{margin-top:12px;border-top:1px solid #e5e7eb;padding-top:10px;display:flex;justify-content:space-between;align-items:flex-end;font-size:12px;color:#6b7280}.signature{width:140px;height:44px;border-top:1px solid #111827;margin-top:6px}</style></head><body><div class="card"><div class="watermark">COOP</div><div class="header"><div class="logo">COOP</div><div class="title"><div class="title1">THE CO-OPERATIVE BANK OF KENYA LTD</div><div class="title2">GATEPASS / DISPATCH NOTE</div></div><div class="badge">OFFICIAL</div></div><div class="grid"><div><strong>Dispatched By:</strong> ${escapeHtml(data.dispatchedBy||'')}</div><div><strong>Department:</strong> ${escapeHtml(data.departmentFrom||'')}</div><div><strong>Serial No:</strong> ${escapeHtml(data.serialNumber||'')}</div><div><strong>Tag No:</strong> ${escapeHtml(data.tagNumber||'')}</div><div><strong>Date:</strong> ${escapeHtml(data.dispatchDate||'')}</div><div><strong>Destination:</strong> ${escapeHtml(data.destination||'')}</div></div><div class="box"><div class="label">Item</div><div>${escapeHtml(data.item||'')}</div></div><div class="box"><div class="label">Reasons for Dispatch</div><div>${escapeHtml(data.reasons||'')}</div></div><div style="display:flex;justify-content:space-between;gap:16px;margin-top:12px;border-top:1px dashed #cbd5e1;padding-top:10px"><div style="flex:1"><div class="label">Authorizing Officer</div><div>${escapeHtml(data.authorizingOfficer||'')}</div></div><div style="flex:1"><div class="label">Confirmation Officer</div><div>${escapeHtml(data.confirmationOfficer||'')}</div></div></div><div class="footer"><div>Generated electronically • Print-ready gatepass</div><div style="text-align:right"><div style="font-weight:700;color:#111827">Signature</div><div class="signature"></div></div></div></div><script>window.onload = ()=>{window.print()}</script></body></html>`
  }

  const escapeHtml = (unsafe: string) => {
    return (unsafe || '').replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&apos;', '"': '&quot;' }[c] as string))
  }

  // cleanup generated object URL on unmount or change
  useEffect(() => {
    return () => {
      if (gatepassUrl) {
        try {
          URL.revokeObjectURL(gatepassUrl)
        } catch {}
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
        } catch (e) {}
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

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Serial Number</span>
              <input
                type="text"
                name="serialNumber"
                value={form.serialNumber}
                onChange={handleChange}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                placeholder="Enter serial number"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Tag Number</span>
              <input
                type="text"
                name="tagNumber"
                value={form.tagNumber}
                onChange={handleChange}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                placeholder="Enter tag number"
              />
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

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Item</span>
              <input
                type="text"
                name="item"
                value={form.item}
                onChange={handleChange}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                placeholder="Enter item"
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
