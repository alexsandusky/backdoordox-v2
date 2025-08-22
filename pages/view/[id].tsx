
import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import useDeviceFingerprint from '../../components/DeviceFingerprint'
import DiagnosticsPanel, { Diag } from '../../components/DiagnosticsPanel'
import SecurePdfViewer from '../../components/SecurePdfViewer'
import type { GetServerSideProps } from 'next'

const FREE_DOMAINS = ['gmail.com','yahoo.com','hotmail.com','outlook.com','aol.com','icloud.com','proton.me','protonmail.com','pm.me','zoho.com','gmx.com']

class ViewerErrorBoundary extends React.Component<
  React.PropsWithChildren<{ fileUrl: string; id: string; debug: boolean; debugOpen: boolean }>,
  {
    hasError: boolean
    diag: Diag | null
    diagStatus: number | null
    debug: boolean
    debugOpen: boolean
  }
> {
  constructor(
    props: React.PropsWithChildren<{ fileUrl: string; id: string; debug: boolean; debugOpen: boolean }>,
  ) {
    super(props)
    this.state = {
      hasError: false,
      diag: null,
      diagStatus: null,
      debug: props.debug,
      debugOpen: props.debugOpen,
    }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    console.error(error, errorInfo)
  }
  componentDidMount() {
    if (this.props.debug) {
      this.fetchDiag()
    }
  }

  componentDidUpdate(prevProps: Readonly<{ fileUrl: string; id: string; debug: boolean; debugOpen: boolean }>) {
    if (!prevProps.debug && this.props.debug) {
      this.setState({ debug: this.props.debug, debugOpen: this.props.debugOpen })
      this.fetchDiag()
    }
  }

  private fetchDiag() {
    fetch(`/api/stream/meta?id=${this.props.id}`, { credentials: 'include' })
      .then(async r => {
        const data = (await r.json()) as Diag
        this.setState({ diag: data, diagStatus: r.status })
      })
      .catch(() => {})
  }
  render() {
    if (this.state.hasError) {
      const { fileUrl } = this.props
      return (
        <div className="container py-6">
          <div className="card text-center">
            <div className="text-red-600 mb-2">Viewer failed to load.</div>
            <div className="flex items-center justify-center">
              <button
                className="link"
                onClick={() => {
                  if (typeof window !== 'undefined') window.location.reload()
                }}
              >
                Retry
              </button>
            </div>
            {this.state.debug && (
              <DiagnosticsPanel
                diag={this.state.diag}
                diagStatus={this.state.diagStatus}
                debugOpen={this.state.debugOpen}
              />
            )}
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function ViewerInner({ id, fileUrl }: { id: string; fileUrl: string }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [allowed, setAllowed] = useState(false)
  type LinkMeta = { filename: string; expiresAt?: number; lender?: string }
  const [meta, setMeta] = useState<LinkMeta | null>(null)
  const [diag, setDiag] = useState<Diag | null>(null)
  const [diagStatus, setDiagStatus] = useState<number | null>(null)
  const [debug, setDebug] = useState(false)
  const [debugOpen, setDebugOpen] = useState(false)
  const [streamError, setStreamError] = useState('')
  const [streamReady, setStreamReady] = useState(false)
  const fp = useDeviceFingerprint()

  useEffect(() => {
    if (!id) return
    fetch('/api/get-link?id=' + id, { credentials: 'include' })
      .then(r => r.json() as Promise<LinkMeta>)
      .then(setMeta)
      .catch(() => {})
  }, [id])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    setDebug(params.has('debug'))
    setDebugOpen(params.get('debug') === '1')
  }, [])

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
    await fetch('/api/log-access', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linkId: id, email, fingerprint: fp }),
    })
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
    fetch(fileUrl, { method: 'HEAD', credentials: 'include', headers: { Accept: 'application/pdf' } })
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
    if (!allowed || !debug) return
    fetch(`/api/stream/meta?id=${id}`, { credentials: 'include' })
      .then(async r => {
        setDiagStatus(r.status)
        const data = (await r.json()) as Diag
        setDiag(data)
      })
      .catch(() => {})
  }, [allowed, id, debug])


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
        <div className="mb-3 text-sm text-gray-600">
          Viewing: <span className="font-medium">{meta.filename}</span>
        </div>
        <div className="w-full overflow-auto">
          <SecurePdfViewer src={fileUrl} />
        </div>
        {debug && (
          <DiagnosticsPanel diag={diag} diagStatus={diagStatus} debugOpen={debugOpen} />
        )}
        <div className="hint mt-3">Downloading disabled in viewer. All access is logged.</div>
      </div>
    </div>
  )
}

export default function ViewerGate() {
  const router = useRouter()
  const rawId = router.query.id
  const rawDebug = router.query.debug
  const id = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : ''
  const debug = typeof rawDebug !== 'undefined'
  const debugOpen = Array.isArray(rawDebug)
    ? rawDebug[0] === '1'
    : rawDebug === '1'
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
  const fileUrl = `/api/secure/pdf?id=${id}`
  return (
    <ViewerErrorBoundary fileUrl={fileUrl} id={id} debug={debug} debugOpen={debugOpen}>
      <ViewerInner id={id} fileUrl={fileUrl} />
    </ViewerErrorBoundary>
  )
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('X-Robots-Tag', 'noindex, nofollow')
  res.setHeader(
    'Content-Security-Policy',
    'frame-ancestors https://backdoordox-v2.vercel.app https://*.backdoordox-v2.vercel.app;'
  )
  return { props: {} }
}
