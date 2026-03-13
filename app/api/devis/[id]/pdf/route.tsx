import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { DevisPDF } from '@/lib/pdf/devis-template'

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

  const { data: devis, error: devisError } = await supabase
    .from('devis')
    .select('*, client:clients(*), entreprise:entreprises(*)')
    .eq('id', id)
    .single()

  if (devisError || !devis) {
    return NextResponse.json({ error: 'Devis non trouve' }, { status: 404 })
  }

  const { data: lignes } = await supabase
    .from('devis_lignes')
    .select('*')
    .eq('devis_id', id)
    .order('ordre')

  const pdfBuffer = await renderToBuffer(
    <DevisPDF
      devis={devis}
      lignes={lignes || []}
      client={devis.client}
      entreprise={devis.entreprise}
    />
  )

  return new Response(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${devis.numero}.pdf"`,
    },
  })
}
