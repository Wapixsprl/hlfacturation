import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer'
import type { Entreprise, Client, Devis, DevisLigne, AcompteConfig } from '@/types/database'

// --- Helpers ---
function fmt(n: number): string {
  return new Intl.NumberFormat('fr-BE', {
    style: 'currency',
    currency: 'EUR',
  }).format(n)
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return ''
  return new Intl.DateTimeFormat('fr-BE', { dateStyle: 'short' }).format(
    new Date(d)
  )
}

function fmtPct(n: number): string {
  return n.toFixed(2).replace('.', ',') + ' %'
}

const uniteLabels: Record<string, string> = {
  h: 'h',
  j: 'jour',
  forfait: 'forfait',
  m2: 'm\u00B2',
  m3: 'm\u00B3',
  ml: 'ml',
  piece: 'pce',
  lot: 'lot',
  kg: 'kg',
  l: 'L',
  autre: '',
}

// --- Styles ---
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#1a1a1a',
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  logo: {
    width: 140,
    height: 50,
    objectFit: 'contain' as const,
  },
  companyInfo: {
    maxWidth: 220,
  },
  companyName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  companyLine: {
    fontSize: 8,
    color: '#555',
    marginBottom: 1,
  },
  // Title
  titleBlock: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 4,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  titleLabel: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
  },
  // Client block
  clientBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  clientBox: {
    backgroundColor: '#fafafa',
    padding: 10,
    borderRadius: 4,
    width: '48%',
  },
  clientBoxTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#888',
    textTransform: 'uppercase' as const,
    marginBottom: 4,
  },
  clientName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  clientLine: {
    fontSize: 8,
    color: '#555',
    marginBottom: 1,
  },
  // Meta
  metaRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  metaLabel: {
    width: 120,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#555',
  },
  metaValue: {
    fontSize: 8,
  },
  // Introduction / Conclusion
  textBlock: {
    marginBottom: 12,
    fontSize: 9,
    color: '#333',
    lineHeight: 1.4,
  },
  // Table
  table: {
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    padding: 6,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableHeaderCell: {
    color: '#fff',
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase' as const,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5e5',
  },
  tableRowAlt: {
    backgroundColor: '#fafafa',
  },
  tableCell: {
    fontSize: 8,
  },
  tableCellRight: {
    fontSize: 8,
    textAlign: 'right' as const,
  },
  // Columns widths (with prices)
  colDesignation: { width: '40%' },
  colQte: { width: '8%', textAlign: 'right' as const },
  colUnite: { width: '8%', textAlign: 'center' as const },
  colPU: { width: '14%', textAlign: 'right' as const },
  colRemise: { width: '10%', textAlign: 'right' as const },
  colTVA: { width: '8%', textAlign: 'right' as const },
  colTotal: { width: '12%', textAlign: 'right' as const },
  // Columns widths (without prices — wider designation)
  colDesignationNoPrix: { width: '72%' },
  colQteNoPrix: { width: '14%', textAlign: 'right' as const },
  colUniteNoPrix: { width: '14%', textAlign: 'center' as const },
  // No prices watermark
  noPricesBanner: {
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
    marginBottom: 15,
    textAlign: 'center' as const,
  },
  noPricesBannerText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#888',
    textTransform: 'uppercase' as const,
  },
  // Section row
  sectionRow: {
    flexDirection: 'row',
    padding: 6,
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5e5',
  },
  sectionText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  // Section subtotal row
  sectionSubtotalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 5,
    paddingRight: 8,
    backgroundColor: '#f0f9ff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#bae6fd',
  },
  sectionSubtotalLabel: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0369a1',
    marginRight: 12,
  },
  sectionSubtotalValue: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0c4a6e',
  },
  // Texte row
  texteRow: {
    padding: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5e5',
  },
  texteContent: {
    fontSize: 8,
    fontStyle: 'italic' as const,
    color: '#555',
  },
  // Description
  description: {
    fontSize: 7,
    color: '#777',
    marginTop: 2,
  },
  // TVA recap
  tvaRecap: {
    marginBottom: 10,
  },
  tvaTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
    color: '#555',
    textTransform: 'uppercase' as const,
  },
  tvaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 2,
  },
  tvaLabel: {
    width: 120,
    fontSize: 8,
    color: '#555',
  },
  tvaValue: {
    width: 90,
    fontSize: 8,
    textAlign: 'right' as const,
  },
  // Totals
  totalsBlock: {
    alignItems: 'flex-end' as const,
    marginBottom: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 3,
  },
  totalLabel: {
    width: 120,
    fontSize: 9,
    color: '#555',
  },
  totalValue: {
    width: 100,
    fontSize: 9,
    textAlign: 'right' as const,
    fontFamily: 'Helvetica-Bold',
  },
  totalTTCRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    marginTop: 3,
  },
  totalTTCLabel: {
    width: 120,
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
  },
  totalTTCValue: {
    width: 100,
    fontSize: 12,
    textAlign: 'right' as const,
    fontFamily: 'Helvetica-Bold',
  },
  // Acomptes
  acomptesBlock: {
    marginTop: 15,
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#e5e7eb',
  },
  acomptesTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  acompteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5e5',
  },
  acompteLabel: {
    fontSize: 8,
    color: '#555',
    flex: 1,
  },
  acomptePct: {
    fontSize: 8,
    color: '#555',
    width: 50,
    textAlign: 'right' as const,
  },
  acompteMontant: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    width: 80,
    textAlign: 'right' as const,
  },
  acompteSoldeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    marginTop: 2,
  },
  acompteSoldeLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    flex: 1,
  },
  // Conditions / Legal
  conditionsBlock: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#fafafa',
    borderRadius: 4,
  },
  conditionsTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
    textTransform: 'uppercase' as const,
    color: '#555',
  },
  conditionsText: {
    fontSize: 8,
    color: '#555',
    lineHeight: 1.4,
  },
  // Signature block
  signatureBlock: {
    marginTop: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#22c55e',
    borderRadius: 4,
    backgroundColor: '#f0fdf4',
  },
  signatureTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#16a34a',
    marginBottom: 6,
  },
  signatureImage: {
    width: 150,
    height: 60,
    objectFit: 'contain' as const,
    marginBottom: 4,
  },
  signatureMeta: {
    fontSize: 7,
    color: '#555',
  },
  // Footer
  footer: {
    position: 'absolute' as const,
    bottom: 25,
    left: 40,
    right: 40,
    textAlign: 'center' as const,
    fontSize: 7,
    color: '#aaa',
    borderTopWidth: 0.5,
    borderTopColor: '#ddd',
    paddingTop: 6,
  },
})

