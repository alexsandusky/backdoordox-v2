import type { NextApiRequest, NextApiResponse } from 'next'
import { getLink } from '../../../lib/store'
import { requireEnv } from '../../../lib/env'
import { kv } from '@vercel/kv'
import fs from 'fs'
import { Readable } from 'stream'
import type { ReadableStream } from 'stream/web'

export const config = {
  api: { bodyParser: false, responseLimit: false },
}

export const runtime = 'nodejs'

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
  const st = req.query.st as string
  if (!st) return res.status(401).json({ error: 'missing token' })
  const token = await kv.hgetall<any>(`st:${st}`)
  if (!token || !token.id) return res.status(401).json({ error: 'invalid token' })
  if (token.id !== id) return res.status(401).json({ error: 'id mismatch' })
  if (Number(token.expiresAt) < Date.now()) return res.status(401).json({ error: 'token expired' })
  const link = await getLink(id)
  if (!link) return res.status(404).json({ error: 'not found' })

  const headers = buildHeaders(link.filename)
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v)
  const clientIp =
    (req.headers['x-forwarded-for'] as string || '').split(',')[0] ||
    req.socket.remoteAddress ||
    ''

  const storage = link.blobUrl.startsWith('file://') ? 'tmp' : 'blob'

  if (storage === 'tmp') {
    const filePath = link.blobUrl.replace('file://', '')
    let stat
    try { stat = await fs.promises.stat(filePath) } catch { return res.status(404).json({ error: 'not found' }) }
    const size = stat.size
    const rangeHeader = req.headers.range
    if (req.method === 'HEAD') {
      res.status(200).setHeader('Content-Length', size).end()
      console.log(
        `[stream] id=${id} st=${st} ip=${clientIp} storage=${storage} range=${rangeHeader || 'full'} size=${size} status=200`
      )
      return
    }
    const range = rangeHeader ? parseRange(rangeHeader, size) : null
    if (range) {
      const { start, end } = range
      res.status(206)
      res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`)
      res.setHeader('Content-Length', end - start + 1)
      console.log(
        `[stream] id=${id} st=${st} ip=${clientIp} storage=${storage} range=${start}-${end} size=${size} status=206`
      )
      fs.createReadStream(filePath, { start, end }).pipe(res)
    } else {
      res.status(200)
      res.setHeader('Content-Length', size)
      console.log(
        `[stream] id=${id} st=${st} ip=${clientIp} storage=${storage} range=full size=${size} status=200`
      )
      fs.createReadStream(filePath).pipe(res)
    }
    return
  }

  // blob storage
  const head = await fetch(link.blobUrl, { method: 'HEAD' })
  if (!head.ok) return res.status(502).json({ error: 'failed to fetch' })
  const size = Number(head.headers.get('content-length')) || 0
  const rangeHeader = req.headers.range
  if (req.method === 'HEAD') {
    res.status(200).setHeader('Content-Length', size).end()
    console.log(
      `[stream] id=${id} st=${st} ip=${clientIp} storage=${storage} range=${rangeHeader || 'full'} size=${size} status=200`
    )
    return
  }
  const range = rangeHeader ? parseRange(rangeHeader, size) : null
  let blobRes: Response
  if (range) {
    const { start, end } = range
    blobRes = await fetch(link.blobUrl, { headers: { Range: `bytes=${start}-${end}` } })
    if (!blobRes.ok || !blobRes.body) return res.status(502).json({ error: 'failed to fetch' })
    res.status(206)
    res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`)
    res.setHeader('Content-Length', end - start + 1)
    console.log(
      `[stream] id=${id} st=${st} ip=${clientIp} storage=${storage} range=${start}-${end} size=${size} status=206`
    )
  } else {
    blobRes = await fetch(link.blobUrl)
    if (!blobRes.ok || !blobRes.body) return res.status(502).json({ error: 'failed to fetch' })
    res.status(200)
    res.setHeader('Content-Length', size)
    console.log(
      `[stream] id=${id} st=${st} ip=${clientIp} storage=${storage} range=full size=${size} status=200`
    )
  }
  Readable.fromWeb(blobRes.body as ReadableStream).pipe(res)
}
