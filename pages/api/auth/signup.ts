import type { NextApiRequest, NextApiResponse } from 'next'
import { registerUser, sendConfirmationEmail } from '../../../lib/auth'
import { requireEnv } from '../../../lib/env'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).end()
    return
  }
  if (!requireEnv(res, ['KV_REST_API_URL', 'KV_REST_API_TOKEN'])) return
  const { email, password } = req.body
  try {
    const { token } = await registerUser(email, password)
    const url = await sendConfirmationEmail(email, token)
    const { EMAIL_SERVER_HOST, EMAIL_SERVER_PORT, EMAIL_SERVER_USER, EMAIL_SERVER_PASS, EMAIL_FROM } =
      process.env as Record<string, string | undefined>
    const hasSMTP = EMAIL_SERVER_HOST && EMAIL_SERVER_PORT && EMAIL_SERVER_USER && EMAIL_SERVER_PASS && EMAIL_FROM
    const body: any = { ok: true }
    if (!hasSMTP && process.env.NODE_ENV !== 'production') body.devLink = url
    res.status(200).json(body)
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'error' })
  }
}
