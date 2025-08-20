
import type { AppProps } from 'next/app'
import '../styles/globals.css'


function ensureOwnerCookie() {
  if (typeof document === 'undefined') return
  const key = 'bdx_owner'
  let id = localStorage.getItem(key)
  if (!id) { id = Math.random().toString(36).slice(2); localStorage.setItem(key, id) }
  document.cookie = `bdx_owner=${id}; path=/; max-age=31536000`
}
export default function App({ Component, pageProps }: AppProps) {
  ensureOwnerCookie()
  return <Component {...pageProps} />
}

