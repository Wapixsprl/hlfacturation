import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Public endpoint — no auth required
// Returns branding info (logo_url, company name) for the login page
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data } = await supabase
    .from('entreprises')
    .select('nom, logo_url')
    .limit(1)
    .single()

  return NextResponse.json({
    nom: data?.nom || null,
    logo_url: data?.logo_url || null,
  })
}
