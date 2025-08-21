
import React, { useState } from 'react'
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib'
import QRCode from 'qrcode'

type Props = {
  ownerId: string
}

function toDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function WatermarkClient({ ownerId }: Props) {
  const [logo, setLogo] = useState<string | null>(typeof window !== 'undefined' ? localStorage.getItem('bdx_logo') : null)
  const [qrText, setQrText] = useState<string>('')
  const [files, setFiles] = useState<FileList | null>(null)
  const [busy, setBusy] = useState(false)
  const [resultUrl, setResultUrl] = useState<string>('')
  const [linkUrl, setLinkUrl] = useState<string>('')
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null)

  const onLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await toDataURL(file)
    setLogo(dataUrl)
    if (typeof window !== 'undefined') localStorage.setItem('bdx_logo', dataUrl)
  }

  async function process() {
    if (!files || files.length === 0) return
    setBusy(true)
    try {
      const reader = await files[0].arrayBuffer()
      const pdfDoc = await PDFDocument.load(reader)
      const pages = pdfDoc.getPages()
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
      let pngImage: any = null
      if (logo) {
        const bytes = Uint8Array.from(atob(logo.split(',')[1]), c => c.charCodeAt(0))
        try {
          pngImage = await pdfDoc.embedPng(bytes)
        } catch {
          console.warn('Logo is not PNG, skipping.')
        }
      }
      let qrImage: any = null
      if (qrText.trim().length > 0) {
        const qrDataUrl = await QRCode.toDataURL(qrText, { margin: 0, width: 256 })
        const bytes = Uint8Array.from(atob(qrDataUrl.split(',')[1]), c => c.charCodeAt(0))
        qrImage = await pdfDoc.embedPng(bytes)
      }
      pages.forEach(p => {
        const { width, height } = p.getSize()
        const text = 'BackdoorDox • Confidential'
        const fontSize = Math.min(width, height) / 18
        p.drawText(text, {
          x: width / 2 - font.widthOfTextAtSize(text, fontSize) / 2,
          y: height / 2,
          size: fontSize,
          font,
          color: rgb(0.2, 0.2, 0.2),
          rotate: degrees(35),
          opacity: 0.08,
        })
        if (qrImage) {
          const w = 64,
            h = 64
          p.drawImage(qrImage, { x: width - w - 24, y: 24, width: w, height: h, opacity: 0.9 })
        }
        if (pngImage) {
          const w = 120
          const scale = w / pngImage.width
          const h = pngImage.height * scale
          p.drawImage(pngImage, { x: 24, y: height - h - 24, width: w, height: h, opacity: 0.75 })
        }
      })

      const bytes = await pdfDoc.save()
      setPdfBytes(bytes)
      const blob = new Blob([bytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      setResultUrl(url)
      setLinkUrl('')
    } catch (e: any) {
      alert('Failed: ' + e.message)
    } finally {
      setBusy(false)
    }
  }

  async function generateLink() {
    if (!pdfBytes || !files) return
    setBusy(true)
    try {
      const form = new FormData()
      form.append('file', new Blob([pdfBytes], { type: 'application/pdf' }), files[0].name.replace(/\.pdf$/i, '') + '-watermarked.pdf')
      form.append('ownerId', ownerId)
      if (qrText) form.append('qr', qrText)
      const upload = await fetch('/api/upload', { method: 'POST', body: form })
      if (!upload.ok) throw new Error('Upload failed')
      const data = await upload.json()
      setLinkUrl(data.viewerUrl)
    } catch (e: any) {
      alert('Failed: ' + e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-lg font-semibold mb-2">1) Stored Logo</h2>
        <p className="hint mb-3">Upload your PNG logo once and we’ll store it in your browser for future sessions.</p>
        <input type="file" accept="image/png" onChange={onLogoSelect} />
        {logo && <div className="mt-3"><img src={logo} alt="logo" className="w-40 rounded border" /></div>}
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-2">2) (Optional) QR Code</h2>
        <p className="hint mb-3">Embed a small QR code on each page (bottom-right). Use it to encode a case ID, link, or lender name.</p>
        <input className="input" placeholder="optional text to encode" value={qrText} onChange={e=>setQrText(e.target.value)} />
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-2">3) Watermark</h2>
        <p className="hint mb-3">Upload PDF (or try images—we’ll pass them as-is in this MVP).</p>
        <input type="file" accept="application/pdf" onChange={e=>setFiles(e.target.files)} />
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <button disabled={!files || busy} onClick={process} className="btn btn-primary">{busy ? 'Processing…' : 'Watermark'}</button>
            {resultUrl && <a className="btn btn-outline" href={resultUrl} download>Download Watermarked PDF</a>}
            {pdfBytes && !linkUrl && <button onClick={generateLink} className="btn btn-outline">Generate Secure Link</button>}
          </div>
          {linkUrl && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <input className="input flex-1" value={linkUrl} readOnly />
                <button className="btn" onClick={() => navigator.clipboard.writeText(linkUrl)}>Copy Link</button>
              </div>
              <div className="hint">Secure link created. Every open will be logged.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
