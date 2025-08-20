
import Layout from '../components/Layout'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

const WatermarkClient = dynamic(() => import('../components/WatermarkClient'), { ssr: false })

function getOwnerId() {
  if (typeof window === 'undefined') return 'anon'
  const key = 'bdx_owner'
  let id = localStorage.getItem(key)
  if (!id) { id = Math.random().toString(36).slice(2); localStorage.setItem(key, id) }
  return id
}

export default function Page() {
  const [ownerId, setOwnerId] = useState('')
  useEffect(()=>{ setOwnerId(getOwnerId()) }, [])
  return (
    <Layout>
      <h1 className="text-2xl font-semibold">Watermark Console</h1>
      <WatermarkClient ownerId={ownerId} />
    </Layout>
  )
}
