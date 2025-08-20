import type { NextApiRequest, NextApiResponse } from 'next'
import { randomUUID } from 'crypto'
import { savePDF, createLink } from '../../lib/store'
import { getUserByApiKey } from '../../lib/auth'
import { requireEnv } from '../../lib/env'
import { kv } from '@vercel/kv'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!requireEnv(res, ['KV_REST_API_URL', 'KV_REST_API_TOKEN', 'BLOB_READ_WRITE_TOKEN', 'NEXT_PUBLIC_APP_URL'])) return
  const auth = req.headers.authorization || ''
  const apiKey = auth.startsWith('Bearer ')? auth.slice(7): ''
  if (!apiKey) return res.status(401).json({ ok: false, error: 'Missing API key' })
  const user = await getUserByApiKey(apiKey)
  if (!user) return res.status(401).json({ ok: false, error: 'Invalid API key' })
  try {
    const jobs = Array.isArray(req.body) ? req.body : null
    if (!jobs) return res.status(400).json({ ok:false, error:'Invalid body' })

    const now = Date.now()
    const rlKey = `batch:rl:${apiKey}`
    await kv.zremrangebyscore(rlKey, 0, now - 60_000)
    const used = await kv.zcard(rlKey)
    if (used + jobs.length > 60) {
      return res.status(429).json({ ok:false, error:'Rate limit exceeded (60 jobs/min)' })
    }
    const entries = jobs.map(() => ({ score: now, member: randomUUID() }))
    for (const entry of entries) {
      await kv.zadd(rlKey, entry as any)
    }
    if (entries.length) await kv.expire(rlKey, 60)

    const results: { filename: string; url: string }[] = []
    for (const job of jobs) {
      const { filename, fileUrl, lender, expiresAt } = job || {}
      if (!filename || !fileUrl) continue
      const resp = await fetch(fileUrl)
      if (!resp.ok) continue
      const buf = Buffer.from(await resp.arrayBuffer())
      const saved = await savePDF(user.id, filename, buf)
      const linkId = randomUUID().slice(0,8)
      await createLink({
        id: linkId,
        fileId: saved.fileId,
        filename: saved.filename,
        blobUrl: saved.url,
        createdAt: Date.now(),
        ownerId: user.id,
        lender,
        expiresAt,
      })
      const viewerUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/view/${linkId}`
      results.push({ filename: saved.filename, url: viewerUrl })
    }
    res.json({ ok: true, results })
  } catch (e: any) {
    res.status(500).json({ ok:false, error:e.message })
  }
}
