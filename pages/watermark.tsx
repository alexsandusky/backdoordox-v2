
import Layout from '../components/Layout'
import dynamic from 'next/dynamic'
import type { GetServerSideProps } from 'next'
import { getUserFromRequest } from '../lib/auth'

const WatermarkClient = dynamic(() => import('../components/WatermarkClient'), { ssr: false })

export default function Page() {
  return (
    <Layout>
      <h1 className="text-2xl font-semibold">Watermark Console</h1>
      <WatermarkClient />
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
