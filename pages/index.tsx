import Layout from '../components/Layout'
import Link from 'next/link'
import type { GetServerSideProps } from 'next'
import { getUserFromRequest } from '../lib/auth'

export default function Landing() {
  return (
    <Layout>
      <section className="text-center max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Stop Backdooring With Document Watermarks</h1>
        <p className="text-gray-600 mb-6">
          BackdoorDox helps merchant cash advance ISOs protect deal files by stamping every page and tracking every view.
        </p>
        <Link href="/login" className="btn btn-primary">Log in or Sign up</Link>
      </section>
      <div className="grid md:grid-cols-3 gap-4 mt-10">
        <div className="card">
          <h3 className="font-semibold mb-2">Persistent watermarks</h3>
          <p className="hint">Overlay ISO, broker and timestamp details so leaks are traceable.</p>
        </div>
        <div className="card">
          <h3 className="font-semibold mb-2">Access tracking</h3>
          <p className="hint">Read-only links log IP, device and geography for every view.</p>
        </div>
        <div className="card">
          <h3 className="font-semibold mb-2">Simple sharing</h3>
          <p className="hint">Distribute funding files confidently from a single dashboard.</p>
        </div>
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
