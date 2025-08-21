import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  res.setHeader('Set-Cookie', 'bdx_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0')
  res.status(200).json({ ok: true })
}
