import type { NextApiRequest, NextApiResponse } from 'next'
import { kv } from '@vercel/kv'
import { getUserFromRequest, type User } from '../../lib/auth'
import { requireEnv } from '../../lib/env'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireEnv(res, ['KV_REST_API_URL', 'KV_REST_API_TOKEN', 'JWT_SECRET'])) return
  const session = getUserFromRequest(req)
  if (!session) return res.status(401).json({ ok: false, error: 'Unauthorized' })
  const user = await kv.hgetall<User>(`user:${session.email}`)
  if (!user || !user.email) return res.status(404).json({ ok: false, error: 'User not found' })
  res.json({ email: user.email, plan: user.plan, apiKey: user.apiKey })
}
