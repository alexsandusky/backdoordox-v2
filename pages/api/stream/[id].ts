import type { NextApiRequest, NextApiResponse } from 'next'
import { getLink } from '../../../lib/store'
import { requireEnv } from '../../../lib/env'
import fs from 'fs'
import { Readable } from 'stream'
import type { ReadableStream } from 'stream/web'

export const config = {
  api: { bodyParser: false, responseLimit: false },
}

function buildHeaders(filename: string) {
  const safe = (filename || 'document.pdf').replace(/[^\w.-]/g, '_')
  const name = safe.endsWith('.pdf') ? safe : safe + '.pdf'
  return {
    'Cache-Control': 'no-store',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'no-referrer',
    'X-Robots-Tag': 'noindex, nofollow',
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="${name}"`,
    'Accept-Ranges': 'bytes',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Content-Encoding': 'identity',
  } as Record<string, string>
}

function parseRange(rangeHeader: string, size: number) {
  const m = /^bytes=(\d+)-(\d*)$/.exec(rangeHeader)
  if (!m) return null
  const start = Number(m[1])
  let end = m[2] ? Number(m[2]) : size - 1
  if (start >= size || start > end) return null
  if (end >= size) end = size - 1
  return { start, end }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireEnv(res, ['KV_REST_API_URL', 'KV_REST_API_TOKEN'])) return
  const { id } = req.query as { id: string }
  if (!id) return res.status(400).json({ error: 'id required' })
  const link = await getLink(id)
  if (!link) return res.status(404).json({ error: 'not found' })

  const headers = buildHeaders(link.filename)
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v)

  if (link.blobUrl.startsWith('file://')) {
    const filePath = link.blobUrl.replace('file://', '')
    let stat
    try { stat = await fs.promises.stat(filePath) } catch { return res.status(404).json({ error: 'not found' }) }
    const size = stat.size
    if (req.method === 'HEAD') {
      res.status(200).setHeader('Content-Length', size).end()
      return
    }
    const rangeHeader = req.headers.range
    const range = rangeHeader ? parseRange(rangeHeader, size) : null
    if (range) {
      const { start, end } = range
      res.status(206)
      res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`)
      res.setHeader('Content-Length', end - start + 1)
      fs.createReadStream(filePath, { start, end }).pipe(res)
    } else {
      res.status(200)
      res.setHeader('Content-Length', size)
      fs.createReadStream(filePath).pipe(res)
    }
    return
  }

  // blob storage
  const head = await fetch(link.blobUrl, { method: 'HEAD' })
  if (!head.ok) return res.status(502).json({ error: 'failed to fetch' })
  const size = Number(head.headers.get('content-length')) || 0
  if (req.method === 'HEAD') {
    res.status(200).setHeader('Content-Length', size).end()
    return
  }
  const rangeHeader = req.headers.range
  const range = rangeHeader ? parseRange(rangeHeader, size) : null
  let blobRes: Response
  if (range) {
    const { start, end } = range
    blobRes = await fetch(link.blobUrl, { headers: { Range: `bytes=${start}-${end}` } })
    if (!blobRes.ok || !blobRes.body) return res.status(502).json({ error: 'failed to fetch' })
    res.status(206)
    res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`)
    res.setHeader('Content-Length', end - start + 1)
  } else {
    blobRes = await fetch(link.blobUrl)
    if (!blobRes.ok || !blobRes.body) return res.status(502).json({ error: 'failed to fetch' })
    res.status(200)
    res.setHeader('Content-Length', size)
  }
  Readable.fromWeb(blobRes.body as ReadableStream).pipe(res)
}
