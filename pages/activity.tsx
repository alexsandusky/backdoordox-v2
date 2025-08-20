
import Layout from '../components/Layout'
import useSWR from 'swr'
import type { GetServerSideProps } from 'next'
import { getUserFromRequest } from '../lib/auth'

const fetcher = (url:string) => fetch(url).then(r=>r.json())

function RiskBadge({score}:{score:number}) {
  const label = score>=3 ? 'High' : score==2 ? 'Elevated' : score==1 ? 'Mild' : 'Low'
  const color = score>=3 ? 'bg-red-600' : score==2 ? 'bg-orange-500' : score==1 ? 'bg-yellow-500' : 'bg-green-600'
  return <span className={`text-white px-2 py-1 rounded-full text-xs ${color}`}>{label}</span>
}

export default function Activity() {
  const { data } = useSWR('/api/links', fetcher, { refreshInterval: 5000 })
  return (
    <Layout>
      <h1 className="text-2xl font-semibold mb-4">File Tracker</h1>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr className="text-left">
            <th className="py-2 pr-4">Filename</th>
            <th className="py-2 pr-4">Events</th>
            <th className="py-2 pr-4">Created</th>
            <th className="py-2 pr-4">Risk</th>
            <th className="py-2 pr-4">Link</th>
          </tr></thead>
          <tbody>
            {data?.links?.map((l:any)=>(
              <tr key={l.id} className="border-t">
                <td className="py-2 pr-4">{l.filename}</td>
                <td className="py-2 pr-4">{l.events}</td>
                <td className="py-2 pr-4">{new Date(l.createdAt).toLocaleString()}</td>
                <td className="py-2 pr-4"><RiskBadge score={l.risk} /></td>
                <td className="py-2 pr-4"><a className="text-blue-600 underline" href={`/view/${l.id}`} target="_blank" rel="noreferrer">Open</a></td>
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
