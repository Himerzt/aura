/**
 * Catch-all API proxy route handler.
 *
 * Replaces Next.js rewrites for /api/* so we can control the fetch timeout.
 * The morning pipeline calls 3 Gemini agents sequentially and can take 60-120s,
 * which exceeds the default rewrite proxy timeout (~30s).
 *
 * Railway deployment: set BACKEND_ORIGIN env var on the frontend service.
 *   Private networking : http://<backend-service-name>.railway.internal
 *   Public URL (fallback): https://<backend-service>.up.railway.app
 * Local Docker Compose : falls back to http://backend:8000 automatically.
 */

const API_ORIGIN = process.env.BACKEND_ORIGIN ?? 'http://backend:8000'
const PROXY_TIMEOUT_MS = 180_000 // 3 minutes — matches nginx proxy_read_timeout

// Server-side only log — never reaches the browser
function logProxy(method: string, targetUrl: string, status?: number, errMsg?: string) {
  const ts = new Date().toISOString()
  if (errMsg) {
    console.error(`[proxy] ${ts} ${method} ${targetUrl} → ERROR: ${errMsg}`)
  } else {
    console.log(`[proxy] ${ts} ${method} ${targetUrl} → ${status}`)
  }
}

async function proxyRequest(request: Request, params: Promise<{ path: string[] }>) {
  const { path } = await params
  const targetPath = '/api/' + path.join('/')
  const url = new URL(targetPath, API_ORIGIN)

  // Forward query string
  const reqUrl = new URL(request.url)
  url.search = reqUrl.search

  const targetUrl = url.toString()

  const headers = new Headers(request.headers)
  // Remove host header so backend gets its own
  headers.delete('host')

  const init: RequestInit = {
    method: request.method,
    headers,
    signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
  }

  // Forward body for non-GET/HEAD requests
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.text()
  }

  try {
    const res = await fetch(targetUrl, init)
    const body = await res.text()

    logProxy(request.method, targetUrl, res.status)

    return new Response(body, {
      status: res.status,
      statusText: res.statusText,
      headers: {
        'Content-Type': res.headers.get('Content-Type') ?? 'application/json',
      },
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      logProxy(request.method, targetUrl, undefined, 'TimeoutError after 3 min')
      return Response.json(
        { detail: 'Backend không phản hồi kịp. Vui lòng thử lại.' },
        { status: 504 },
      )
    }
    const message = err instanceof Error ? err.message : String(err)
    logProxy(request.method, targetUrl, undefined, message)
    return Response.json(
      { detail: 'Không thể kết nối tới backend.' },
      { status: 502 },
    )
  }
}

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context.params)
}

export async function POST(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context.params)
}

export async function PUT(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context.params)
}

export async function DELETE(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context.params)
}
