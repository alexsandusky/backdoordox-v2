import type { NextApiRequest, NextApiResponse } from 'next'
import { authenticate, createSession } from '../../../lib/auth'
import { requireEnv } from '../../../lib/env'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).end()
    return
  }
  if (!requireEnv(res, ['KV_REST_API_URL', 'KV_REST_API_TOKEN', 'JWT_SECRET'])) return
  const { email, password } = req.body
  const user = await authenticate(email, password)
  if (user) {
    createSession(res, user)
    res.status(200).json({ ok: true })
  } else {
    res.status(401).json({ error: 'Invalid credentials' })
  }
}
