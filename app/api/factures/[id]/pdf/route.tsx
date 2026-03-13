import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { FacturePDF } from '@/lib/pdf/facture-template'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  }

  const { data: facture, error: factureError } = await supabase
    .from('factures')
    .select('*, client:clients(*), entreprise:entreprises(*)')
    .eq('id', id)
    .single()

  if (factureError || !facture) {
    return NextResponse.json({ error: 'Facture non trouvee' }, { status: 404 })
  }

  const { data: lignes } = await supabase
    .from('factures_lignes')
    .select('*')
    .eq('facture_id', id)
    .order('ordre')

  const pdfBuffer = await renderToBuffer(
    <FacturePDF
      facture={facture}
      lignes={lignes || []}
      client={facture.client}
      entreprise={facture.entreprise}
    />
  )

  return new Response(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${facture.numero}.pdf"`,
    },
  })
}
