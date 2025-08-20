import crypto from 'crypto'
import nodemailer from 'nodemailer'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { kv } from '@vercel/kv'
import type { NextApiRequest, NextApiResponse } from 'next'

export type User = {
  id: string
  email: string
  passwordHash: string
  createdAt: string
  plan: string
  apiKey: string
}

const JWT_SECRET = process.env.JWT_SECRET

function userKey(email: string) {
  return `user:${email.toLowerCase()}`
}

function apiKeyKey(key: string) {
  return `api-key:${key}`
}

async function getUser(email: string): Promise<User | null> {
  const data = await kv.hgetall<User>(userKey(email))
  return (data && Object.keys(data).length) ? (data as User) : null
}

export async function registerUser(email: string, password: string): Promise<User> {
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
  await kv.hset(userKey(email), user)
  await kv.set(apiKeyKey(user.apiKey), user.email)
  await sendConfirmationEmail(email, password)
  return user
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

async function sendConfirmationEmail(email: string, password: string) {
  const account = await nodemailer.createTestAccount()
  const transporter = nodemailer.createTransport({
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.secure,
    auth: { user: account.user, pass: account.pass },
  })

  await transporter.sendMail({
    from: 'no-reply@backdoordox.local',
    to: email,
    subject: 'Welcome to BackdoorDox',
    text: `Your account has been created.\nUsername: ${email}\nPassword: ${password}`,
  })
}

