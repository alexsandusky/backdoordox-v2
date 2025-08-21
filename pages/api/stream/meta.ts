import type { NextApiRequest, NextApiResponse } from 'next'
import { getLink } from '../../../lib/store'
import { requireEnv } from '../../../lib/env'
import fs from 'fs/promises'

type MetaResult = {
  ok: boolean
  id: string
  storage?: string
  filename?: string
  size?: number
  hasRange?: boolean
  headers?: Record<string, string>
  source?: 'blob' | 'tmp'
  note?: string
  error?: string
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

export default async function handler(req: NextApiRequest, res: NextApiResponse<MetaResult>) {
  if (!requireEnv(res, ['KV_REST_API_URL', 'KV_REST_API_TOKEN'])) return
  const id = req.query.id as string
  if (!id) return res.status(400).json({ ok: false, id: '', error: 'id required' })
  const link = await getLink(id)
  if (!link) return res.status(404).json({ ok: false, id, error: 'not found' })
  const headers = buildHeaders(link.filename)
  const storage = link.blobUrl.startsWith('file://') ? 'tmp' : 'blob'
  try {
    if (storage === 'tmp') {
      const stat = await fs.stat(link.blobUrl.replace('file://', ''))
      return res.json({ ok: true, id, storage, filename: link.filename, size: stat.size, hasRange: true, headers, source: 'tmp' })
    }
    const head = await fetch(link.blobUrl, { method: 'HEAD' })
    if (!head.ok) throw new Error('failed to head blob')
    const size = Number(head.headers.get('content-length')) || 0
    return res.json({ ok: true, id, storage, filename: link.filename, size, hasRange: true, headers, source: 'blob' })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    res.json({ ok: false, id, storage, filename: link.filename, error: msg, note: 'failed to read source', headers })
  }
}
