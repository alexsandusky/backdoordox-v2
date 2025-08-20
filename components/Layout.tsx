
import Link from 'next/link'
import { useRouter } from 'next/router'
import React from 'react'

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useRouter()
  const Tab = ({ href, children }: { href: string, children: React.ReactNode }) => (
    <Link href={href} className={`btn ${pathname===href ? 'bg-gray-900 text-white' : 'btn-outline'} `}>{children}</Link>
  )

  return (
    <div>
      <header className="bg-white border-b">
        <div className="container py-4 flex items-center gap-4">
          <Link href="/" className="text-xl font-semibold">BackdoorDox</Link>
          <nav className="flex items-center gap-2">
            <Tab href="/watermark">Watermark</Tab>
            <Tab href="/activity">Activity</Tab>
            <Tab href="/api">API</Tab>
          </nav>
          <div className="ml-auto text-sm text-gray-500">MVP</div>
        </div>
      </header>
      <main className="container py-8 space-y-6">{children}</main>
      <footer className="container py-10 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} BackdoorDox — MVP for demo purposes
      </footer>
    </div>
  )
}
