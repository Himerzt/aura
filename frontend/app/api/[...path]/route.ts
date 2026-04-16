/**
 * Catch-all API proxy route handler.
 *
 * Replaces Next.js rewrites for /api/* so we can control the fetch timeout.
 * The morning pipeline calls 3 Gemini agents sequentially and can take 60-120s,
 * which exceeds the default rewrite proxy timeout (~30s).
 */

const API_ORIGIN = process.env.BACKEND_ORIGIN ?? 'http://backend:8000'
const PROXY_TIMEOUT_MS = 180_000 // 3 minutes — matches nginx proxy_read_timeout

async function proxyRequest(request: Request, params: Promise<{ path: string[] }>) {
  const { path } = await params
  const targetPath = '/api/' + path.join('/')
  const url = new URL(targetPath, API_ORIGIN)

  // Forward query string
  const reqUrl = new URL(request.url)
  url.search = reqUrl.search

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
    const res = await fetch(url.toString(), init)
    const body = await res.text()

    return new Response(body, {
      status: res.status,
      statusText: res.statusText,
      headers: {
        'Content-Type': res.headers.get('Content-Type') ?? 'application/json',
      },
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      return Response.json(
        { detail: 'Backend không phản hồi kịp. Vui lòng thử lại.' },
        { status: 504 },
      )
    }
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
