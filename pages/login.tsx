import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'

export default function Login() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (router.query.mode === 'signup') setMode('signup')
  }, [router.query.mode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const res = await fetch(`/api/auth/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    if (res.ok) {
      router.push('/dashboard')
    } else {
      const data = await res.json()
      setError(data.error || 'Error')
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
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" className="btn btn-primary w-full">{mode==='login' ? 'Log in' : 'Create account'}</button>
        </form>
      </div>
    </Layout>
  )
}
