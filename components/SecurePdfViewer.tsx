import { useEffect, useRef } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import 'pdfjs-dist/build/pdf.worker.min.js'

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'

export default function SecurePdfViewer({ src }: { src: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let canceled = false
    const container = containerRef.current
    if (!container) return

    ;(async () => {
      container.innerHTML = ''
      try {
        const res = await fetch(src, {
          credentials: 'include',
          headers: { Accept: 'application/pdf' },
        })
        const buf = await res.arrayBuffer()
        const data = new Uint8Array(buf)
        const pdf = await pdfjsLib.getDocument({ data }).promise
        for (let pageNum = 1; pageNum <= pdf.numPages && !canceled; pageNum++) {
          const page = await pdf.getPage(pageNum)
          const viewport = page.getViewport({ scale: 1.25 })
          const canvas = document.createElement('canvas')
          const context = canvas.getContext('2d')
          canvas.width = viewport.width
          canvas.height = viewport.height
          await page.render({ canvasContext: context!, viewport }).promise
          container.appendChild(canvas)
        }
      } catch (err) {
        if (!canceled) {
          console.error(err)
        }
      }
    })()

    return () => {
      canceled = true
      if (container) container.innerHTML = ''
    }
  }, [src])

  return (
    <div
      ref={containerRef}
      className="w-full min-h-[72vh] rounded-xl border select-none"
      onContextMenu={e => e.preventDefault()}
    />
  )
}
