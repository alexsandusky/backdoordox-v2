
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import useDeviceFingerprint from '../../components/DeviceFingerprint'
import type { GetServerSideProps } from 'next'

const FREE_DOMAINS = ['gmail.com','yahoo.com','hotmail.com','outlook.com','aol.com','icloud.com','proton.me','protonmail.com','pm.me','zoho.com','gmx.com']

class ViewerErrorBoundary extends React.Component<React.PropsWithChildren<{}>, { hasError: boolean }> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    console.error(error, errorInfo)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="container py-6">
          <div className="card text-center">
            <div className="text-red-600 mb-2">Something went wrong.</div>
            <button
              className="link"
              onClick={() => {
                if (typeof window !== 'undefined') window.location.reload()
              }}
            >
              Retry
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function ViewerInner() {
  const router = useRouter()
  const { id } = router.query as { id: string }
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [allowed, setAllowed] = useState(false)
  const [meta, setMeta] = useState<any>(null)
  const [streamError, setStreamError] = useState('')
  const [streamReady, setStreamReady] = useState(false)
  const [embedError, setEmbedError] = useState(false)
  const frameRef = useRef<HTMLIFrameElement>(null)
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
      .then(async r => {
        if (!r.ok) {
          let msg = 'Failed to load document.'
          try {
            const data = await r.json()
            if (data?.error) msg = data.error
          } catch {}
          setStreamError(r.status === 404 ? 'Document not found.' : msg)
        } else {
          setStreamReady(true)
        }
      })
      .catch(() => setStreamError('Failed to load document.'))
  }, [allowed, fileUrl])


  if (streamError) {
    return (
      <div className="container py-6">
        <div className="card text-center">
          <div className="text-red-600 mb-2">{streamError}</div>
          <button
            onClick={() => router.reload()}
            className="link"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!streamReady) return <div className="container py-10"><div className="card">Loading…</div></div>

  return (
    <div className="container py-6">
      <div className="card">
        <div className="mb-3 text-sm text-gray-600">Viewing: <span className="font-medium">{meta.filename}</span></div>
        <div className="w-full h-[80vh] overflow-auto">
          {!embedError ? (
            <iframe
              ref={frameRef}
              src={fileUrl}
              className="w-full h-full rounded-xl border"
              onError={() => setEmbedError(true)}
              onLoad={() => {
                if (typeof window === 'undefined') return
                window.setTimeout(() => {
                  const iframe = frameRef.current
                  if (!iframe) return
                  try {
                    const doc = iframe.contentDocument
                    if (!doc || doc.body?.childElementCount === 0) {
                      setEmbedError(true)
                    }
                  } catch {
                    setEmbedError(true)
                  }
                }, 500)
              }}
            />
          ) : (
            <div className="flex items-center justify-between p-2 text-sm bg-gray-50 border rounded">
              <span>Can’t render inline in this browser. Open the document in a new tab.</span>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.open(fileUrl, '_blank', 'noopener')
                  }
                }}
              >
                Open Securely
              </button>
            </div>
          )}
        </div>
        <div className="hint mt-3">Downloading disabled in viewer. All access is logged.</div>
      </div>
    </div>
  )
}

export default function ViewerGate() {
  return (
    <ViewerErrorBoundary>
      <ViewerInner />
    </ViewerErrorBoundary>
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
