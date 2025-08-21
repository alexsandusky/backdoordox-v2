
import type { NextApiRequest, NextApiResponse } from 'next'
import { getLink } from '../../lib/store'
import { requireEnv } from '../../lib/env'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireEnv(res, ['KV_REST_API_URL', 'KV_REST_API_TOKEN'])) return
  const id = (req.query.id as string)
  if (!id) return res.status(400).json({ error: 'id required' })
  const link = await getLink(id)
  if (!link) return res.status(404).json({ error: 'not found' })
  const { blobUrl, ...safe } = link as any
  res.json(safe)
}
