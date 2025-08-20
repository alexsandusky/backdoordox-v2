import type { NextApiRequest, NextApiResponse } from 'next'
import { registerUser, createSession } from '../../../lib/auth'
import { requireEnv } from '../../../lib/env'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).end()
    return
  }
  if (!requireEnv(res, ['KV_REST_API_URL', 'KV_REST_API_TOKEN', 'JWT_SECRET'])) return
  const { email, password } = req.body
  try {
    const user = await registerUser(email, password)
    createSession(res, user)
    res.status(200).json({ ok: true })
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'error' })
  }
}
