
import { useRouter } from 'next/router'
import { useEffect, useMemo, useRef, useState } from 'react'
import useDeviceFingerprint from '../../components/DeviceFingerprint'
import type { GetServerSideProps } from 'next'

const FREE_DOMAINS = ['gmail.com','yahoo.com','hotmail.com','outlook.com','aol.com','icloud.com','proton.me','protonmail.com','pm.me','zoho.com','gmx.com']

export default function ViewerGate() {
  const router = useRouter()
  const { id } = router.query as { id: string }
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [allowed, setAllowed] = useState(false)
  const [meta, setMeta] = useState<any>(null)
  const [streamError, setStreamError] = useState('')
  const [streamReady, setStreamReady] = useState(false)
  const [usePdfJs, setUsePdfJs] = useState(false)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const fp = useDeviceFingerprint()

  useEffect(()=>{
    if (!id) return
    fetch('/api/get-link?id=' + id).then(r=>r.json()).then(setMeta).catch(()=>{})
  }, [id])

  const businessDomain = useMemo(() => {
    const m = email.toLowerCase().match(/@([^@]+)$/)
    return m ? m[1] : ''
  }, [email])

  const blockedDomain = email.includes('@') && FREE_DOMAINS.includes(businessDomain)
  const isBusiness = email.includes('@') && !blockedDomain

  async function proceed() {
    if (!isBusiness) {
      setError(blockedDomain ? 'Personal email domains are not allowed.' : 'Please use your business email address.')
      return
    }
    await fetch('/api/log-access', { method:'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ linkId: id, email, fingerprint: fp }) })
    setAllowed(true)
  }

  if (!meta) return <div className="container py-10"><div className="card">Loading…</div></div>

  if (!allowed) return (
    <div className="container py-10">
      <div className="max-w-xl mx-auto card">
        <h1 className="text-2xl font-semibold mb-2">Secure Document Access</h1>
        <div className="p-4 rounded-xl bg-gray-50 border mb-4">
          <div className="font-medium">{meta.filename}</div>
          <div className="text-xs text-gray-500">Expires: {meta.expiresAt ? new Date(meta.expiresAt).toLocaleDateString() : '—'} • Lender: {meta.lender || '—'}</div>
        </div>
          <label className="label">Business Email Address</label>
          <input
            className="input"
            placeholder="your.name@company.com"
            value={email}
            onChange={e => {
              const value = e.target.value
              setEmail(value)
              const m = value.toLowerCase().match(/@([^@]+)$/)
              const d = m ? m[1] : ''
              setError(FREE_DOMAINS.includes(d) ? 'Personal email domains are not allowed.' : '')
            }}
          />
          <div className="hint mt-2">Personal domains (gmail, yahoo, etc.) are blocked.</div>
          {error && <div className="text-sm text-red-600 mt-1">{error}</div>}
          <div className="hint mt-2">Every access attempt is logged — domain, IP, time, and device fingerprint.</div>
          <button onClick={proceed} className="btn btn-primary mt-4">Access Document</button>
        </div>
      </div>
    )

  const fileUrl = `/api/stream?id=${id}`

  useEffect(() => {
    if (!allowed) return
    setStreamError('')
    fetch(fileUrl, { method: 'HEAD' })
      .then(r => {
        if (!r.ok) {
          setStreamError(r.status === 404 ? 'Document not found.' : 'Failed to load document.')
        } else {
          setStreamReady(true)
        }
      })
      .catch(() => setStreamError('Failed to load document.'))
  }, [allowed, fileUrl])

  useEffect(() => {
    if (!streamReady) return
    if ((navigator as any).pdfViewerEnabled === false) {
      setUsePdfJs(true)
    }
  }, [streamReady])

  useEffect(() => {
    if (!usePdfJs) return
    (async () => {
      try {
        const [pdfjs, worker] = await Promise.all([
          import('pdfjs-dist'),
          import('pdfjs-dist/build/pdf.worker.min.js')
        ])
        pdfjs.GlobalWorkerOptions.workerSrc = (worker as any).default
        const resp = await fetch(fileUrl)
        if (!resp.ok) throw new Error('fetch failed')
        const buf = await resp.arrayBuffer()
        const pdf = await pdfjs.getDocument({ data: buf }).promise
        const container = canvasRef.current
        if (!container) return
        container.innerHTML = ''
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const viewport = page.getViewport({ scale: 1.2 })
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          const ctx = canvas.getContext('2d')
          await page.render({ canvasContext: ctx!, viewport }).promise
          container.appendChild(canvas)
        }
      } catch (e) {
        console.error('PDF.js render failed', e)
        setStreamError("We couldn't render the PDF.")
      }
    })()
  }, [usePdfJs, fileUrl])

  if (streamError) {
    return (
      <div className="container py-6">
        <div className="card text-center">
          <div className="text-red-600 mb-2">{streamError}</div>
          <a href="#" onClick={e => { e.preventDefault(); router.reload() }} className="link">Try again</a>
        </div>
      </div>
    )
  }

  if (!streamReady && !usePdfJs) return <div className="container py-10"><div className="card">Loading…</div></div>

  return (
    <div className="container py-6">
      <div className="card">
        <div className="mb-3 text-sm text-gray-600">Viewing: <span className="font-medium">{meta.filename}</span></div>
        <div className="w-full h-[80vh] overflow-auto">
          {usePdfJs ? (
            <div ref={canvasRef} className="w-full h-full overflow-auto" />
          ) : (
            <iframe
              ref={frameRef}
              src={fileUrl + '#toolbar=0&navpanes=0&scrollbar=0'}
              className="w-full h-full rounded-xl border"
              onError={() => {
                console.error('Native PDF viewer failed, falling back to PDF.js')
                setUsePdfJs(true)
              }}
            />
          )}
        </div>
        <div className="hint mt-3">Downloading disabled in viewer. All access is logged.</div>
      </div>
    </div>
  )
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('X-Robots-Tag', 'noindex, nofollow')
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self'")
  return { props: {} }
}
