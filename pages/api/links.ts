
import type { NextApiRequest, NextApiResponse } from 'next'
import { listLinks, getAccesses } from '../../lib/store'
import { getUserFromRequest } from '../../lib/auth'
import { requireEnv } from '../../lib/env'

function computeRisk(events: any[]) {
  const ips = new Set<string>()
  const countries = new Set<string>()
  let recent = 0
  const dayAgo = Date.now() - 24 * 3600 * 1000
  events.forEach(e => {
    if (e.ip) ips.add(e.ip)
    if (e.country) countries.add(e.country)
    if (e.at > dayAgo) recent++
  })
  let score = 0
  const reasons: string[] = []
  if (ips.size >= 3) {
    score++
    reasons.push('ip_churn')
  }
  if (countries.size >= 2) {
    score++
    reasons.push('geo_shift')
  }
  if (recent >= 10) {
    score++
    reasons.push('burst')
  }
  return { score, reasons }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireEnv(res, ['KV_REST_API_URL', 'KV_REST_API_TOKEN', 'JWT_SECRET'])) return
  const user = getUserFromRequest(req as any)
  if (!user) return res.status(401).json({ ok:false, error:'Unauthorized' })
  const ownerId = user.id
  const links = await listLinks(ownerId)
  const withRisk = await Promise.all(
    links.map(async l => {
      const events = await getAccesses(l.id, 200)
      const { score, reasons } = computeRisk(events)
      return { ...l, risk: score, flags: reasons }
    })
  )
  res.json({ links: withRisk })
}
