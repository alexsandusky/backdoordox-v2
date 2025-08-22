import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import useDeviceFingerprint from '../../components/DeviceFingerprint'
import type { GetServerSideProps } from 'next'

const FREE_DOMAINS = ['gmail.com','yahoo.com','hotmail.com','outlook.com','aol.com','icloud.com','proton.me','protonmail.com','pm.me','zoho.com','gmx.com']

type Diag = {
  ok: boolean
  storage?: string
  filename?: string
  size?: number
  hasRange?: boolean
  headers?: Record<string, string>
  source?: 'blob' | 'tmp'
  error?: string
}

class ViewerErrorBoundary extends React.Component<
  React.PropsWithChildren<{ fileUrl: string; debug?: boolean; debugOpen?: boolean }>,
  { hasError: boolean; debug: boolean; debugOpen: boolean; diag: Diag | null; diagStatus: number | null }
> {
  constructor(props: React.PropsWithChildren<{ fileUrl: string; debug?: boolean; debugOpen?: boolean }>) {
    super(props)
    this.state = { hasError: false, debug: !!props.debug, debugOpen: !!props.debugOpen, diag: null, diagStatus: null }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    console.error(error, errorInfo)
    if (this.state.debug) {
      this.fetchDiagnostics()
    }
  }
  async fetchDiagnostics() {
    const m = this.props.fileUrl.match(/\/api\/stream\/([^?]+)/)
    const id = m ? m[1] : ''
    if (!id) return
    try {
      const res = await fetch(`/api/stream/meta?id=${id}`)
      const data = (await res.json()) as Diag
      this.setState({ diagStatus: res.status, diag: data })
    } catch {
      // ignore
    }
  }
  render() {
    if (this.state.hasError) {
      const { fileUrl } = this.props
      return (
        <div className="container py-6">
          <div className="card text-center">
            <div className="text-red-600 mb-2">Viewer failed to load.</div>
            <div className="flex items-center justify-center gap-4">
              <button
                className="link"
                onClick={() => {
                  if (typeof window !== 'undefined') window.location.reload()
                }}
              >
                Retry
              </button>
              <button
                className="link"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.open(fileUrl, '_blank', 'noopener')
                  }
                }}
              >
                Open Securely
              </button>
            </div>
            {this.state.debug && (
              <details className="mt-4 text-xs" open={this.state.debugOpen}>
                <summary className="cursor-pointer select-none">Diagnostics</summary>
                {this.state.diag ? (
                  <div className="mt-2">
                    <table className="border-collapse text-left">
                      <tbody>
                        <tr><td className="pr-2">status</td><td>{this.state.diagStatus ?? 'unknown'}</td></tr>
                        <tr><td className="pr-2">ok</td><td>{String(this.state.diag.ok)}</td></tr>
                        {this.state.diag.storage && <tr><td className="pr-2">storage</td><td>{this.state.diag.storage}</td></tr>}
                        {this.state.diag.filename && <tr><td className="pr-2">filename</td><td>{this.state.diag.filename}</td></tr>}
                        {typeof this.state.diag.size === 'number' && <tr><td className="pr-2">size</td><td>{this.state.diag.size}</td></tr>}
                        {typeof this.state.diag.hasRange === 'boolean' && <tr><td className="pr-2">hasRange</td><td>{String(this.state.diag.hasRange)}</td></tr>}
                        {this.state.diag?.headers && (
                          <>
                            {['Content-Type','Content-Disposition','Cache-Control','X-Frame-Options','Accept-Ranges','Content-Length'].map(h => (
                              <tr key={h}><td className="pr-2">{h}</td><td>{this.state.diag?.headers?.[h]}</td></tr>
                            ))}
                          </>
                        )}
                        {this.state.diag.error && <tr><td className="pr-2">error</td><td className="text-red-600">{this.state.diag.error}</td></tr>}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="mt-2">Loading…</div>
                )}
              </details>
            )}
          </div>
        </div>
      )
    }
    const child = React.Children.only(this.props.children) as React.ReactElement<{ debugOpen: boolean }>
    return React.cloneElement(child, { debugOpen: this.state.debugOpen })
  }
}

