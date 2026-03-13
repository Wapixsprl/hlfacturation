import { updateSession } from '@/lib/supabase/middleware'
import { type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match only page navigations — skip:
     * - _next/static, _next/image (static files)
     * - favicon.ico, icons, logos, manifest, SVGs
     * - API routes with their own auth (webhooks, cron, branding, logo)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|icon-.*\\.png|logo-.*\\.png|manifest\\.json|.*\\.svg$|api/webhooks|api/cron|api/branding|api/logo).*)',
  ],
}
