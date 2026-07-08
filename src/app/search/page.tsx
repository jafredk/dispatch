'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { collection, getDocs } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { safeImport } from '@/lib/gatepass'
import LogoutButton from '@/components/LogoutButton'

interface DispatchRecord {
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
  createdByEmail: string | null
}

const searchFields = [
  { key: 'dispatchedBy', label: 'Dispatched By' },
  { key: 'departmentFrom', label: 'Department' },
  { key: 'serialNumber', label: 'Serial Number' },
  { key: 'tagNumber', label: 'Tag Number' },
  { key: 'destination', label: 'Destination' },
  { key: 'item', label: 'Item' }
]

export default function SearchPage() {
  const [searchKey, setSearchKey] = useState('dispatchedBy')
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<DispatchRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<DispatchRecord | null>(null)
  const [gatepassUrl, setGatepassUrl] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [isPdfZoomed, setIsPdfZoomed] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (!auth) {
      return
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/login')
      }
    })
    return () => unsubscribe()
  }, [router])

  const fetchDispatches = async () => {
    if (!db) {
      setResults([])
      setSelectedRecord(null)
      return
    }
    if (!searchTerm.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const snapshot = await getDocs(collection(db, 'dispatches'))
      const data: DispatchRecord[] = []
      snapshot.forEach((doc) => {
        const docData = doc.data() as Omit<DispatchRecord, 'id'>
        data.push({ id: doc.id, ...docData })
      })

      const filtered = data.filter((record) => {
        const value = String((record[searchKey as keyof DispatchRecord] ?? '')).toLowerCase()
        return value.includes(searchTerm.toLowerCase().trim())
      })
      setResults(filtered)
      setSelectedRecord(filtered[0] ?? null)
      if (filtered[0]) {
        generateGatepassPdf(filtered[0])
      } else {
        setGatepassUrl(null)
      }
    } catch (err) {
      console.error('Search error:', err)
      setResults([])
      setSelectedRecord(null)
    } finally {
      setLoading(false)
    }
  }

  const generateGatepassPdf = async (record: DispatchRecord) => {
    setPdfLoading(true)
    try {
      const jsPdfModule = await safeImport('jspdf', 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js')
      const html2canvas = (await safeImport('html2canvas', 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js')) || (window as unknown as Record<string, unknown>).html2canvas
      const jsPDF = (jsPdfModule as Record<string, unknown>)?.jsPDF || ((jsPdfModule as Record<string, unknown>)?.default as Record<string, unknown>)?.jsPDF || (window as unknown as Record<string, unknown>).jsPDF || jsPdfModule
      const htmlString = buildGatepassHtml(record)
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

      const canvas = await (html2canvas as (el: HTMLElement, opts: Record<string, unknown>) => Promise<HTMLCanvasElement>)(container, { scale: 1.35, useCORS: true })
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
      if (gatepassUrl) {
        URL.revokeObjectURL(gatepassUrl)
      }
      const url = URL.createObjectURL(blob)
      setGatepassUrl(url)
      document.body.removeChild(container)
    } catch (err) {
      console.error('PDF generation failed:', err)
      if (gatepassUrl) {
        URL.revokeObjectURL(gatepassUrl)
      }
      setGatepassUrl(null)
    } finally {
      setPdfLoading(false)
    }
  }

  const handleSelect = (record: DispatchRecord) => {
    setSelectedRecord(record)
    generateGatepassPdf(record)
  }

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
        } catch (err) {
          console.error('Print error:', err)
        }
      }
    }
  }

  const closeZoom = () => setIsPdfZoomed(false)

  useEffect(() => {
    return () => {
      if (gatepassUrl) {
        URL.revokeObjectURL(gatepassUrl)
      }
    }
  }, [gatepassUrl])

  const matchingText = useMemo(() => {
    return `${searchFields.find((field) => field.key === searchKey)?.label || ''}`
  }, [searchKey])

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-3xl border border-slate-200 bg-green-900 p-6 text-center text-white shadow-sm">
          <p className="text-sm uppercase tracking-[0.4em] text-slate-100">The Co-operative Bank of Kenya Ltd</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">Search Dispatch Records</h1>
          <p className="mt-2 text-slate-100">Search by dispatch field and view the gatepass for matched items.</p>
        </header>

        <div className="rounded-3xl bg-white p-8 shadow-lg shadow-slate-200/50">
          <div className="grid gap-6 md:grid-cols-3 mb-6">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Search field</span>
              <select
                value={searchKey}
                onChange={(e) => setSearchKey(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >
                {searchFields.map((field) => (
                  <option key={field.key} value={field.key}>
                    {field.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-semibold text-slate-700">Search term</span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Search by ${matchingText}`}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </label>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={fetchDispatches}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
            <LogoutButton className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100" />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Search Results</h2>
              {results.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
                  Enter a search term and click Search to view results.
                </div>
              ) : (
                <div className="space-y-3">
                  {results.map((record) => (
                    <button
                      key={record.id}
                      onClick={() => handleSelect(record)}
                      className={`w-full text-left rounded-2xl border px-4 py-3 transition ${
                        selectedRecord?.id === record.id
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{record.item || 'No item name'}</div>
                          <div className="text-xs text-slate-500">{record.dispatchDate || 'No date'}</div>
                        </div>
                        <div className="text-xs text-slate-500">{record[searchKey as keyof DispatchRecord]}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Gatepass Preview</h2>
              {!selectedRecord ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
                  Select a dispatch result to preview its gatepass here.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-800">
                    <div className="mb-3 text-sm text-slate-500">Selected Dispatch</div>
                    <div className="grid gap-2 text-sm text-slate-700">
                      <div><strong>Dispatched By:</strong> {selectedRecord.dispatchedBy}</div>
                      <div><strong>Department:</strong> {selectedRecord.departmentFrom}</div>
                      <div><strong>Serial No:</strong> {selectedRecord.serialNumber}</div>
                      <div><strong>Tag No:</strong> {selectedRecord.tagNumber}</div>
                      <div><strong>Date:</strong> {selectedRecord.dispatchDate}</div>
                    </div>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">PDF Preview</p>
                        <p className="text-xs text-slate-500">Rendered from the selected dispatch gatepass.</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={openGatepass}
                          disabled={!gatepassUrl}
                          className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Open PDF
                        </button>
                        <button
                          type="button"
                          onClick={downloadGatepass}
                          disabled={!gatepassUrl}
                          className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-900 transition hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Download PDF
                        </button>
                        <button
                          type="button"
                          onClick={printGatepass}
                          disabled={!gatepassUrl}
                          className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-900 transition hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Print PDF
                        </button>
                      </div>
                    </div>

                    {pdfLoading ? (
                      <div className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">Generating PDF preview…</div>
                    ) : gatepassUrl ? (
                      <div>
                        <button
                          type="button"
                          onClick={() => setIsPdfZoomed(true)}
                          className="w-full overflow-hidden rounded-3xl border border-slate-200 bg-white text-left transition hover:border-slate-400"
                        >
                          <div className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500">Click preview to magnify</div>
                          <iframe
                            src={gatepassUrl}
                            className="h-[260px] w-full pointer-events-none"
                            title="Gatepass PDF Preview"
                          />
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">PDF preview will appear once a dispatch is selected.</div>
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      {isPdfZoomed && gatepassUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={closeZoom}
        >
          <div
            className="w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-900">Gatepass PDF (Magnified)</h3>
              <button
                type="button"
                onClick={closeZoom}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Close
              </button>
            </div>
            <iframe
              src={gatepassUrl}
              className="h-[80vh] w-full"
              title="Gatepass PDF Magnified"
            />
          </div>
        </div>
      )}
    </main>
  )
}

const buildGatepassHtml = (record: DispatchRecord) => {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Gatepass</title><style>body{font-family:Arial,Helvetica,sans-serif;color:#111827;padding:24px;background:#f8fafc}.card{position:relative;border:2px solid #0f766e;padding:24px;border-radius:14px;background:linear-gradient(180deg,#fff 0%,#f9fafb 100%);max-width:760px;margin:0 auto;box-shadow:0 8px 30px rgba(15,23,42,.08);overflow:hidden}.watermark{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:.08;font-size:120px;font-weight:800;color:#0f766e;transform:rotate(-25deg);pointer-events:none}.header{display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:2px solid #0f766e;padding-bottom:10px;margin-bottom:14px}.logo{width:58px;height:58px;border-radius:50%;border:2px solid #0f766e;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:#0f766e;background:#ecfeff}.title{flex:1;text-align:center}.title1{font-size:17px;font-weight:700;color:#0f766e;letter-spacing:1px}.title2{font-size:14px;font-weight:600;margin-top:4px;color:#374151}.badge{width:58px;height:58px;border-radius:50%;border:2px dashed #0f766e;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#0f766e;text-align:center;line-height:1.1}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 20px;font-size:13px;line-height:1.45}.box{border:1px solid #d1d5db;border-radius:10px;padding:12px 14px;background:#fff;margin:10px 0 12px}.label{font-size:13px;font-weight:700;color:#111827;margin-bottom:6px}.footer{margin-top:12px;border-top:1px solid #e5e7eb;padding-top:10px;display:flex;justify-content:space-between;align-items:flex-end;font-size:12px;color:#6b7280}.signature{width:140px;height:44px;border-top:1px solid #111827;margin-top:6px}</style></head><body><div class="card"><div class="watermark">COOP</div><div class="header"><div class="logo">COOP</div><div class="title"><div class="title1">THE CO-OPERATIVE BANK OF KENYA LTD</div><div class="title2">GATEPASS / DISPATCH NOTE</div></div><div class="badge">OFFICIAL</div></div><div class="grid"><div><strong>Dispatched By:</strong> ${record.dispatchedBy}</div><div><strong>Department:</strong> ${record.departmentFrom}</div><div><strong>Serial No:</strong> ${record.serialNumber}</div><div><strong>Tag No:</strong> ${record.tagNumber}</div><div><strong>Date:</strong> ${record.dispatchDate}</div><div><strong>Destination:</strong> ${record.destination}</div></div><div class="box"><div class="label">Item</div><div>${record.item}</div></div><div class="box"><div class="label">Reasons for Dispatch</div><div>${record.reasons}</div></div><div style="display:flex;justify-content:space-between;gap:16px;margin-top:12px;border-top:1px dashed #cbd5e1;padding-top:10px"><div style="flex:1"><div class="label">Authorizing Officer</div><div>${record.authorizingOfficer}</div></div><div style="flex:1"><div class="label">Confirmation Officer</div><div>${record.confirmationOfficer}</div></div></div><div class="footer"><div>Generated electronically • Print-ready gatepass</div><div style="text-align:right"><div style="font-weight:700;color:#111827">Signature</div><div class="signature"></div></div></div></div><script>window.onload = ()=>{window.print()}</script></body></html>`
}
