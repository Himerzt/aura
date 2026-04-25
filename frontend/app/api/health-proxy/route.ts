/**
 * Lightweight health endpoint for Railway healthcheck.
 * Returns the frontend status and, if reachable, the backend status.
 * Never leaks secrets — only logs on the server side.
 */

const API_ORIGIN = process.env.BACKEND_ORIGIN ?? 'http://backend:8000'

export async function GET() {
  let backendStatus: string
  try {
    const res = await fetch(`${API_ORIGIN}/health`, {
      signal: AbortSignal.timeout(5_000),
    })
    backendStatus = res.ok ? 'ok' : `http_${res.status}`
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[health-proxy] backend unreachable (${API_ORIGIN}/health): ${msg}`)
    backendStatus = 'unreachable'
  }

  const ok = backendStatus === 'ok'
  return Response.json(
    { frontend: 'ok', backend: backendStatus, backend_origin: API_ORIGIN },
    { status: ok ? 200 : 502 },
  )
}
