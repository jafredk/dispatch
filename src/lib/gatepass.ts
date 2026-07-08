/**
 * Shared gatepass generation utilities for PDF and HTML creation
 */

export const escapeHtml = (unsafe: unknown) => {
  const str = String(unsafe || '')
  return str.replace(/[&<>'"]/g, (c) =>
    ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&apos;',
      '"': '&quot;'
    }[c] as string)
  )
}

export const normalizeItems = (value: unknown) => {
  const raw = String(value || '')
  return raw
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export const normalizeItemEntries = (
  itemValue: unknown,
  tagValue?: unknown,
  serialValue?: unknown
) => {
  const itemLines = normalizeItems(itemValue)
  const tagLines = normalizeItems(tagValue)
  const serialLines = normalizeItems(serialValue)
  const hasSeparateColumns = tagLines.length > 0 || serialLines.length > 0

  if (hasSeparateColumns) {
    const rowCount = Math.max(itemLines.length, tagLines.length, serialLines.length)
    return Array.from({ length: rowCount }, (_, index) => ({
      name: itemLines[index] || '',
      tagNumber: tagLines[index] || '',
      serialNumber: serialLines[index] || ''
    })).filter((item) => item.name || item.tagNumber || item.serialNumber)
  }

  return itemLines.map((item) => {
    const parts = item.split(/\s*\|\s*/).map((part) => part.trim())
    return {
      name: parts[0] || '',
      tagNumber: parts[1] || '',
      serialNumber: parts[2] || ''
    }
  })
}

export const renderItemsHtml = (
  itemValue: unknown,
  tagValue?: unknown,
  serialValue?: unknown
) => {
  const items = normalizeItemEntries(itemValue, tagValue, serialValue)
  if (!items.length) {
    return '<div style="font-size:13px;">No items listed</div>'
  }

  return `
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead>
        <tr style="background:#f8fafc;">
          <th style="border:1px solid #d1d5db;padding:8px 10px;text-align:left;font-size:12px;letter-spacing:.02em;text-transform:uppercase;">Item Name</th>
          <th style="border:1px solid #d1d5db;padding:8px 10px;text-align:left;font-size:12px;letter-spacing:.02em;text-transform:uppercase;">Tag Number</th>
          <th style="border:1px solid #d1d5db;padding:8px 10px;text-align:left;font-size:12px;letter-spacing:.02em;text-transform:uppercase;">Serial Number</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (item) => `
              <tr>
                <td style="border:1px solid #d1d5db;padding:8px 10px;vertical-align:top;">${escapeHtml(item.name || '—')}</td>
                <td style="border:1px solid #d1d5db;padding:8px 10px;vertical-align:top;">${escapeHtml(item.tagNumber || '—')}</td>
                <td style="border:1px solid #d1d5db;padding:8px 10px;vertical-align:top;">${escapeHtml(item.serialNumber || '—')}</td>
              </tr>
            `
          )
          .join('')}
      </tbody>
    </table>`
}

export const buildGatepassHtml = (data: Record<string, unknown>) => {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Gatepass</title><style>body{font-family:Arial,Helvetica,sans-serif;color:#111827;padding:24px;background:#f8fafc}.card{position:relative;border:2px solid #0f766e;padding:24px;border-radius:14px;background:linear-gradient(180deg,#fff 0%,#f9fafb 100%);max-width:760px;margin:0 auto;box-shadow:0 8px 30px rgba(15,23,42,.08);overflow:hidden}.watermark{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:.08;font-size:120px;font-weight:800;color:#0f766e;transform:rotate(-25deg);pointer-events:none}.header{display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:2px solid #0f766e;padding-bottom:10px;margin-bottom:14px}.logo{width:58px;height:58px;border-radius:50%;border:2px solid #0f766e;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:#0f766e;background:#ecfeff}.title{flex:1;text-align:center}.title1{font-size:17px;font-weight:700;color:#0f766e;letter-spacing:1px}.title2{font-size:14px;font-weight:600;margin-top:4px;color:#374151}.badge{width:58px;height:58px;border-radius:50%;border:2px dashed #0f766e;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#0f766e;text-align:center;line-height:1.1}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 20px;font-size:13px;line-height:1.45}.box{border:1px solid #d1d5db;border-radius:10px;padding:12px 14px;background:#fff;margin:10px 0 12px}.label{font-size:13px;font-weight:700;color:#111827;margin-bottom:6px}.footer{margin-top:12px;border-top:1px solid #e5e7eb;padding-top:10px;display:flex;justify-content:space-between;align-items:flex-end;font-size:12px;color:#6b7280}</style></head><body><div class="card"><div class="watermark">COOP</div><div class="header"><div class="logo">CBK</div><div class="title"><div class="title1">THE CO-OPERATIVE BANK OF KENYA LTD</div><div class="title2">GATEPASS / DISPATCH NOTE</div></div><div class="badge">OFFICIAL</div></div><div class="grid"><div><strong>Dispatched By:</strong> ${escapeHtml(String(data.dispatchedBy || ''))}</div><div><strong>Department:</strong> ${escapeHtml(String(data.departmentFrom || ''))}</div><div><strong>Date:</strong> ${escapeHtml(String(data.dispatchDate || ''))}</div><div><strong>Destination:</strong> ${escapeHtml(String(data.destination || ''))}</div></div><div class="box"><div class="label">Items</div><div>${renderItemsHtml(data.item)}</div></div><div class="box"><div class="label">Reasons for Dispatch</div><div style="white-space:pre-wrap;">${escapeHtml(String(data.reasons || ''))}</div></div><div style="display:flex;justify-content:space-between;gap:16px;margin-top:12px;border-top:1px dashed #cbd5e1;padding-top:10px;"><div style="flex:1;"><div class="label">Authorizing Officer</div><div>${escapeHtml(String(data.authorizingOfficer || ''))}</div><div style="margin-top:10px;line-height:1.4;"><div style="font-size:12px;font-weight:700;color:#111827;">Signature</div><div style="width:160px;height:38px;border-top:1px solid #111827;margin-top:6px;"></div></div></div><div style="flex:1;"><div class="label">Confirmation Officer</div><div>${escapeHtml(String(data.confirmationOfficer || ''))}</div><div style="margin-top:10px;line-height:1.4;"><div style="font-size:12px;font-weight:700;color:#111827;">Signature</div><div style="width:160px;height:38px;border-top:1px solid #111827;margin-top:6px;"></div></div></div></div><div class="footer"><div>Generated electronically • Print-ready gatepass</div></div></div></body></html>`
  return `<!doctype html><html><head><meta charset="utf-8"><title>Gatepass</title><style>body{font-family:Arial,Helvetica,sans-serif;color:#111827;padding:24px;background:#f8fafc}.card{position:relative;border:2px solid #0f766e;padding:24px;border-radius:14px;background:linear-gradient(180deg,#fff 0%,#f9fafb 100%);max-width:760px;margin:0 auto;box-shadow:0 8px 30px rgba(15,23,42,.08);overflow:hidden}.watermark{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:.08;font-size:120px;font-weight:800;color:#0f766e;transform:rotate(-25deg);pointer-events:none}.header{display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:2px solid #0f766e;padding-bottom:10px;margin-bottom:14px}.logo{width:58px;height:58px;border-radius:50%;border:2px solid #0f766e;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:#0f766e;background:#ecfeff}.title{flex:1;text-align:center}.title1{font-size:17px;font-weight:700;color:#0f766e;letter-spacing:1px}.title2{font-size:14px;font-weight:600;margin-top:4px;color:#374151}.badge{width:58px;height:58px;border-radius:50%;border:2px dashed #0f766e;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#0f766e;text-align:center;line-height:1.1}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 20px;font-size:13px;line-height:1.45}.box{border:1px solid #d1d5db;border-radius:10px;padding:12px 14px;background:#fff;margin:10px 0 12px}.label{font-size:13px;font-weight:700;color:#111827;margin-bottom:6px}.footer{margin-top:12px;border-top:1px solid #e5e7eb;padding-top:10px;display:flex;justify-content:space-between;align-items:flex-end;font-size:12px;color:#6b7280}</style></head><body><div class="card"><div class="watermark">COOP</div><div class="header"><div class="logo">CBK</div><div class="title"><div class="title1">THE CO-OPERATIVE BANK OF KENYA LTD</div><div class="title2">GATEPASS / DISPATCH NOTE</div></div><div class="badge">OFFICIAL</div></div><div class="grid"><div><strong>Dispatched By:</strong> ${escapeHtml(String(data.dispatchedBy || ''))}</div><div><strong>Department:</strong> ${escapeHtml(String(data.departmentFrom || ''))}</div><div><strong>Date:</strong> ${escapeHtml(String(data.dispatchDate || ''))}</div><div><strong>Destination:</strong> ${escapeHtml(String(data.destination || ''))}</div></div><div class="box"><div class="label">Items</div><div>${renderItemsHtml(data.item, data.tagNumber, data.serialNumber)}</div></div><div class="box"><div class="label">Reasons for Dispatch</div><div style="white-space:pre-wrap;">${escapeHtml(String(data.reasons || ''))}</div></div><div style="display:flex;justify-content:space-between;gap:16px;margin-top:12px;border-top:1px dashed #cbd5e1;padding-top:10px;"><div style="flex:1;"><div class="label">Authorizing Officer</div><div>${escapeHtml(String(data.authorizingOfficer || ''))}</div><div style="margin-top:10px;line-height:1.4;"><div style="font-size:12px;font-weight:700;color:#111827;">Signature</div><div style="width:160px;height:38px;border-top:1px solid #111827;margin-top:6px;"></div></div></div><div style="flex:1;"><div class="label">Confirmation Officer</div><div>${escapeHtml(String(data.confirmationOfficer || ''))}</div><div style="margin-top:10px;line-height:1.4;"><div style="font-size:12px;font-weight:700;color:#111827;">Signature</div><div style="width:160px;height:38px;border-top:1px solid #111827;margin-top:6px;"></div></div></div></div><div class="footer"><div>Generated electronically • Print-ready gatepass</div></div></div></body></html>`
}

export const safeImport = async (
  moduleName: string,
  cdnUrl?: string
): Promise<unknown> => {
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
      const win = window as unknown as Record<string, unknown>
      return { jsPDF: (win.jspdf as Record<string, unknown>)?.jsPDF || (win.jsPDF as unknown) || (win.jspdf as unknown) }
    }
    if (moduleName === 'html2canvas') {
      const win = window as unknown as Record<string, unknown>
      return win.html2canvas
    }
    return null
  }
}

export const generateGatepassPdf = async (
  record: Record<string, unknown>
): Promise<string | null> => {
  try {
    const jsPdfModule = await safeImport(
      'jspdf',
      'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'
    )
    const html2canvas =
      (await safeImport(
        'html2canvas',
        'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js'
      )) || (window as unknown as Record<string, unknown>).html2canvas
    const jsPDF =
      (jsPdfModule as Record<string, unknown>)?.jsPDF ||
      ((jsPdfModule as Record<string, unknown>)?.default as Record<string, unknown>)?.jsPDF ||
      (window as unknown as Record<string, unknown>).jsPDF ||
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

    const canvas = await (html2canvas as (el: HTMLElement, opts: Record<string, unknown>) => Promise<HTMLCanvasElement>)(container, {
      scale: 2,
      useCORS: true
    })
    const imgData = canvas.toDataURL('image/png')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdf = new (jsPDF as any)({ unit: 'px', format: 'a4' })
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
