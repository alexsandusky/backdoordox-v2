
import type { NextApiRequest, NextApiResponse } from 'next'
import { getLink } from '../../lib/store'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = (req.query.id as string)
  if (!id) return res.status(400).json({ error: 'id required' })
  const link = await getLink(id)
  if (!link) return res.status(404).json({ error: 'not found' })
  res.json(link)
}
