import { useEffect, useRef } from 'react'

export default function SecurePdfViewer({ src }: { src: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let canceled = false
    const container = containerRef.current
    if (!container) return

    ;(async () => {
      container.innerHTML = ''
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf')
      pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

      const loadingTask = pdfjs.getDocument({ url: src, withCredentials: true })
      const pdf = await loadingTask.promise
      for (let pageNum = 1; pageNum <= pdf.numPages && !canceled; pageNum++) {
        const page = await pdf.getPage(pageNum)
        const viewport = page.getViewport({ scale: 1.5 })
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        canvas.height = viewport.height
        canvas.width = viewport.width
        await page.render({ canvasContext: context!, viewport }).promise
        container.appendChild(canvas)
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
