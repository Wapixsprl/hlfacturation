import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { factureViewSig } from '@/lib/payments/encryption'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sig = request.nextUrl.searchParams.get('sig')

  if (!sig || sig !== factureViewSig(id)) {
    return new NextResponse('Lien invalide', { status: 403 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  await supabase.rpc('increment_facture_email_ouvertures', { p_facture_id: id })

  const { data: facture } = await supabase
    .from('factures')
    .select('pdf_url')
    .eq('id', id)
    .single()

  if (!facture?.pdf_url) {
    return new NextResponse('Facture introuvable', { status: 404 })
  }

  return NextResponse.redirect(facture.pdf_url, 302)
}
