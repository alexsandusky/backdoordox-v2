
import type { NextApiRequest, NextApiResponse } from 'next'
import { getLink } from '../../lib/store'
import { requireEnv } from '../../lib/env'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { Readable } from 'stream'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireEnv(res, ['KV_REST_API_URL', 'KV_REST_API_TOKEN'])) return
  const id = (req.query.id as string)
  if (!id) return res.status(400).json({ error: 'id required' })
  const link = await getLink(id)
  if (!link) return res.status(404).json({ error: 'not found' })

  const url = link.blobUrl
  const safeName = (link.filename || 'document.pdf').replace(/[^\w.-]/g, '_')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('X-Robots-Tag', 'noindex, nofollow')
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename="${safeName.endsWith('.pdf') ? safeName : safeName + '.pdf'}"`)
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self'")
  res.status(200)

  try {
    if (req.method === 'HEAD') {
      if (url.startsWith('file://')) {
        await fs.promises.access(fileURLToPath(url), fs.constants.R_OK)
        res.status(200).end()
      } else {
        const head = await fetch(url, { method: 'HEAD' })
        if (!head.ok) return res.status(502).json({ error: 'failed to fetch' })
        res.status(200).end()
      }
      return
    }

    if (url.startsWith('file://')) {
      const filePath = fileURLToPath(url)
      const stream = fs.createReadStream(filePath)
      stream.on('error', () => res.status(500).json({ error: 'failed to fetch' }))
      stream.pipe(res)
    } else {
      const blobResp = await fetch(url)
      if (!blobResp.ok || !blobResp.body) return res.status(502).json({ error: 'failed to fetch' })
      Readable.fromWeb(blobResp.body as any).on('error', () => {
        res.status(500).end()
      }).pipe(res)
    }
  } catch (e) {
    res.status(500).json({ error: 'failed to fetch' })
  }
}
