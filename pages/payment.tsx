import Layout from '../components/Layout'
import type { GetServerSideProps } from 'next'
import { getUserFromRequest } from '../lib/auth'

export default function Payment() {
  const checkout = process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_URL || '#'
  return (
    <Layout>
      <div className="card max-w-md mx-auto text-center">
        <h1 className="text-2xl font-bold mb-2">Billing</h1>
        <p className="hint mb-4">Manage your subscription through Stripe.</p>
        <a href={checkout} className="btn btn-primary">Go to payment</a>
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
