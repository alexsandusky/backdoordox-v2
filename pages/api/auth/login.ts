import type { NextApiRequest, NextApiResponse } from 'next'
import { authenticate, createSession } from '../../../lib/auth'
import { requireEnv } from '../../../lib/env'
import { kv } from '@vercel/kv'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).end()
    return
  }
  if (!requireEnv(res, ['KV_REST_API_URL', 'KV_REST_API_TOKEN', 'JWT_SECRET'])) return
  const { email, password } = req.body
  const user = await authenticate(email, password)
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }
  if (user.confirmedAt) {
    createSession(res, user)
    res.status(200).json({ ok: true })
    return
  }
  const pending = await kv.get(`confirm-email:${user.email}`)
  if (pending) {
    res.status(403).json({ error: 'UNCONFIRMED' })
    return
  }
  createSession(res, user)
  res.status(200).json({ ok: true })
}
