
import Link from 'next/link'
import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useRouter()
  const [user, setUser] = useState<{ email: string } | null>(null)

  useEffect(() => {
    fetch('/api/me')
      .then(r => (r.ok ? r.json() : null))
      .then(setUser)
      .catch(() => setUser(null))
  }, [])

  const Tab = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <Link href={href} className={`btn ${pathname === href ? 'bg-gray-900 text-white' : 'btn-outline'} `}>{children}</Link>
  )

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/'
  }

  return (
    <div>
      <header className="bg-white border-b">
        <div className="container py-4 flex items-center gap-4">
          <Link href="/" className="text-xl font-semibold">BackdoorDox</Link>
          <nav className="flex items-center gap-2 flex-1">
            {user ? (
              <>
                <Tab href="/dashboard">Dashboard</Tab>
                <Tab href="/watermark">Watermark</Tab>
                <Tab href="/activity">Activity</Tab>
                <Tab href="/api">API</Tab>
                <Tab href="/payment">Payment</Tab>
              </>
            ) : (
              <Tab href="/">Home</Tab>
            )}
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <button onClick={logout} className="btn btn-outline">Logout</button>
            ) : (
              <Link href="/login" className="btn btn-outline">Login</Link>
            )}
          </div>
          <div className="text-sm text-gray-500">MVP</div>
        </div>
      </header>
      <main className="container py-8 space-y-6">{children}</main>
      <footer className="container py-10 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} BackdoorDox — MVP for demo purposes
      </footer>
    </div>
  )
}
