import type { NextApiRequest, NextApiResponse } from 'next'
import { kv } from '@vercel/kv'
import { requireEnv } from '../../../lib/env'
import { getUser, sendConfirmationEmail } from '../../../lib/auth'
import crypto from 'crypto'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!requireEnv(res, ['KV_REST_API_URL', 'KV_REST_API_TOKEN'])) return
  const { email } = req.body || {}
  if (!email) return res.status(200).json({ ok: true })
  const ip = (req.headers['x-forwarded-for'] as string || '').split(',')[0] || req.socket.remoteAddress || 'unknown'
  const key = `resend:${ip}:${email}`
  const count = await kv.incr(key)
  if (count === 1) await kv.expire(key, 3600)
  if (count > 3) return res.status(200).json({ ok: true })
  const user = await getUser(email)
  if (user && !user.confirmedAt) {
    const token = crypto.randomBytes(32).toString('hex')
    await kv.set(`confirm:${token}`, user.email, { ex: 60 * 60 * 24 })
    await kv.set(`confirm-email:${user.email}`, token, { ex: 60 * 60 * 24 })
    await sendConfirmationEmail(user.email, token)
  }
  res.status(200).json({ ok: true })
}
