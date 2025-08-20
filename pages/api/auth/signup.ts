import type { NextApiRequest, NextApiResponse } from 'next'
import { registerUser, createSession } from '../../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).end()
    return
  }
  const { email, password } = req.body
  try {
    await registerUser(email, password)
    createSession(res, email)
    res.status(200).json({ ok: true })
  } catch (err:any) {
    res.status(400).json({ error: err.message || 'error' })
  }
}
