import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 1x1 transparent GIF (43 bytes)
const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

const PIXEL_HEADERS = {
  'Content-Type': 'image/gif',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Must await — serverless runtimes kill the process after response is sent
  await supabase.rpc('increment_facture_email_ouvertures', { p_facture_id: id })

  return new Response(TRANSPARENT_GIF, {
    status: 200,
    headers: PIXEL_HEADERS,
  })
}
