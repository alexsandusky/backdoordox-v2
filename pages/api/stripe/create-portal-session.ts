import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { getUserFromRequest } from '../../../lib/auth'
import { requireEnv } from '../../../lib/env'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!requireEnv(res, ['STRIPE_SECRET_KEY', 'NEXT_PUBLIC_APP_URL', 'JWT_SECRET'])) return
  const user = getUserFromRequest(req)
  if (!user) return res.status(401).end()
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2022-11-15' as any,
    })
    const customers = await stripe.customers.list({ email: user.email, limit: 1 })
    const customer = customers.data[0]
    if (!customer) return res.status(400).json({ error: 'No customer' })
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    })
    res.json({ url: session.url })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}
