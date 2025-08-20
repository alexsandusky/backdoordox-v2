
import Layout from '../components/Layout'
import Link from 'next/link'
import type { GetServerSideProps } from 'next'
import { getUserFromRequest } from '../lib/auth'
import { useEffect, useState } from 'react'

type Me = { email: string; plan: string; apiKey: string }

export default function Home() {
  const [me, setMe] = useState<Me | null>(null)

  useEffect(() => {
    fetch('/api/me').then(async res => {
      if (res.status === 401) {
        window.location.href = '/login'
        return
      }
      const data: Me = await res.json()
      setMe(data)
    })
  }, [])

  return (
    <Layout>
      <div className="card">
        <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
        <p className="text-gray-600">Protect your MCA files from backdooring with watermarking and tracked, read-only links.</p>
        <div className="mt-6 flex gap-3">
          <Link href="/watermark" className="btn btn-primary">Watermark</Link>
          <Link href="/activity" className="btn btn-outline">File Tracker</Link>
        </div>
      </div>
      {me && (
        <div className="card mt-4">
          <div className="badge mb-2">API Access</div>
          <p>Email: {me.email}</p>
          <p>Plan: {me.plan}</p>
          <div className="flex items-center">
            <span className="break-all font-mono text-sm">{me.apiKey}</span>
            <button className="btn btn-xs ml-2" onClick={() => navigator.clipboard.writeText(me.apiKey)}>Copy</button>
          </div>
        </div>
      )}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card">
          <div className="badge mb-2">Feature</div>
          <h3 className="font-semibold">OCR-safe overlay</h3>
          <p className="hint">Page render stays vector (no rasterization). Watermark text is thin + low opacity to minimize OCR interference.</p>
        </div>
        <div className="card">
          <div className="badge mb-2">Feature</div>
          <h3 className="font-semibold">Read-only links</h3>
          <p className="hint">Gate by business email and log each access (IP, UA, fingerprint). Detect unusual access patterns.</p>
        </div>
        <div className="card">
          <div className="badge mb-2">Feature</div>
          <h3 className="font-semibold">Flags & Signals</h3>
          <p className="hint">We surface geo/IP shifts, rapid link sharing, and odd device changes so you can respond quickly.</p>
        </div>
      </div>
      <div className="card mt-6">
        <div className="badge mb-2">API</div>
        <p className="hint">Send POST requests to /api/batch with header "Authorization: Bearer &lt;apiKey&gt;". The JSON body is an array where each job contains a filename and fileUrl plus optional lender and expiresAt. The response returns viewer URLs for the stored files.</p>
      </div>
    </Layout>
  )
}

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const user = getUserFromRequest(req as any)
  if (!user) {
    return { redirect: { destination: '/login', permanent: false } }
  }
  return { props: {} }
}
