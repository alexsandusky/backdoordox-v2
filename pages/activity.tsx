
import { useState } from 'react'

import Layout from '../components/Layout'
import useSWR from 'swr'
import type { GetServerSideProps } from 'next'
import { getUserFromRequest } from '../lib/auth'

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then(r => r.json())

function RiskBadge({ score }: { score: number }) {
  const label = score >= 3 ? 'High' : score == 2 ? 'Elevated' : score == 1 ? 'Mild' : 'Low'
  const color = score >= 3 ? 'bg-red-600' : score == 2 ? 'bg-orange-500' : score == 1 ? 'bg-yellow-500' : 'bg-green-600'
  return <span className={`text-white px-2 py-1 rounded-full text-xs ${color}`}>{label}</span>
}

export default function Activity() {
  const { data } = useSWR('/api/links', fetcher, { refreshInterval: 5000 })
  const [filter, setFilter] = useState('')
  const links = (data?.links || []).filter((l: any) => {
    const q = filter.toLowerCase()
    return l.filename.toLowerCase().includes(q) || (l.lender || '').toLowerCase().includes(q)
  })
  const copy = (id: string) => navigator.clipboard?.writeText(`${location.origin}/view/${id}`)
  return (
    <Layout>
      <h1 className="text-2xl font-semibold mb-4">File Tracker</h1>
      <input
        type="text"
        placeholder="Filter by filename or lender"
        value={filter}
        onChange={e => setFilter(e.target.value)}
        className="mb-4 p-2 border rounded max-w-xs w-full"
      />
      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr className="text-left">
              <th className="py-2 pr-4">Filename</th>
              <th className="py-2 pr-4">Lender</th>
              <th className="py-2 pr-4">Events</th>
              <th className="py-2 pr-4">Created</th>
              <th className="py-2 pr-4">Risk</th>
              <th className="py-2 pr-4">Link</th>
            </tr>
          </thead>
          <tbody>
            {links.map((l: any) => (
              <tr key={l.id} className="border-t">
                <td className="py-2 pr-4">{l.filename}</td>
                <td className="py-2 pr-4">{l.lender || '-'}</td>
                <td className="py-2 pr-4">{l.events}</td>
                <td className="py-2 pr-4">{new Date(l.createdAt).toLocaleString()}</td>
                <td className="py-2 pr-4">
                  <div className="flex items-center gap-1">
                    <RiskBadge score={l.risk} />
                    {l.flags && l.flags.length > 0 && (
                      <span className="text-xs text-gray-600" title={l.flags.join(', ')}>
                        {l.flags.join(', ')}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-2 pr-4">
                  <div className="flex gap-2">
                    <a className="text-blue-600 underline" href={`/view/${l.id}`} target="_blank" rel="noreferrer">
                      Open
                    </a>
                    <button className="text-blue-600 underline" onClick={() => copy(l.id)}>
                      Copy
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const user = getUserFromRequest(req as any)
  if (!user) {
    return { redirect: { destination: '/login', permanent: false } }
  }
  return { props: {} }
}
