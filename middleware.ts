import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Public routes — no auth needed
  const publicRoutes = ['/login', '/reset-password', '/signer/', '/payer/', '/api/']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Check for Supabase auth cookie (sb-*-auth-token)
  const cookies = request.cookies.getAll()
  const hasAuthCookie = cookies.some(c =>
    c.name.includes('-auth-token') || c.name.includes('sb-')
  )

  // No auth cookie → redirect to login
  if (!hasAuthCookie && pathname !== '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Has auth cookie on login page → redirect to dashboard
  if (hasAuthCookie && (pathname === '/login' || pathname === '/')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Root without cookie → login
  if (pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|icon-.*\\.png|logo-.*\\.png|manifest\\.json|.*\\.svg$).*)',
  ],
}
