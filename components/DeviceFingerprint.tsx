
import { useEffect, useState } from 'react'

function hashString(str: string): string {
  // Simple 32-bit hash then hex-encode
  let h = 0
  for (let i=0;i<str.length;i++) { h = Math.imul(31, h) + str.charCodeAt(i) | 0 }
  return ('00000000'+(h>>>0).toString(16)).slice(-8)
}

export default function useDeviceFingerprint() {
  const [fp, setFp] = useState<string>('')
  useEffect(() => {
    try {
      const nav = navigator as any
      const data = [
        nav.userAgent,
        nav.language,
        nav.platform,
        nav.hardwareConcurrency,
        nav.deviceMemory,
        screen.width, screen.height, screen.colorDepth,
        Intl.DateTimeFormat().resolvedOptions().timeZone
      ].join('|')
      setFp(hashString(data))
    } catch {
      setFp('unknown')
    }
  }, [])
  return fp
}