// --- Props ---
export interface DevisPDFProps {
  devis: Devis
  lignes: DevisLigne[]
  client: Client
  entreprise: Entreprise
  hidePrices?: boolean
}

// --- Component ---
// Check for intra-community exemption
function checkExonerationIntracom(client: Client): boolean {
  if (client.type !== 'professionnel') return false
  if (!client.tva_numero) return false
  const prefix = client.tva_numero.replace(/[\s.]/g, '').substring(0, 2).toUpperCase()
  const pays = (client.pays || 'BE').toUpperCase()
  return prefix === 'FR' && pays === 'FR'
}

export function DevisPDF({ devis, lignes, client, entreprise, hidePrices = false }: DevisPDFProps) {
  const isExonere = checkExonerationIntracom(client)

  // Client display name
  const clientName =
    client.type === 'professionnel' && client.raison_sociale
      ? client.raison_sociale
      : [client.prenom, client.nom].filter(Boolean).join(' ') || 'Client'

  // Client address
  const clientAddress = [
    client.adresse,
    [client.code_postal, client.ville].filter(Boolean).join(' '),
    client.pays && client.pays !== 'BE' ? client.pays : null,
  ]
    .filter(Boolean)
    .join('\n')

  // Company address
  const companyAddress = [
    entreprise.adresse,
    [entreprise.code_postal, entreprise.ville].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .join(' - ')

  // TVA recap: group product lines by taux_tva
  const produitLignes = lignes.filter((l) => l.type === 'produit')
  const tvaGroups: Record<number, { baseHT: number; montantTVA: number }> = {}
  for (const l of produitLignes) {
    const taux = l.taux_tva
    if (!tvaGroups[taux]) {
      tvaGroups[taux] = { baseHT: 0, montantTVA: 0 }
    }
    tvaGroups[taux].baseHT += l.total_ht
    tvaGroups[taux].montantTVA += l.total_ht * (taux / 100)
  }

  const round = (n: number) => Math.round(n * 100) / 100

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.companyInfo}>
            {entreprise.logo_url ? (
              <Image src={entreprise.logo_url} style={styles.logo} />
            ) : (
              <Text style={styles.companyName}>{entreprise.nom}</Text>
            )}
            <Text style={styles.companyLine}>{companyAddress}</Text>
            {entreprise.telephone && (
              <Text style={styles.companyLine}>
                Tel: {entreprise.telephone}
              </Text>
            )}
            {entreprise.email && (
              <Text style={styles.companyLine}>{entreprise.email}</Text>
            )}
            {entreprise.tva_numero && (
              <Text style={styles.companyLine}>
                TVA: {entreprise.tva_numero}
              </Text>
            )}
          </View>
          <View>
            <Text style={styles.titleLabel}>DEVIS</Text>
          </View>
        </View>

        {/* META + CLIENT */}
        <View style={styles.clientBlock}>
          {/* Devis info */}
          <View style={styles.clientBox}>
            <Text style={styles.clientBoxTitle}>Devis</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Numero :</Text>
              <Text style={styles.metaValue}>{devis.numero}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Date :</Text>
              <Text style={styles.metaValue}>{fmtDate(devis.date_devis)}</Text>
            </View>
            {devis.date_validite && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Valable jusqu{"'"}au :</Text>
                <Text style={styles.metaValue}>
                  {fmtDate(devis.date_validite)}
                </Text>
              </View>
            )}
            {devis.reference_chantier && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Ref. chantier :</Text>
                <Text style={styles.metaValue}>
                  {devis.reference_chantier}
                </Text>
              </View>
            )}
            {devis.titre && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Objet :</Text>
                <Text style={styles.metaValue}>{devis.titre}</Text>
              </View>
            )}
          </View>

          {/* Client info */}
          <View style={styles.clientBox}>
            <Text style={styles.clientBoxTitle}>Client</Text>
            <Text style={styles.clientName}>{clientName}</Text>
            {clientAddress && (
              <Text style={styles.clientLine}>{clientAddress}</Text>
            )}
            {client.email && (
              <Text style={styles.clientLine}>{client.email}</Text>
            )}
            {client.telephone && (
              <Text style={styles.clientLine}>Tel: {client.telephone}</Text>
            )}
            {client.type === 'professionnel' && client.tva_numero && (
              <Text style={styles.clientLine}>TVA: {client.tva_numero}</Text>
            )}
          </View>
        </View>

        {/* INTRODUCTION */}
        {devis.introduction && (
          <Text style={styles.textBlock}>{devis.introduction}</Text>
        )}

        {/* NO PRICES BANNER */}
        {hidePrices && (
          <View style={styles.noPricesBanner}>
            <Text style={styles.noPricesBannerText}>Document technique — Sans prix</Text>
          </View>
        )}

        {/* LINES TABLE */}
        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, hidePrices ? styles.colDesignationNoPrix : styles.colDesignation]}>
              Designation
            </Text>
            <Text style={[styles.tableHeaderCell, hidePrices ? styles.colQteNoPrix : styles.colQte]}>Qte</Text>
            <Text style={[styles.tableHeaderCell, hidePrices ? styles.colUniteNoPrix : styles.colUnite]}>Unite</Text>
            {!hidePrices && (
              <>
                <Text style={[styles.tableHeaderCell, styles.colPU]}>PU HT</Text>
                <Text style={[styles.tableHeaderCell, styles.colRemise]}>
                  Remise
                </Text>
                <Text style={[styles.tableHeaderCell, styles.colTVA]}>TVA</Text>
                <Text style={[styles.tableHeaderCell, styles.colTotal]}>
                  Total HT
                </Text>
              </>
            )}
          </View>

          {/* Rows */}
          {lignes.map((ligne, i) => {
            // Compute section subtotal
            let sectionSubtotal: number | null = null
            if (ligne.type === 'produit' && !hidePrices) {
              const nextLine = lignes[i + 1]
              if (!nextLine || nextLine.type === 'section' || nextLine.type === 'saut_page') {
                let hasSection = false
                let subtotal = 0
                for (let j = i; j >= 0; j--) {
                  if (lignes[j].type === 'section') { hasSection = true; break }
                  if (lignes[j].type === 'produit') subtotal += lignes[j].total_ht
                }
                if (hasSection) sectionSubtotal = subtotal
              }
            }

            if (ligne.type === 'section') {
              return (
                <View key={ligne.id || i} style={styles.sectionRow}>
                  <Text style={styles.sectionText}>
                    {ligne.designation || ''}
                  </Text>
                </View>
              )
            }

            if (ligne.type === 'texte') {
              return (
                <View key={ligne.id || i} style={styles.texteRow}>
                  <Text style={styles.texteContent}>
                    {ligne.designation || ''}
                  </Text>
                </View>
              )
            }

            if (ligne.type === 'saut_page') {
              return null
            }

            // Produit
            const isAlt = i % 2 === 1
            return (
              <View key={ligne.id || i}>
                <View
                  style={[styles.tableRow, isAlt ? styles.tableRowAlt : {}]}
                >
                  <View style={hidePrices ? styles.colDesignationNoPrix : styles.colDesignation}>
                    <Text style={styles.tableCell}>
                      {ligne.designation || ''}
                    </Text>
                    {ligne.description && (
                      <Text style={styles.description}>{ligne.description}</Text>
                    )}
                  </View>
                  <Text style={[styles.tableCellRight, hidePrices ? styles.colQteNoPrix : styles.colQte]}>
                    {ligne.quantite}
                  </Text>
                  <Text style={[styles.tableCell, hidePrices ? styles.colUniteNoPrix : styles.colUnite]}>
                    {uniteLabels[ligne.unite || 'piece'] || ligne.unite || ''}
                  </Text>
                  {!hidePrices && (
                    <>
                      <Text style={[styles.tableCellRight, styles.colPU]}>
                        {fmt(ligne.prix_unitaire_ht)}
                      </Text>
                      <Text style={[styles.tableCellRight, styles.colRemise]}>
                        {ligne.remise_pct > 0 ? fmtPct(ligne.remise_pct) : '-'}
                      </Text>
                      <Text style={[styles.tableCellRight, styles.colTVA]}>
                        {fmtPct(ligne.taux_tva)}
                      </Text>
                      <Text
                        style={[
                          styles.tableCellRight,
                          styles.colTotal,
                          { fontFamily: 'Helvetica-Bold' },
                        ]}
                      >
                        {fmt(ligne.total_ht)}
                      </Text>
                    </>
                  )}
                </View>
                {sectionSubtotal !== null && (
                  <View style={styles.sectionSubtotalRow}>
                    <Text style={styles.sectionSubtotalLabel}>Sous-total section</Text>
                    <Text style={styles.sectionSubtotalValue}>{fmt(sectionSubtotal)}</Text>
                  </View>
                )}
              </View>
            )
          })}
        </View>

        {/* TVA RECAP */}
        {!hidePrices && Object.keys(tvaGroups).length > 0 && (
          <View style={styles.tvaRecap}>
            <Text style={styles.tvaTitle}>Recapitulatif TVA</Text>
            {Object.entries(tvaGroups)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([taux, group]) => (
                <View key={taux} style={styles.tvaRow}>
                  <Text style={styles.tvaLabel}>
                    Base HT ({fmtPct(Number(taux))}) :
                  </Text>
                  <Text style={styles.tvaValue}>
                    {fmt(round(group.baseHT))}
                  </Text>
                  <Text style={[styles.tvaLabel, { marginLeft: 20 }]}>
                    TVA :
                  </Text>
                  <Text style={styles.tvaValue}>
                    {fmt(round(group.montantTVA))}
                  </Text>
                </View>
              ))}
          </View>
        )}

        {/* TOTALS */}
        {!hidePrices && (
          <View style={styles.totalsBlock}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total HT</Text>
              <Text style={styles.totalValue}>{fmt(devis.total_ht)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total TVA</Text>
              <Text style={styles.totalValue}>{fmt(devis.total_tva)}</Text>
            </View>
            <View style={styles.totalTTCRow}>
              <Text style={styles.totalTTCLabel}>Total TTC</Text>
              <Text style={styles.totalTTCValue}>{fmt(devis.total_ttc)}</Text>
            </View>
          </View>
        )}

        {/* ACOMPTES SCHEDULE */}
        {!hidePrices && (() => {
          const acomptes = (devis.acomptes_config || []) as AcompteConfig[]
          if (acomptes.length === 0) return null
          const totalPct = acomptes.reduce((s, a) => s + a.pourcentage, 0)
          const soldePct = Math.max(0, 100 - totalPct)
          return (
            <View style={styles.acomptesBlock}>
              <Text style={styles.acomptesTitle}>
                Echeancier de paiement
              </Text>
              {acomptes.map((a, i) => (
                <View key={i} style={styles.acompteRow}>
                  <Text style={styles.acompteLabel}>
                    {a.label || `Acompte ${i + 1}`}
                  </Text>
                  <Text style={styles.acomptePct}>{a.pourcentage}%</Text>
                  <Text style={styles.acompteMontant}>
                    {fmt(round(devis.total_ttc * (a.pourcentage / 100)))}
                  </Text>
                </View>
              ))}
              {soldePct > 0 && (
                <View style={styles.acompteSoldeRow}>
                  <Text style={styles.acompteSoldeLabel}>
                    Solde a la fin des travaux
                  </Text>
                  <Text style={styles.acomptePct}>{soldePct}%</Text>
                  <Text style={styles.acompteMontant}>
                    {fmt(round(devis.total_ttc * (soldePct / 100)))}
                  </Text>
                </View>
              )}
            </View>
          )
        })()}

        {/* CONCLUSION */}
        {devis.conclusion && (
          <Text style={styles.textBlock}>{devis.conclusion}</Text>
        )}

        {/* CONDITIONS & LEGAL */}
        <View style={styles.conditionsBlock}>
          {devis.conditions_paiement && (
            <>
              <Text style={styles.conditionsTitle}>Conditions de paiement</Text>
              <Text style={styles.conditionsText}>
                {devis.conditions_paiement}
              </Text>
            </>
          )}
          {devis.date_validite && (
            <Text style={[styles.conditionsText, { marginTop: 4 }]}>
              Ce devis est valable jusqu{"'"}au {fmtDate(devis.date_validite)}.
              Passe ce delai, un nouveau devis devra etre etabli.
            </Text>
          )}
          {isExonere && (
            <Text style={[styles.conditionsText, { marginTop: 4, fontFamily: 'Helvetica-Bold', color: '#b45309' }]}>
              Exoneration {'\u2013'} art. 138 par.1 de la directive TVA
            </Text>
          )}
          {entreprise.mention_tva_defaut && !isExonere && (
            <Text style={[styles.conditionsText, { marginTop: 4 }]}>
              {entreprise.mention_tva_defaut}
            </Text>
          )}
        </View>

        {/* SIGNATURE BLOCK (if signed) */}
        {devis.signature_image && (
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureTitle}>
              Signe electroniquement
            </Text>
            <Image
              src={devis.signature_image}
              style={styles.signatureImage}
            />
            {devis.signature_date && (
              <Text style={styles.signatureMeta}>
                Date : {fmtDate(devis.signature_date)}
              </Text>
            )}
            <Text style={styles.signatureMeta}>
              Document signe electroniquement conformement au reglement eIDAS
              (signature simple).
            </Text>
          </View>
        )}

        {/* FOOTER */}
        <Text style={styles.footer}>
          {entreprise.nom}
          {entreprise.tva_numero ? ` - TVA: ${entreprise.tva_numero}` : ''}
          {entreprise.iban ? ` - IBAN: ${entreprise.iban}` : ''}
          {'\n'}
          {companyAddress}
          {entreprise.telephone ? ` - ${entreprise.telephone}` : ''}
        </Text>
      </Page>
    </Document>
  )
}
