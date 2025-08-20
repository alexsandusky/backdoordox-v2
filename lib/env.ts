import type { NextApiResponse } from 'next'

export function requireEnv(res: NextApiResponse, vars: string[]): boolean {
  for (const v of vars) {
    if (!process.env[v]) {
      res.status(500).json({ error: `${v} env var not set` })
      return false
    }
  }
  return true
}
