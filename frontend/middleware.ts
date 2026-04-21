import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Root "/" shows the Design System Preview — no redirect
  return NextResponse.next()
}

export const config = {
  // Only match protected app routes (not /, /login, /register)
  matcher: ['/onboarding', '/morning', '/checklist', '/evening', '/dashboard'],
}
