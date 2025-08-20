import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import type { NextApiRequest, NextApiResponse } from 'next'

export type User = { email: string, passwordHash: string }

const usersFile = path.join(process.cwd(), 'users.json')

function loadUsers(): User[] {
  try {
    return JSON.parse(fs.readFileSync(usersFile, 'utf8')) as User[]
  } catch {
    return []
  }
}

function saveUsers(users: User[]) {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2))
}

function hash(password: string) {
  return crypto.createHash('sha256').update(password).digest('hex')
}

export async function registerUser(email: string, password: string) {
  const users = loadUsers()
  if (users.find(u => u.email === email)) throw new Error('User exists')
  users.push({ email, passwordHash: hash(password) })
  saveUsers(users)
  await sendConfirmationEmail(email, password)
}

export function authenticate(email: string, password: string) {
  const users = loadUsers()
  const user = users.find(u => u.email === email)
  if (!user) return false
  return user.passwordHash === hash(password)
}

export function createSession(res: NextApiResponse, email: string) {
  const token = Buffer.from(email).toString('base64')
  res.setHeader('Set-Cookie', `session=${token}; Path=/; HttpOnly; SameSite=Lax`)
}

export function getUserFromRequest(req: NextApiRequest | { headers: { [key: string]: any } }) {
  const cookie = req.headers?.cookie?.split(';').find((c: string) => c.trim().startsWith('session='))
  if (!cookie) return null
  const value = cookie.split('=')[1]
  return Buffer.from(value, 'base64').toString('utf8')
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

