
import { useEffect, useState } from 'react'

function buf2hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export default function useDeviceFingerprint() {
  const [fp, setFp] = useState<string>('')
  useEffect(() => {
    ;(async () => {
      try {
        const nav = navigator as any
        const canvas = document.createElement('canvas')
        const gl = canvas.getContext('webgl')
        const vendor = gl ? gl.getParameter(gl.VENDOR) : ''
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
        const data = [
          nav.userAgent,
          nav.language,
          nav.platform,
          nav.hardwareConcurrency,
          nav.deviceMemory,
          screen.width,
          screen.height,
          screen.colorDepth,
          tz,
          vendor,
        ].join('|')
        const hash = await crypto.subtle.digest(
          'SHA-256',
          new TextEncoder().encode(data)
        )
        setFp(buf2hex(hash))
      } catch {
        setFp('unknown')
      }
    })()
  }, [])
  return fp
}
