import type { NextApiRequest, NextApiResponse } from 'next'
import { kv } from '@vercel/kv'
import { requireEnv } from '../../../lib/env'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()
  if (!requireEnv(res, ['KV_REST_API_URL', 'KV_REST_API_TOKEN'])) return
  const token = req.query.token as string
  if (!token) return res.status(400).end('token required')
  const email = await kv.get<string>(`confirm:${token}`)
  if (!email) {
    res.status(400).end('Invalid or expired token')
    return
  }
  await kv.hset(`user:${email}`, { confirmedAt: new Date().toISOString() } as any)
  await kv.del(`confirm:${token}`)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.end('<p>Email confirmed. You can now <a href="/login">log in</a>.</p>')
}
