import type { NextApiRequest, NextApiResponse } from 'next'
import { authenticate, createSession } from '../../../lib/auth'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).end()
    return
  }
  const { email, password } = req.body
  if (authenticate(email, password)) {
    createSession(res, email)
    res.status(200).json({ ok: true })
  } else {
    res.status(401).json({ error: 'Invalid credentials' })
  }
}