function ViewerInner({ id, fileUrl, debugOpen }: { id: string; fileUrl: string; debugOpen: boolean }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [allowed, setAllowed] = useState(false)
  type LinkMeta = { filename: string; expiresAt?: number; lender?: string }
  const [meta, setMeta] = useState<LinkMeta | null>(null)
  const [diag, setDiag] = useState<Diag | null>(null)
  const [diagStatus, setDiagStatus] = useState<number | null>(null)
  const [debugOpenState, setDebugOpen] = useState(debugOpen)
  const [streamError, setStreamError] = useState('')
  const [streamReady, setStreamReady] = useState(false)
  const [inlineFailed, setInlineFailed] = useState(false)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const fp = useDeviceFingerprint()

  useEffect(() => {
    if (!id) return
    fetch('/api/get-link?id=' + id)
      .then(r => r.json() as Promise<LinkMeta>)
      .then(setMeta)
      .catch(() => {})
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

  useEffect(() => {
    if (!allowed) return
    fetch(`/api/stream/meta?id=${id}`)
      .then(async r => {
        setDiagStatus(r.status)
        const data = (await r.json()) as Diag
        setDiag(data)
      })
      .catch(() => {})
  }, [allowed, id])

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

  const cannotEmbed = inlineFailed || (diag && diag.ok === false)

  return (
    <div className="container py-6">
      <div className="card">
        <div className="mb-3 flex items-center justify-between text-sm text-gray-600">
          <div>Viewing: <span className="font-medium">{meta.filename}</span></div>
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
        <div className="w-full overflow-auto">
          {!cannotEmbed ? (
            <iframe
              ref={frameRef}
              src={fileUrl}
              className="w-full min-h-[72vh] rounded-xl border"
              onError={() => setInlineFailed(true)}
              onLoad={() => {
                if (typeof window === 'undefined') return
                window.setTimeout(() => {
                  const iframe = frameRef.current
                  if (!iframe) return
                  try {
                    if ((iframe.contentWindow?.length || 0) === 0) {
                      setInlineFailed(true)
                    }
                  } catch {
                    setInlineFailed(true)
                  }
                }, 800)
              }}
            />
          ) : (
            <div className="flex items-center justify-between p-2 text-sm bg-gray-50 border rounded">
              <span>Inline viewer failed. Use Open Securely to view in a new tab.</span>
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
        <details className="mt-3 text-xs" open={debugOpenState}>
          <summary className="cursor-pointer select-none">Diagnostics</summary>
          {diag ? (
            <div className="mt-2">
              <table className="border-collapse text-left">
                <tbody>
                  <tr><td className="pr-2">status</td><td>{diagStatus ?? 'unknown'}</td></tr>
                  <tr><td className="pr-2">ok</td><td>{String(diag.ok)}</td></tr>
                  {diag.storage && <tr><td className="pr-2">storage</td><td>{diag.storage}</td></tr>}
                  {diag.filename && <tr><td className="pr-2">filename</td><td>{diag.filename}</td></tr>}
                  {typeof diag.size === 'number' && <tr><td className="pr-2">size</td><td>{diag.size}</td></tr>}
                  {typeof diag.hasRange === 'boolean' && <tr><td className="pr-2">hasRange</td><td>{String(diag.hasRange)}</td></tr>}
                  {diag.headers && (
                    <>
                      {['Content-Type','Content-Disposition','Cache-Control','X-Frame-Options','Accept-Ranges','Content-Length'].map(h => (
                        <tr key={h}><td className="pr-2">{h}</td><td>{diag.headers?.[h]}</td></tr>
                      ))}
                    </>
                  )}
                  {diag.error && <tr><td className="pr-2">error</td><td className="text-red-600">{diag.error}</td></tr>}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-2">Loading…</div>
          )}
        </details>
        <div className="hint mt-3">Downloading disabled in viewer. All access is logged.</div>
      </div>
    </div>
  )
}

export default function ViewerGate() {
  const router = useRouter()
  const rawId = router.query.id
  const id = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : ''
  if (!id) {
    return (
      <div className="container py-10">
        <div className="card text-center">
          <div className="mb-4">Invalid document link.</div>
          <a href="/" className="link">Go back</a>
        </div>
      </div>
    )
  }
  const fileUrl = `/api/stream/${id}`
  const debug = router.query.debug === '1'
  return (
    <ViewerErrorBoundary fileUrl={fileUrl} debug={debug} debugOpen={debug}>
      <ViewerInner id={id} fileUrl={fileUrl} debugOpen={debug} />
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

