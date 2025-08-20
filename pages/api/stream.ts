
import type { NextApiRequest, NextApiResponse } from 'next'
import { getLink } from '../../lib/store'
import https from 'https'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = (req.query.id as string)
  if (!id) return res.status(400).end('id required')
  const link = await getLink(id)
  if (!link) return res.status(404).end('not found')

  // Stream the file to client; response has no Content-Disposition to discourage downloads.
  // NOTE: Vercel Blob private URLs require Authorization; @vercel/blob sdk's "get" isn't available here,
  // so we proxy the stored URL directly if it is public. For private, Vercel handles auth in URL.
  const url = link.blobUrl
  res.setHeader('Content-Type', 'application/pdf')
  https.get(url, r => {
    r.pipe(res)
  }).on('error', (e)=>{
    res.status(500).end('failed to fetch')
  })
}
