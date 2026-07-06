/**
 * Shared gatepass generation utilities for PDF and HTML creation
 */

export const escapeHtml = (unsafe: string) => {
  return (unsafe || '').replace(/[&<>'"]/g, (c) =>
    ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&apos;',
      '"': '&quot;'
    }[c] as string)
  )
}

export const buildGatepassHtml = (data: any) => {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Gatepass</title><style>body{font-family:Arial,Helvetica,sans-serif;color:#111827;padding:24px;background:#f8fafc}.card{position:relative;border:2px solid #0f766e;padding:24px;border-radius:14px;background:linear-gradient(180deg,#fff 0%,#f9fafb 100%);max-width:760px;margin:0 auto;box-shadow:0 8px 30px rgba(15,23,42,.08);overflow:hidden}.watermark{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:.08;font-size:120px;font-weight:800;color:#0f766e;transform:rotate(-25deg);pointer-events:none}.header{display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:2px solid #0f766e;padding-bottom:10px;margin-bottom:14px}.logo{width:58px;height:58px;border-radius:50%;border:2px solid #0f766e;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:#0f766e;background:#ecfeff}.title{flex:1;text-align:center}.title1{font-size:17px;font-weight:700;color:#0f766e;letter-spacing:1px}.title2{font-size:14px;font-weight:600;margin-top:4px;color:#374151}.badge{width:58px;height:58px;border-radius:50%;border:2px dashed #0f766e;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#0f766e;text-align:center;line-height:1.1}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 20px;font-size:13px;line-height:1.45}.box{border:1px solid #d1d5db;border-radius:10px;padding:12px 14px;background:#fff;margin:10px 0 12px}.label{font-size:13px;font-weight:700;color:#111827;margin-bottom:6px}.footer{margin-top:12px;border-top:1px solid #e5e7eb;padding-top:10px;display:flex;justify-content:space-between;align-items:flex-end;font-size:12px;color:#6b7280}.signature{width:140px;height:44px;border-top:1px solid #111827;margin-top:6px}</style></head><body><div class="card"><div class="watermark">COOP</div><div class="header"><div class="logo">CBK</div><div class="title"><div class="title1">THE CO-OPERATIVE BANK OF KENYA LTD</div><div class="title2">GATEPASS / DISPATCH NOTE</div></div><div class="badge">OFFICIAL</div></div><div class="grid"><div><strong>Dispatched By:</strong> ${escapeHtml(data.dispatchedBy || '')}</div><div><strong>Department:</strong> ${escapeHtml(data.departmentFrom || '')}</div><div><strong>Serial No:</strong> ${escapeHtml(data.serialNumber || '')}</div><div><strong>Tag No:</strong> ${escapeHtml(data.tagNumber || '')}</div><div><strong>Date:</strong> ${escapeHtml(data.dispatchDate || '')}</div><div><strong>Destination:</strong> ${escapeHtml(data.destination || '')}</div></div><div class="box"><div class="label">Item</div><div>${escapeHtml(data.item || '')}</div></div><div class="box"><div class="label">Reasons for Dispatch</div><div style="white-space:pre-wrap;">${escapeHtml(data.reasons || '')}</div></div><div style="display:flex;justify-content:space-between;gap:16px;margin-top:12px;border-top:1px dashed #cbd5e1;padding-top:10px;"><div style="flex:1;"><div class="label">Authorizing Officer</div><div>${escapeHtml(data.authorizingOfficer || '')}</div></div><div style="flex:1;"><div class="label">Confirmation Officer</div><div>${escapeHtml(data.confirmationOfficer || '')}</div></div></div><div class="footer"><div>Generated electronically • Print-ready gatepass</div><div style="text-align:right;line-height:1.4;"><div style="font-weight:700;color:#111827;">Signature</div><div class="signature"></div></div></div></div></body></html>`
}

export const safeImport = async (
  moduleName: string,
  cdnUrl?: string
): Promise<any> => {
  if (typeof window === 'undefined')
    throw new Error('safeImport only available in browser')
  try {
    // eslint-disable-next-line no-new-func
    const importer = new Function('name', 'return import(name)')
    return await importer(moduleName)
  } catch (err) {
    if (!cdnUrl) throw err
    // Load from CDN as a fallback
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

    // Resolve common globals for known libraries
    if (moduleName === 'jspdf') {
      const win: any = window as any
      return { jsPDF: win.jspdf?.jsPDF || win.jsPDF || win.jspdf }
    }
    if (moduleName === 'html2canvas') {
      const win: any = window as any
      return win.html2canvas
    }
    return null
  }
}

export const generateGatepassPdf = async (
  record: any
): Promise<string | null> => {
  try {
    const jsPdfModule: any = await safeImport(
      'jspdf',
      'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'
    )
    const html2canvas: any =
      (await safeImport(
        'html2canvas',
        'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js'
      )) || (window as any).html2canvas
    const jsPDF: any =
      jsPdfModule?.jsPDF ||
      jsPdfModule?.default?.jsPDF ||
      (window as any).jsPDF ||
      jsPdfModule

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

    const canvas = await (html2canvas as any)(container, {
      scale: 2,
      useCORS: true
    })
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({ unit: 'px', format: 'a4' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const targetHeight = pageHeight * 0.74
    const scale = Math.min(
      (pageWidth - 60) / canvas.width,
      targetHeight / canvas.height
    )
    const imgWidth = canvas.width * scale
    const imgHeight = canvas.height * scale
    const x = (pageWidth - imgWidth) / 2
    const y = (pageHeight - imgHeight) / 2
    pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight)

    const blob = pdf.output('blob')
    const url = URL.createObjectURL(blob)
    document.body.removeChild(container)
    return url
  } catch (err) {
    console.error('PDF generation failed:', err)
    return null
  }
}
