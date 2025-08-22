import Layout from '../components/Layout'
import type { GetServerSideProps } from 'next'
import { getUserFromRequest } from '../lib/auth'
import { useState } from 'react'

export default function Payment() {
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [portalError, setPortalError] = useState<string | null>(null)

  async function subscribe() {
    setCheckoutError(null)
    const res = await fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      credentials: 'include',
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      setCheckoutError(err.error || 'Unable to start checkout')
      return
    }
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else setCheckoutError(data.error || 'Unable to start checkout')
  }

  async function manage() {
    setPortalError(null)
    const res = await fetch('/api/stripe/create-portal-session', {
      method: 'POST',
      credentials: 'include',
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      setPortalError(err.error || 'Unable to open portal')
      return
    }
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else setPortalError(data.error || 'Unable to open portal')
  }

  return (
    <Layout>
      <div className="card max-w-md mx-auto text-center">
        <h1 className="text-2xl font-bold mb-2">Billing</h1>
        <p className="hint mb-4">Manage your subscription through Stripe.</p>
        <div className="flex flex-col gap-2">
          <div className="flex flex-col">
            <button onClick={subscribe} className="btn btn-primary">Subscribe</button>
            <p className="hint">Create a new subscription.</p>
            {checkoutError && <p className="hint text-red-500">{checkoutError}</p>}
          </div>
          <div className="flex flex-col">
            <button onClick={manage} className="btn">Manage Billing</button>
            <p className="hint">Open the Stripe billing portal.</p>
            {portalError && <p className="hint text-red-500">{portalError}</p>}
          </div>
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
