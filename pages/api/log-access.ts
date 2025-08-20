
import type { NextApiRequest, NextApiResponse } from 'next'
import { logAccess } from '../../lib/store'
import { requireEnv } from '../../lib/env'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!requireEnv(res, ['KV_REST_API_URL', 'KV_REST_API_TOKEN'])) return
  const { linkId, email, fingerprint } = req.body || {}
  if (!linkId) return res.status(400).json({ ok:false, error:'linkId required' })
  const ip = (req.headers['x-forwarded-for'] as string || '').split(',')[0] || req.socket.remoteAddress || undefined
  const country = (req.headers['x-vercel-ip-country'] as string) || (req.headers['cf-ipcountry'] as string) || undefined
  const ua = req.headers['user-agent'] as string | undefined
  await logAccess(linkId, { id: Math.random().toString(36).slice(2), at: Date.now(), ip, country, ua, email, fingerprint })
  res.json({ ok:true })
}
