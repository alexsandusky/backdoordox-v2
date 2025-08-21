import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'

export default function Login() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [resendMsg, setResendMsg] = useState('')
  const [unconfirmed, setUnconfirmed] = useState(false)
  const [devLink, setDevLink] = useState('')

  useEffect(() => {
    if (router.query.mode === 'signup') setMode('signup')
  }, [router.query.mode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setStatus('')
    setResendMsg('')
    setDevLink('')
    const res = await fetch(`/api/auth/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      if (mode === 'login') {
        router.push('/dashboard')
      } else {
        setStatus('Check your email to confirm your account')
        setMode('login')
        setDevLink(data.devLink || '')
        setUnconfirmed(false)
      }
    } else {
      if (res.status === 403 && data.error === 'UNCONFIRMED') {
        setUnconfirmed(true)
        setError('Please confirm your email.')
      } else {
        setUnconfirmed(false)
        setError(data.error || 'Error')
      }
    }
  }

  const resend = async () => {
    setResendMsg('')
    const res = await fetch('/api/auth/resend-confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok && !data.error) {
      setResendMsg('If an account exists, we sent an email.')
    } else {
      setResendMsg(data.error || 'Unable to resend')
    }
  }

  return (
    <Layout>
      <div className="max-w-sm mx-auto card">
        <div className="flex justify-center gap-2 mb-4">
          <button onClick={() => setMode('login')} className={`btn ${mode==='login' ? 'btn-primary' : 'btn-outline'}`}>Log in</button>
          <button onClick={() => setMode('signup')} className={`btn ${mode==='signup' ? 'btn-primary' : 'btn-outline'}`}>Sign up</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" required placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} className="input w-full" />
          <input type="password" required placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} className="input w-full" />
          {status && (
            <p className="text-green-600 text-sm">
              {status}
              <button type="button" onClick={resend} className="underline ml-1">Resend confirmation</button>
              {devLink && (
                <a href={devLink} className="underline ml-1">Confirm now</a>
              )}
            </p>
          )}
          {error && (
            <p className="text-red-500 text-sm">
              {error}
              {unconfirmed && (
                <button type="button" onClick={resend} className="underline ml-1">Resend link</button>
              )}
            </p>
          )}
          {resendMsg && <p className="text-sm text-green-600">{resendMsg}</p>}
          <button type="submit" className="btn btn-primary w-full">{mode==='login' ? 'Log in' : 'Create account'}</button>
        </form>
      </div>
    </Layout>
  )
}
