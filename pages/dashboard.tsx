
import Layout from '../components/Layout'
import Link from 'next/link'

export default function Home() {
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
    </Layout>
  )
}
