import type { NextApiRequest, NextApiResponse } from 'next'
import streamHandler, { config, runtime } from '../stream/[id]'

export { config, runtime }

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return streamHandler(req as any, res as any)
}
