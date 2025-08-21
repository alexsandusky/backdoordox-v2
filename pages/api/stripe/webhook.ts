import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { kv } from '@vercel/kv'
import { Readable } from 'stream'
import { requireEnv } from '../../../lib/env'
import { sanitizeForKv } from '../../../lib/kv'

export const config = { api: { bodyParser: false } }

async function buffer(readable: Readable) {
  const chunks: Uint8Array[] = []
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!requireEnv(res, ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'KV_REST_API_URL', 'KV_REST_API_TOKEN'])) return
  const buf = await buffer(req)
  const sig = req.headers['stripe-signature']
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2022-11-15' as any,
  })
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(buf, sig as string, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    res.status(400).send(`Webhook Error: ${err.message}`)
    return
  }
  switch (event.type) {
    case 'checkout.session.completed': {
      const email = (event.data.object as any).customer_email
      if (email) await kv.hset(`user:${email.toLowerCase()}`, sanitizeForKv({ plan: 'pro' }))
      break
    }
    case 'customer.subscription.deleted':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as any
      const customerId = subscription.customer as string
      try {
        const customer = await stripe.customers.retrieve(customerId)
        if (customer && !('deleted' in customer)) {
          const email = (customer as any).email
          if (email) {
            const plan = subscription.status === 'active' ? 'pro' : 'free'
            await kv.hset(`user:${email.toLowerCase()}`, sanitizeForKv({ plan }))
          }
        }
      } catch {}
      break
    }
    default:
      break
  }
  res.json({ received: true })
}
