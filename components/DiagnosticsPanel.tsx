import React from 'react'

export type Diag = {
  ok: boolean
  storage?: string
  filename?: string
  size?: number
  hasRange?: boolean
  headers?: Record<string, string>
  source?: 'blob' | 'tmp'
  error?: string
}

export default function DiagnosticsPanel({ diag, diagStatus, debugOpen }: { diag: Diag | null; diagStatus: number | null; debugOpen: boolean }) {
  return (
    <details className="mt-3 text-xs" open={debugOpen}>
      <summary className="cursor-pointer select-none">Diagnostics</summary>
      {diag ? (
        <div className="mt-2">
          <table className="border-collapse text-left">
            <tbody>
              <tr><td className="pr-2">status</td><td>{diagStatus ?? 'unknown'}</td></tr>
              <tr><td className="pr-2">ok</td><td>{String(diag.ok)}</td></tr>
              {diag.storage && <tr><td className="pr-2">storage</td><td>{diag.storage}</td></tr>}
              {diag.filename && <tr><td className="pr-2">filename</td><td>{diag.filename}</td></tr>}
              {typeof diag.size === 'number' && <tr><td className="pr-2">size</td><td>{diag.size}</td></tr>}
              {typeof diag.hasRange === 'boolean' && <tr><td className="pr-2">hasRange</td><td>{String(diag.hasRange)}</td></tr>}
              {diag.headers && (
                <>
                  {['Content-Type','Content-Disposition','Cache-Control','X-Frame-Options','Accept-Ranges','Content-Length'].map(h => (
                    <tr key={h}><td className="pr-2">{h}</td><td>{diag.headers?.[h]}</td></tr>
                  ))}
                </>
              )}
              {diag.error && <tr><td className="pr-2">error</td><td className="text-red-600">{diag.error}</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-2">Loading…</div>
      )}
    </details>
  )
}

