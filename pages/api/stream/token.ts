import type { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'
import { kv } from '@vercel/kv'
import { requireEnv } from '../../../lib/env'
import { sanitizeForKv } from '../../../lib/kv'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!requireEnv(res, ['KV_REST_API_URL', 'KV_REST_API_TOKEN'])) return
  const { id, email, lender, fpHash, ua, tz, screen } = req.body || {}
  if (!id || !email) return res.status(400).json({ ok: false, error: 'id and email required' })
  const st = crypto.randomBytes(16).toString('base64url')
  const ip = (req.headers['x-forwarded-for'] as string || '').split(',')[0] || req.socket.remoteAddress
  const now = Date.now()
  const token = {
    id,
    email,
    lender,
    ip,
    fpHash,
    ua,
    tz,
    screen,
    createdAt: now,
    expiresAt: now + 10 * 60 * 1000,
    consumed: false,
  }
  const key = `st:${st}`
  await kv.hset(key, sanitizeForKv(token))
  await kv.expire(key, 600)
  res.json({ ok: true, st })
}
