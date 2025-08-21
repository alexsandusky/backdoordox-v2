
import type { NextApiRequest, NextApiResponse } from 'next'
import { savePDF, createLink } from '../../lib/store'
import { randomUUID } from 'crypto'
import { getUserFromRequest } from '../../lib/auth'
import { requireEnv } from '../../lib/env'

export const config = {
  api: { bodyParser: false }
}

// Simple multipart parser
function parseForm(req: NextApiRequest): Promise<{buffer: Buffer, filename: string, fields: Record<string,string>}> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const contentType = req.headers['content-type'] || ''
    const match = contentType.match(/boundary=(.*)$/)
    if (!match) { reject(new Error('No boundary')); return }
    const boundary = '--' + match[1]
    req.on('data', (d: Buffer) => chunks.push(d))
    req.on('end', () => {
      const data = Buffer.concat(chunks)
      const parts = data.toString('binary').split(boundary).slice(1, -1)
      let fileBuffer = Buffer.alloc(0)
      let filename = 'document.pdf'
      const fields: Record<string,string> = {}
      for (const part of parts) {
        const [rawHeaders, rawBody] = part.split('\r\n\r\n')
        const headers = rawHeaders || ''
        const disposition = /name="([^"]+)"(?:; filename="([^"]+)")?/.exec(headers)
        if (!disposition) continue
        const name = disposition[1]; const fname = disposition[2]
        const body = rawBody.slice(0, -2) // drop trailing CRLF
        if (fname) {
          filename = fname
          fileBuffer = Buffer.from(body, 'binary')
        } else {
          fields[name] = body
        }
      }
      resolve({ buffer: fileBuffer, filename, fields })
    })
    req.on('error', reject)
  })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!requireEnv(res, ['KV_REST_API_URL', 'KV_REST_API_TOKEN', 'JWT_SECRET', 'NEXT_PUBLIC_APP_URL'])) return
  const user = getUserFromRequest(req as any)
  if (!user) return res.status(401).json({ ok: false, error: 'Unauthorized' })
  try {
    const { buffer, filename, fields } = await parseForm(req)
    const ownerId = user.id
    const saved = await savePDF(ownerId, filename, buffer)
    const linkId = randomUUID().slice(0, 8)
    const lender = (fields['lender'] || fields['qr'] || '').trim()
    const expires = fields['expiresAt'] ? Number(fields['expiresAt']) : undefined
    const link = await createLink({
      id: linkId,
      fileId: saved.fileId,
      filename: saved.filename,
      blobUrl: saved.url,
      createdAt: Date.now(),
      ownerId,
      ...(lender ? { lender } : {}),
      ...(expires ? { expiresAt: expires } : {}),
    })
    const viewerUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/view/${link.id}`
    res.json({ ok: true, viewerUrl })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Upload failed'
    res.status(500).json({ ok: false, error: msg })
  }
}
