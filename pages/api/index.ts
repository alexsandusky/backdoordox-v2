import type { NextApiRequest, NextApiResponse } from 'next'
import { getUserFromRequest } from '../../lib/auth'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = getUserFromRequest(req as any)
  if (!user) {
    res.writeHead(302, { Location: '/login' })
    res.end()
    return
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.status(200).send(`<!doctype html>
<html><head><title>API</title></head><body><h1>Batch API</h1><p>Authenticate with <strong>Authorization: Bearer &lt;API Key&gt;</strong>. Find your key on the <a href="/dashboard">Dashboard</a>.</p><p>POST an array of jobs. Each job must include <strong>filename</strong> and <strong>fileUrl</strong>, and may include <strong>lender</strong> and <strong>expiresAt</strong> (epoch ms).</p></body></html>`)
}
