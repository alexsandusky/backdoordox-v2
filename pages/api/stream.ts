
import type { NextApiRequest, NextApiResponse } from 'next'
import { getLink } from '../../lib/store'
import { requireEnv } from '../../lib/env'
import https from 'https'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireEnv(res, ['KV_REST_API_URL', 'KV_REST_API_TOKEN'])) return
  const id = (req.query.id as string)
  if (!id) return res.status(400).end('id required')
  const link = await getLink(id)
  if (!link) return res.status(404).end('not found')

  // Stream the file to client; response has no Content-Disposition to discourage downloads.
  // NOTE: Vercel Blob private URLs require Authorization; @vercel/blob sdk's "get" isn't available here,
  // so we proxy the stored URL directly if it is public. For private, Vercel handles auth in URL.
  const url = link.blobUrl
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('X-Robots-Tag', 'noindex, nofollow')
  res.setHeader('Content-Type', 'application/pdf')
  https.get(url, r => {
    r.pipe(res)
  }).on('error', (e)=>{
    res.status(500).end('failed to fetch')
  })
}
