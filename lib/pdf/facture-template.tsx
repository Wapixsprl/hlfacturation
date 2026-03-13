import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer'
import type { Entreprise, Client, Facture, FactureLigne } from '@/types/database'

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
  titleLabel: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
  },
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
  colDesignation: { width: '40%' },
  colQte: { width: '8%', textAlign: 'right' as const },
  colUnite: { width: '8%', textAlign: 'center' as const },
  colPU: { width: '14%', textAlign: 'right' as const },
  colRemise: { width: '10%', textAlign: 'right' as const },
  colTVA: { width: '8%', textAlign: 'right' as const },
  colTotal: { width: '12%', textAlign: 'right' as const },
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
  // Conditions
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
export interface FacturePDFProps {
  facture: Facture
  lignes: FactureLigne[]
  client: Client
  entreprise: Entreprise
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

export function FacturePDF({ facture, lignes, client, entreprise }: FacturePDFProps) {
  const isExonere = checkExonerationIntracom(client)

  const clientName =
    client.type === 'professionnel' && client.raison_sociale
      ? client.raison_sociale
      : [client.prenom, client.nom].filter(Boolean).join(' ') || 'Client'

  const clientAddress = [
    client.adresse,
    [client.code_postal, client.ville].filter(Boolean).join(' '),
    client.pays && client.pays !== 'BE' ? client.pays : null,
  ]
    .filter(Boolean)
    .join('\n')

  const companyAddress = [
    entreprise.adresse,
    [entreprise.code_postal, entreprise.ville].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .join(' - ')

  // TVA recap
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

  const typeLabel = facture.type === 'avoir' ? 'AVOIR' : facture.type === 'acompte' ? 'FACTURE D\'ACOMPTE' : 'FACTURE'

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
            <Text style={styles.titleLabel}>{typeLabel}</Text>
          </View>
        </View>

        {/* META + CLIENT */}
        <View style={styles.clientBlock}>
          <View style={styles.clientBox}>
            <Text style={styles.clientBoxTitle}>Facture</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Numero :</Text>
              <Text style={styles.metaValue}>{facture.numero}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Date :</Text>
              <Text style={styles.metaValue}>{fmtDate(facture.date_facture)}</Text>
            </View>
            {facture.date_echeance && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Echeance :</Text>
                <Text style={styles.metaValue}>
                  {fmtDate(facture.date_echeance)}
                </Text>
              </View>
            )}
          </View>

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

        {/* LINES TABLE */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colDesignation]}>
              Designation
            </Text>
            <Text style={[styles.tableHeaderCell, styles.colQte]}>Qte</Text>
            <Text style={[styles.tableHeaderCell, styles.colUnite]}>Unite</Text>
            <Text style={[styles.tableHeaderCell, styles.colPU]}>PU HT</Text>
            <Text style={[styles.tableHeaderCell, styles.colRemise]}>
              Remise
            </Text>
            <Text style={[styles.tableHeaderCell, styles.colTVA]}>TVA</Text>
            <Text style={[styles.tableHeaderCell, styles.colTotal]}>
              Total HT
            </Text>
          </View>

          {lignes.map((ligne, i) => {
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

            const isAlt = i % 2 === 1
            return (
              <View
                key={ligne.id || i}
                style={[styles.tableRow, isAlt ? styles.tableRowAlt : {}]}
              >
                <View style={styles.colDesignation}>
                  <Text style={styles.tableCell}>
                    {ligne.designation || ''}
                  </Text>
                  {ligne.description && (
                    <Text style={styles.description}>{ligne.description}</Text>
                  )}
                </View>
                <Text style={[styles.tableCellRight, styles.colQte]}>
                  {ligne.quantite}
                </Text>
                <Text style={[styles.tableCell, styles.colUnite]}>
                  {uniteLabels[ligne.unite || 'piece'] || ligne.unite || ''}
                </Text>
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
              </View>
            )
          })}
        </View>

        {/* TVA RECAP */}
        {Object.keys(tvaGroups).length > 0 && (
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
        <View style={styles.totalsBlock}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total HT</Text>
            <Text style={styles.totalValue}>{fmt(facture.total_ht)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total TVA</Text>
            <Text style={styles.totalValue}>{fmt(facture.total_tva)}</Text>
          </View>
          <View style={styles.totalTTCRow}>
            <Text style={styles.totalTTCLabel}>Total TTC</Text>
            <Text style={styles.totalTTCValue}>{fmt(facture.total_ttc)}</Text>
          </View>
        </View>

        {/* CONDITIONS & LEGAL */}
        <View style={styles.conditionsBlock}>
          {facture.conditions_paiement && (
            <>
              <Text style={styles.conditionsTitle}>Conditions de paiement</Text>
              <Text style={styles.conditionsText}>
                {facture.conditions_paiement}
              </Text>
            </>
          )}
          {facture.date_echeance && (
            <Text style={[styles.conditionsText, { marginTop: 4 }]}>
              Date d{"'"}echeance : {fmtDate(facture.date_echeance)}
            </Text>
          )}
          {isExonere && (
            <Text style={[styles.conditionsText, { marginTop: 4, fontFamily: 'Helvetica-Bold', color: '#b45309' }]}>
              Exoneration {'\u2013'} art. 138 par.1 de la directive TVA
            </Text>
          )}
          {facture.mention_tva && !isExonere && (
            <Text style={[styles.conditionsText, { marginTop: 4 }]}>
              {facture.mention_tva}
            </Text>
          )}
          {entreprise.mention_tva_defaut && !facture.mention_tva && !isExonere && (
            <Text style={[styles.conditionsText, { marginTop: 4 }]}>
              {entreprise.mention_tva_defaut}
            </Text>
          )}
        </View>

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
