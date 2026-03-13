import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { numero } = await request.json()

  if (!numero) {
    return NextResponse.json({ valide: false, nom: '', adresse: '' })
  }

  // Clean the VAT number
  const clean = numero.replace(/[\s.\-]/g, '').toUpperCase()
  const countryCode = clean.slice(0, 2)
  const vatNumber = clean.slice(2)

  if (!vatNumber) {
    return NextResponse.json({ valide: false, nom: '', adresse: '' })
  }

  // Try the new VIES REST API first (more reliable)
  try {
    const res = await fetch(
      `https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          countryCode: countryCode || 'BE',
          vatNumber,
        }),
      }
    )

    if (res.ok) {
      const data = await res.json()
      return NextResponse.json({
        valide: data.valid === true,
        nom: data.name || '',
        adresse: data.address || '',
      })
    }
  } catch {
    // REST API failed, try SOAP fallback
  }

  // Fallback: SOAP API
  try {
    const cc = countryCode || 'BE'
    const soap = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
      xmlns:urn="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
      <soapenv:Body><urn:checkVat>
        <urn:countryCode>${cc}</urn:countryCode>
        <urn:vatNumber>${vatNumber}</urn:vatNumber>
      </urn:checkVat></soapenv:Body></soapenv:Envelope>`

    const res = await fetch(
      'https://ec.europa.eu/taxation_customs/vies/services/checkVatService',
      {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml' },
        body: soap,
      }
    )
    const xml = await res.text()

    return NextResponse.json({
      valide: xml.includes('<valid>true</valid>'),
      nom: xml.match(/<name>(.*?)<\/name>/)?.[1] || '',
      adresse: xml.match(/<address>(.*?)<\/address>/)?.[1] || '',
    })
  } catch {
    return NextResponse.json(
      { valide: false, nom: '', adresse: '', erreur: 'Service VIES indisponible' },
      { status: 503 }
    )
  }
}
