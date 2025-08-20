import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { getUserFromRequest } from '../../../lib/auth'
import { requireEnv } from '../../../lib/env'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!requireEnv(res, ['STRIPE_SECRET_KEY', 'STRIPE_PRICE_ID', 'NEXT_PUBLIC_APP_URL', 'JWT_SECRET'])) return
  const user = getUserFromRequest(req)
  if (!user) return res.status(401).end()
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2022-11-15' as any,
    })
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      customer_email: user.email,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment`,
    })
    res.json({ url: session.url })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}
