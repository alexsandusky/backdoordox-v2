import { kv } from '@vercel/kv'
import { put, del } from '@vercel/blob'
import { z } from 'zod'

export type LinkMeta = {
  id: string
  fileId: string
  filename: string
  blobUrl: string
  createdAt: number
  expiresAt?: number
  lender?: string
  ownerId: string
  events: number
}

export type AccessEvent = {
  id: string
  at: number
  ip?: string
  country?: string
  ua?: string
  email?: string
  fingerprint?: string
}

const LinkSchema = z.object({
  id: z.string(),
  fileId: z.string(),
  filename: z.string(),
  blobUrl: z.string().url(),
  createdAt: z.number(),
  ownerId: z.string(),
  expiresAt: z.number().optional(),
  lender: z.string().optional(),
  events: z.number().default(0),
})

export async function createLink(meta: Omit<LinkMeta, 'events'>) {
  const parsed = LinkSchema.parse({ ...meta, events: 0 })
  await kv.hset(`link:${parsed.id}`, parsed as any)
  await kv.zadd(`links:${parsed.ownerId}`, { score: parsed.createdAt, member: parsed.id })
  return parsed
}

export async function getLink(id: string): Promise<LinkMeta | null> {
  const raw = await kv.hgetall<LinkMeta>(`link:${id}`)
  return (raw as any) || null
}

export async function listLinks(ownerId: string): Promise<LinkMeta[]> {
  // NOTE: @vercel/kv uses zrange(..., { rev: true }) instead of zrevrange
  // BEFORE
// const ids = await kv.zrange<string>(`links:${ownerId}`, 0, 50, { rev: true })

// AFTER
const ids = (await kv.zrange(`links:${ownerId}`, 0, 50, { rev: true })) as string[];

  const res: LinkMeta[] = []
  for (const id of ids || []) {
    const meta = await getLink(id)
    if (meta) res.push(meta)
  }
  return res
}

export async function logAccess(linkId: string, event: AccessEvent) {
  const key = `link:${linkId}:events`
  await kv.zadd(key, { score: event.at, member: JSON.stringify(event) })
  await kv.hincrby(`link:${linkId}`, 'events', 1)
}

export async function getAccesses(linkId: string, limit = 200): Promise<AccessEvent[]> {
  const key = `link:${linkId}:events`
  // BEFORE
// const raws = await kv.zrange<string>(key, 0, limit - 1, { rev: true })

// AFTER
const raws = (await kv.zrange(key, 0, limit - 1, { rev: true })) as string[];

  if (!raws) return []
  return raws.map(r => JSON.parse(r) as AccessEvent)
}

export async function deleteLink(link: LinkMeta) {
  await kv.del(`link:${link.id}`)
  await kv.del(`link:${link.id}:events`)
  if (link.blobUrl.startsWith('file://')) {
    const { unlink } = await import('fs/promises')
    try {
      await unlink(new URL(link.blobUrl))
    } catch {
      // ignore
    }
  } else {
    await del(link.blobUrl)
  }
  await kv.zrem(`links:${link.ownerId}`, link.id)
}

export type UploadResult = { fileId: string, filename: string, url: string }
export async function savePDF(ownerId: string, filename: string, buf: Buffer): Promise<UploadResult> {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  const bucket = process.env.BLOB_BUCKET_URL

  if (!token || !bucket) {
    if (process.env.NODE_ENV === 'development') {
      const { mkdir, writeFile } = await import('fs/promises')
      const path = await import('path')
      const dir = '/tmp/uploads'
      await mkdir(dir, { recursive: true })
      const filePath = path.join(dir, `${Date.now()}-${filename}`)
      await writeFile(filePath, buf)
      return { fileId: filePath, filename, url: `file://${filePath}` }
    }
    const missing = !token ? 'BLOB_READ_WRITE_TOKEN' : 'BLOB_BUCKET_URL'
    throw new Error(`Blob upload failed: missing ${missing}`)
  }

  // Public for MVP demo; switch to 'private' + signed URLs later
  const putRes = await put(`pdfs/${ownerId}/${Date.now()}-${filename}`, buf, {
    contentType: 'application/pdf',
    access: 'public',
  })
  const fileId = putRes.pathname
  return { fileId, filename, url: putRes.url }
}
