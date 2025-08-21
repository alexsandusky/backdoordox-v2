import crypto from 'crypto'
import nodemailer from 'nodemailer'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { kv } from '@vercel/kv'
import type { NextApiRequest, NextApiResponse } from 'next'
import { sanitizeForKv } from './kv'

export type User = {
  id: string
  email: string
  passwordHash: string
  createdAt: string
  plan: string
  apiKey: string
  confirmedAt?: string
}

const JWT_SECRET = process.env.JWT_SECRET

function userKey(email: string) {
  return `user:${email.toLowerCase()}`
}

function apiKeyKey(key: string) {
  return `api-key:${key}`
}

export async function getUser(email: string): Promise<User | null> {
  const data = await kv.hgetall<User>(userKey(email))
  if (!data || !data.email) return null
  return data
}

export async function registerUser(email: string, password: string): Promise<{ user: User; token: string }> {
  const existing = await getUser(email)
  if (existing) throw new Error('User exists')
  const user: User = {
    id: crypto.randomUUID(),
    email: email.toLowerCase(),
    passwordHash: await bcrypt.hash(password, 10),
    createdAt: new Date().toISOString(),
    plan: 'free',
    apiKey: crypto.randomBytes(16).toString('hex'),
  }
  await kv.hset(userKey(email), sanitizeForKv(user))
  await kv.set(apiKeyKey(user.apiKey), user.email)
  const token = crypto.randomBytes(32).toString('hex')
  await kv.set(`confirm:${token}`, user.email, { ex: 60 * 60 * 24 })
  await kv.set(`confirm-email:${user.email}`, token, { ex: 60 * 60 * 24 })
  return { user, token }
}

export async function authenticate(email: string, password: string): Promise<User | null> {
  const user = await getUser(email)
  if (!user) return null
  const ok = await bcrypt.compare(password, user.passwordHash)
  return ok ? user : null
}

export function createSession(res: NextApiResponse, user: { id: string; email: string }) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET env var not set')
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' })
  const maxAge = 60 * 60 * 24 * 30
  res.setHeader('Set-Cookie', `bdx_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`)
}

export function getUserFromRequest(req: NextApiRequest | { headers: { [key: string]: any } }): { id: string; email: string } | null {
  const cookie = req.headers?.cookie?.split(';').find((c: string) => c.trim().startsWith('bdx_session='))
  if (!cookie) return null
  const token = cookie.split('=')[1]
  if (!JWT_SECRET) return null
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string; email: string }
  } catch {
    return null
  }
}

export async function getUserByApiKey(key: string): Promise<User | null> {
  const email = await kv.get<string>(apiKeyKey(key))
  if (!email) return null
  return await getUser(email)
}

export async function sendConfirmationEmail(email: string, token: string): Promise<string> {
  const url = `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/auth/confirm?token=${token}`
  const { EMAIL_SERVER_HOST, EMAIL_SERVER_PORT, EMAIL_SERVER_USER, EMAIL_SERVER_PASS, EMAIL_FROM } =
    process.env as Record<string, string | undefined>
  if (EMAIL_SERVER_HOST && EMAIL_SERVER_PORT && EMAIL_SERVER_USER && EMAIL_SERVER_PASS && EMAIL_FROM) {
    try {
      const transporter = nodemailer.createTransport({
        host: EMAIL_SERVER_HOST,
        port: Number(EMAIL_SERVER_PORT),
        secure: Number(EMAIL_SERVER_PORT) === 465,
        auth: { user: EMAIL_SERVER_USER, pass: EMAIL_SERVER_PASS },
      })
      await transporter.sendMail({
        from: EMAIL_FROM,
        to: email,
        subject: 'Confirm your BackdoorDox account',
        text: `Click to confirm your account: ${url}`,
      })
    } catch (e) {
      console.warn('email send failed', e)
      console.log('Confirm URL:', url)
    }
  } else {
    console.warn('SMTP env vars missing; outputting confirmation URL')
    console.log('Confirm URL:', url)
  }
  return url
}
