import { useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'

export default function Login() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    router.push('/dashboard')
  }

  return (
    <Layout>
      <div className="max-w-sm mx-auto card">
        <div className="flex justify-center gap-2 mb-4">
          <button onClick={() => setMode('login')} className={`btn ${mode==='login' ? 'btn-primary' : 'btn-outline'}`}>Log in</button>
          <button onClick={() => setMode('signup')} className={`btn ${mode==='signup' ? 'btn-primary' : 'btn-outline'}`}>Sign up</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" required placeholder="Email" className="input w-full" />
          <input type="password" required placeholder="Password" className="input w-full" />
          <button type="submit" className="btn btn-primary w-full">{mode==='login' ? 'Log in' : 'Create account'}</button>
        </form>
      </div>
    </Layout>
  )
}
