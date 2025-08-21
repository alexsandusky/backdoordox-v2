
import { useRouter } from 'next/router'
import { useEffect, useMemo, useState } from 'react'
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
  return (
    <div className="container py-6">
      <div className="card">
        <div className="mb-3 text-sm text-gray-600">Viewing: <span className="font-medium">{meta.filename}</span></div>
        <div className="aspect-[1/1.414] w-full h-[80vh]">
          {/* We hide default controls to discourage casual downloading */}
          <iframe src={fileUrl + '#toolbar=0&navpanes=0&scrollbar=0'} className="w-full h-full rounded-xl border" sandbox="allow-same-origin allow-scripts allow-top-navigation-by-user-activation"></iframe>
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
  return { props: {} }
}
