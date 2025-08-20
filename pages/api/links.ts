
import type { NextApiRequest, NextApiResponse } from 'next'
import { listLinks, getAccesses } from '../../lib/store'

function computeRisk(events: any[]) {
  const ips = new Set<string>()
  const countries = new Set<string>()
  let recent = 0
  const dayAgo = Date.now() - 24*3600*1000
  events.forEach(e=>{
    if (e.ip) ips.add(e.ip)
    if (e.country) countries.add(e.country)
    if (e.at > dayAgo) recent++
  })
  let risk = 0
  if (ips.size >= 3) risk++
  if (countries.size >= 2) risk++
  if (recent >= 10) risk++
  return risk
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ownerId = req.cookies['bdx_owner'] || 'anon'
  const links = await listLinks(ownerId)
  const withRisk = await Promise.all(links.map(async l => {
    const events = await getAccesses(l.id, 200)
    const risk = computeRisk(events)
    return { ...l, risk }
  }))
  res.json({ links: withRisk })
}
