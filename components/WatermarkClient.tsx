import React, { useState, useRef } from 'react'
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib'
import { Upload, X, Trash2, Download, Link as LinkIcon, Copy } from 'lucide-react'

type Mode = 'image' | 'text' | 'both'
type Position = 'diagonal' | 'bottom-right' | 'top-left' | 'center' | 'footer' | 'tiled'

interface QueueItem {
  file: File
}

interface Settings {
  mode: Mode
  position: Position
  opacity: number
  scale: number
  angle: number
  margin: number
  gap: number
  text: string
  image?: string
}

export default function WatermarkClient() {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [settings, setSettings] = useState<Settings>({
    mode: 'text',
    position: 'diagonal',
    opacity: 0.08,
    scale: 1,
    angle: 45,
    margin: 40,
    gap: 150,
    text: 'BackdoorDox • Confidential',
  })
  const [logs, setLogs] = useState<string[]>([])
  const [linkUrl, setLinkUrl] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const log = (m: string) => setLogs(l => [...l, m])

  const addFiles = (list: FileList) => {
    const items = Array.from(list).filter(f => f.type === 'application/pdf')
    if (items.length === 0) return
    setQueue(q => [...q, ...items.map(file => ({ file }))])
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeItem = (idx: number) => setQueue(q => q.filter((_, i) => i !== idx))
  const clearQueue = () => setQueue([])

  const onImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setSettings(s => ({ ...s, image: reader.result as string }))
    reader.readAsDataURL(file)
  }

  async function watermarkFile(file: File): Promise<Uint8Array> {
    log(`Processing ${file.name}`)
    const array = await file.arrayBuffer()
    const pdfDoc = await PDFDocument.load(array)
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    let embeddedImg: any = null
    if (settings.mode !== 'text' && settings.image) {
      const bytes = Uint8Array.from(atob(settings.image.split(',')[1]), c => c.charCodeAt(0))
      try {
        embeddedImg = await pdfDoc.embedPng(bytes)
      } catch {
        embeddedImg = await pdfDoc.embedJpg(bytes)
      }
    }
    const pages = pdfDoc.getPages()
    pages.forEach(page => {
      const { width, height } = page.getSize()
      const drawAt = (x: number, y: number) => {
        if (settings.mode !== 'image') {
          const fontSize = 24 * settings.scale
          const textWidth = font.widthOfTextAtSize(settings.text, fontSize)
          page.drawText(settings.text, {
            x: x - textWidth / 2,
            y: y - fontSize / 2,
            size: fontSize,
            font,
            color: rgb(0.2, 0.2, 0.2),
            rotate: degrees(settings.angle),
            opacity: settings.opacity,
          })
        }
        if (embeddedImg && settings.mode !== 'text') {
          const scaled = embeddedImg.scale(settings.scale)
          page.drawImage(embeddedImg, {
            x: x - scaled.width / 2,
            y: y - scaled.height / 2,
            width: scaled.width,
            height: scaled.height,
            rotate: degrees(settings.angle),
            opacity: settings.opacity,
          })
        }
      }

      switch (settings.position) {
        case 'diagonal':
          drawAt(width / 2, height / 2)
          break
        case 'bottom-right':
          drawAt(width - settings.margin, settings.margin)
          break
        case 'top-left':
          drawAt(settings.margin, height - settings.margin)
          break
        case 'center':
          drawAt(width / 2, height / 2)
          break
        case 'footer':
          drawAt(width / 2, settings.margin)
          break
        case 'tiled':
          const gap = settings.gap
          const cols = Math.min(50, Math.ceil((width - settings.margin) / gap))
          const rows = Math.min(50, Math.ceil((height - settings.margin) / gap))
          for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
              drawAt(settings.margin + i * gap, settings.margin + j * gap)
            }
          }
          break
      }
    })
    return pdfDoc.save({ useObjectStreams: false, addDefaultPage: false })
  }

  async function downloadAll() {
    setLinkUrl('')
    for (const item of queue) {
      const bytes = await watermarkFile(item.file)
      const blob = new Blob([bytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = item.file.name.replace(/\.pdf$/i, '') + '_watermarked.pdf'
      a.click()
      log(`Downloaded ${a.download}`)
    }
  }

  async function generateLink() {
    if (queue.length === 0) return
    const bytes = await watermarkFile(queue[0].file)
    const form = new FormData()
    form.append(
      'file',
      new Blob([bytes], { type: 'application/pdf' }),
      queue[0].file.name.replace(/\.pdf$/i, '') + '_watermarked.pdf'
    )
    const upload = await fetch('/api/upload', { method: 'POST', body: form })
    if (!upload.ok) {
      log('Upload failed')
      return
    }
    const data = await upload.json()
    setLinkUrl(data.viewerUrl)
    log('Secure link generated')
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-lg font-semibold mb-2">Files</h2>
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          className="border-2 border-dashed rounded p-6 text-center"
        >
          <input
            type="file"
            multiple
            accept="application/pdf"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <p className="mb-2 text-sm flex flex-col items-center gap-2">
            <Upload className="w-5 h-5" />
            Drag & drop PDFs here or
            <button
              type="button"
              className="underline"
              onClick={() => fileInputRef.current?.click()}
            >
              browse
            </button>
          </p>
        </div>
        {queue.length > 0 && (
          <>
            <ul className="mt-4 space-y-2">
              {queue.map((item, idx) => (
                <li key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                  <span className="text-sm truncate">{item.file.name}</span>
                  <button onClick={() => removeItem(idx)} className="text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
            <button onClick={clearQueue} className="btn btn-outline mt-2 flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Clear
            </button>
          </>
        )}
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-2">Settings</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Mode</label>
            <select
              className="input"
              value={settings.mode}
              onChange={e => setSettings(s => ({ ...s, mode: e.target.value as Mode }))}
            >
              <option value="text">Text</option>
              <option value="image">Image</option>
              <option value="both">Both</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Position</label>
            <select
              className="input"
              value={settings.position}
              onChange={e => setSettings(s => ({ ...s, position: e.target.value as Position }))}
            >
              <option value="diagonal">Diagonal Center</option>
              <option value="bottom-right">Bottom Right</option>
              <option value="top-left">Top Left</option>
              <option value="center">Center</option>
              <option value="footer">Footer</option>
              <option value="tiled">Tiled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Opacity</label>
            <input
              type="number"
              step="0.05"
              min="0"
              max="1"
              className="input"
              value={settings.opacity}
              onChange={e => setSettings(s => ({ ...s, opacity: parseFloat(e.target.value) }))}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Scale</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              className="input"
              value={settings.scale}
              onChange={e => setSettings(s => ({ ...s, scale: parseFloat(e.target.value) }))}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Angle</label>
            <input
              type="number"
              className="input"
              value={settings.angle}
              onChange={e => setSettings(s => ({ ...s, angle: parseFloat(e.target.value) }))}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Margin</label>
            <input
              type="number"
              className="input"
              value={settings.margin}
              onChange={e => setSettings(s => ({ ...s, margin: parseFloat(e.target.value) }))}
            />
          </div>
          {settings.position === 'tiled' && (
            <div>
              <label className="block text-sm mb-1">Gap</label>
              <input
                type="number"
                className="input"
                value={settings.gap}
                onChange={e => setSettings(s => ({ ...s, gap: parseFloat(e.target.value) }))}
              />
            </div>
          )}
          {settings.mode !== 'image' && (
            <div className="col-span-2">
              <label className="block text-sm mb-1">Text</label>
              <input
                className="input"
                value={settings.text}
                onChange={e => setSettings(s => ({ ...s, text: e.target.value }))}
              />
            </div>
          )}
          {settings.mode !== 'text' && (
            <div className="col-span-2">
              <label className="block text-sm mb-1">Watermark Image</label>
              <input type="file" accept="image/*" onChange={onImageChange} />
              {settings.image && <img src={settings.image} alt="watermark" className="mt-2 w-32 border rounded" />}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-3">
          <button
            className="btn btn-primary flex items-center gap-2"
            disabled={queue.length === 0}
            onClick={downloadAll}
          >
            <Download className="w-4 h-4" /> Download Watermarked PDF(s)
          </button>
          <button
            className="btn btn-outline flex items-center gap-2"
            disabled={queue.length === 0}
            onClick={generateLink}
          >
            <LinkIcon className="w-4 h-4" /> Generate Secure Link
          </button>
        </div>
        {linkUrl && (
          <div className="mt-4 space-y-1">
            <div className="flex gap-2">
              <input className="input flex-1" value={linkUrl} readOnly />
              <button className="btn" onClick={() => navigator.clipboard.writeText(linkUrl)}>
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <div className="hint">Secure link created. Every open will be logged.</div>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-2">Logs</h2>
        <pre className="bg-gray-100 p-2 rounded h-40 overflow-auto text-xs whitespace-pre-wrap">{logs.join('\n')}</pre>
      </div>
    </div>
  )
}

