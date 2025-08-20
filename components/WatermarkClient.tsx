
import React, { useRef, useState } from 'react'
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
      // Optional watermark text with page index
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
      let pngImage
      if (logo) {
        const bytes = Uint8Array.from(atob(logo.split(',')[1]), c => c.charCodeAt(0))
        try {
          pngImage = await pdfDoc.embedPng(bytes)
        } catch (e) {
          console.warn('Logo is not PNG, skipping.')
        }
      }
      let qrImage
      if (qrText.trim().length > 0) {
        const qrDataUrl = await QRCode.toDataURL(qrText, { margin: 0, width: 256 })
        const bytes = Uint8Array.from(atob(qrDataUrl.split(',')[1]), c => c.charCodeAt(0))
        qrImage = await pdfDoc.embedPng(bytes)
      }
      pages.forEach((p, idx) => {
        const { width, height } = p.getSize()
        // Diagonal text watermark (very light so OCR can still read underlying content)
        const text = 'BackdoorDox • Confidential'
        const fontSize = Math.min(width, height) / 18
        p.drawText(text, {
          x: width/2 - (font.widthOfTextAtSize(text, fontSize)/2),
          y: height/2,
          size: fontSize,
          font,
          color: rgb(0.2, 0.2, 0.2),
          rotate: degrees(35),
          opacity: 0.08
        })

        // Bottom-right QR code if provided
        if (qrImage) {
          const w = 64, h = 64
          p.drawImage(qrImage, { x: width - w - 24, y: 24, width: w, height: h, opacity: 0.9 })
        }
        // Top-left logo if provided (small)
        if (pngImage) {
          const w = 120
          const scale = w / pngImage.width
          const h = pngImage.height * scale
          p.drawImage(pngImage, { x: 24, y: height - h - 24, width: w, height: h, opacity: 0.75 })
        }
      })

      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      setResultUrl(url)

      // Upload to server for "Get Secure Link"
      const form = new FormData()
      form.append('file', new Blob([pdfBytes], { type: 'application/pdf' }), files[0].name.replace(/\.pdf$/i, '') + '-watermarked.pdf')
      form.append('ownerId', ownerId)
      if (qrText) form.append('qr', qrText)
      const upload = await fetch('/api/upload', { method: 'POST', body: form })
      if (!upload.ok) throw new Error('Upload failed')
      const data = await upload.json()
      setLinkUrl(data.viewerUrl)

    } catch (e:any) {
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
        <div className="mt-4 flex items-center gap-3">
          <button disabled={!files || busy} onClick={process} className="btn btn-primary">{busy ? 'Processing…' : 'Watermark & Upload'}</button>
          {resultUrl && <a className="btn btn-outline" href={resultUrl} download>Download Watermarked PDF</a>}
          {linkUrl && <a className="btn btn-outline" href={linkUrl} target="_blank" rel="noreferrer">Get Secure Link</a>}
        </div>
      </div>
    </div>
  )
}
