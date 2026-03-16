import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer'

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

function fmtDateLong(d: string | null | undefined): string {
  if (!d) return ''
  return new Intl.DateTimeFormat('fr-BE', { dateStyle: 'long' }).format(
    new Date(d)
  )
}

// --- Colors ---
const COLORS = {
  primary: '#1B3A6B',
  accent: '#17C2D7',
  textDark: '#111827',
  textMedium: '#374151',
  textLight: '#6B7280',
  bgLight: '#F3F4F6',
  bgLighter: '#F9FAFB',
  border: '#E5E7EB',
  white: '#FFFFFF',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
}

// --- Styles ---
const styles = StyleSheet.create({
  page: {
    padding: 40,
    paddingBottom: 60,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: COLORS.textDark,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  logo: {
    width: 130,
    height: 45,
    objectFit: 'contain' as const,
  },
  companyName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
  },
  headerRight: {
    alignItems: 'flex-end' as const,
  },
  reportTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  reportSubtitle: {
    fontSize: 10,
    color: COLORS.textLight,
  },
  // Chantier info block
  infoBlock: {
    backgroundColor: COLORS.bgLighter,
    borderRadius: 4,
    padding: 12,
    marginBottom: 15,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  infoTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
    marginBottom: 2,
  },
  infoNumero: {
    fontSize: 10,
    color: COLORS.accent,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  infoCol: {
    width: '50%',
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 7,
    color: COLORS.textLight,
    textTransform: 'uppercase' as const,
    marginBottom: 1,
  },
  infoValue: {
    fontSize: 9,
    color: COLORS.textMedium,
  },
  infoValueBold: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.textDark,
  },
  // Badge
  badge: {
    fontSize: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontFamily: 'Helvetica-Bold',
  },
  // Section headers
  sectionHeader: {
    backgroundColor: COLORS.primary,
    padding: 8,
    borderRadius: 4,
    marginTop: 15,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.white,
    textTransform: 'uppercase' as const,
  },
  // Summary cards
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.bgLighter,
    borderRadius: 4,
    padding: 10,
    alignItems: 'center' as const,
  },
  summaryValue: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 7,
    color: COLORS.textLight,
    textTransform: 'uppercase' as const,
  },
  // Journal entry
  journalEntry: {
    marginBottom: 8,
    padding: 8,
    backgroundColor: COLORS.bgLighter,
    borderRadius: 4,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.accent,
  },
  journalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  journalDate: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
  },
  journalMeta: {
    fontSize: 7,
    color: COLORS.textLight,
  },
  journalType: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.accent,
    textTransform: 'uppercase' as const,
  },
  journalContent: {
    fontSize: 8,
    color: COLORS.textMedium,
    lineHeight: 1.4,
  },
  journalAvancement: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    marginRight: 6,
  },
  progressBarFill: {
    height: 6,
    backgroundColor: COLORS.accent,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.accent,
  },
  journalPhotoNote: {
    fontSize: 7,
    color: COLORS.textLight,
    fontStyle: 'italic' as const,
    marginTop: 3,
  },
  // Table
  table: {
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    padding: 6,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableHeaderCell: {
    color: COLORS.white,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase' as const,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  tableRowAlt: {
    backgroundColor: COLORS.bgLighter,
  },
  tableCell: {
    fontSize: 8,
    color: COLORS.textMedium,
  },
  // Tache columns
  colTache: { width: '55%' },
  colStatut: { width: '15%', textAlign: 'center' as const },
  colAssigne: { width: '30%' },
  // Photos grid
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoContainer: {
    width: 160,
    marginBottom: 8,
  },
  photoImage: {
    width: 160,
    height: 120,
    objectFit: 'cover' as const,
    borderRadius: 4,
  },
  photoCaption: {
    fontSize: 7,
    color: COLORS.textLight,
    marginTop: 2,
  },
  // Footer
  footer: {
    position: 'absolute' as const,
    bottom: 25,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7,
    color: COLORS.textLight,
  },
  // Meteo
  meteoText: {
    fontSize: 7,
    color: COLORS.textLight,
  },
})

// --- Type labels ---
const STATUT_LABELS: Record<string, string> = {
  a_planifier: 'A planifier',
  planifie: 'Planifie',
  en_cours: 'En cours',
  termine: 'Termine',
  livre: 'Livre',
}

const PRIORITE_LABELS: Record<string, string> = {
  basse: 'Basse',
  normale: 'Normale',
  haute: 'Haute',
  urgente: 'Urgente',
}

const JOURNAL_TYPE_LABELS: Record<string, string> = {
  commentaire: 'Commentaire',
  photo: 'Photo',
  incident: 'Incident',
  livraison_materiel: 'Livraison',
  avancement: 'Avancement',
  reception: 'Reception',
}

const METEO_LABELS: Record<string, string> = {
  ensoleille: 'Ensoleille',
  nuageux: 'Nuageux',
  pluie: 'Pluie',
  neige: 'Neige',
}

const TACHE_STATUT_LABELS: Record<string, string> = {
  a_faire: 'A faire',
  en_cours: 'En cours',
  termine: 'Termine',
}

// --- Props ---
interface ClientInfo {
  id: string
  nom: string | null
  prenom: string | null
  raison_sociale: string | null
  type: string
  email: string | null
  telephone: string | null
  adresse: string | null
  code_postal: string | null
  ville: string | null
}

interface EquipeInfo {
  id: string
  nom: string
  couleur: string
}

interface DevisInfo {
  id: string
  numero: string
  total_ht: number
  total_ttc: number
  statut: string
}

interface JournalEntry {
  id: string
  date_entree: string
  type: string
  contenu: string | null
  photos: string[] | null
  meteo: string | null
  avancement_pct: number | null
  auteur?: { id: string; nom: string | null; prenom: string | null } | null
}

interface TacheInfo {
  id: string
  titre: string
  statut: string
  equipe?: { id: string; nom: string } | null
}

interface SousTraitantInfo {
  id: string
  role: string | null
  montant_prevu_ht: number
  fournisseur?: { id: string; raison_sociale: string } | null
}

interface EntrepriseInfo {
  nom: string
  logo_url: string | null
  tva_numero: string | null
  telephone: string | null
  email: string | null
  adresse: string | null
  code_postal: string | null
  ville: string | null
}

interface ChantierInfo {
  id: string
  numero: string
  titre: string
  description: string | null
  adresse: string | null
  code_postal: string | null
  ville: string | null
  statut: string
  priorite: string
  date_debut: string | null
  date_fin_prevue: string | null
  date_fin_reelle: string | null
  budget_ht: number
  cout_reel_ht: number
  notes_internes: string | null
}

export interface ChantierRapportPDFProps {
  chantier: ChantierInfo
  client: ClientInfo
  equipe: EquipeInfo | null
  devis: DevisInfo | null
  journal: JournalEntry[]
  taches: TacheInfo[]
  sousTraitants: SousTraitantInfo[]
  entreprise: EntrepriseInfo
}

// --- Helper to get client display name ---
function getClientName(client: ClientInfo): string {
  if (client.type === 'professionnel' && client.raison_sociale) {
    return client.raison_sociale
  }
  return [client.prenom, client.nom].filter(Boolean).join(' ') || 'Client'
}

function getClientAddress(client: ClientInfo): string {
  return [
    client.adresse,
    [client.code_postal, client.ville].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .join(', ')
}

function getAuteurName(auteur?: { nom: string | null; prenom: string | null } | null): string {
  if (!auteur) return 'Inconnu'
  return [auteur.prenom, auteur.nom].filter(Boolean).join(' ') || 'Inconnu'
}

// --- Collect all photo URLs from journal ---
function collectPhotos(journal: JournalEntry[]): { url: string; date: string; auteur: string }[] {
  const photos: { url: string; date: string; auteur: string }[] = []
  for (const entry of journal) {
    if (entry.photos && Array.isArray(entry.photos)) {
      for (const url of entry.photos) {
        photos.push({
          url,
          date: entry.date_entree,
          auteur: getAuteurName(entry.auteur),
        })
      }
    }
  }
  return photos
}

// --- Component ---
export function ChantierRapportPDF({
  chantier,
  client,
  equipe,
  devis,
  journal,
  taches,
  sousTraitants,
  entreprise,
}: ChantierRapportPDFProps) {
  const completedTaches = taches.filter(t => t.statut === 'termine').length
  const totalTaches = taches.length
  const avancementGlobal = totalTaches > 0 ? Math.round((completedTaches / totalTaches) * 100) : 0

  // Get latest avancement from journal
  const latestAvancement = journal
    .filter(j => j.avancement_pct !== null)
    .sort((a, b) => new Date(b.date_entree).getTime() - new Date(a.date_entree).getTime())[0]

  const avancementPct = latestAvancement?.avancement_pct ?? avancementGlobal

  const allPhotos = collectPhotos(journal)
  const totalPhotos = allPhotos.length

  const generatedDate = fmtDateLong(new Date().toISOString())

  const chantierAddress = [chantier.adresse, chantier.code_postal, chantier.ville]
    .filter(Boolean)
    .join(', ')

  return (
    <Document>
      {/* Page 1 - Header + Resume */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            {entreprise.logo_url ? (
              <Image src={entreprise.logo_url} style={styles.logo} />
            ) : (
              <Text style={styles.companyName}>{entreprise.nom}</Text>
            )}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.reportTitle}>Rapport de Chantier</Text>
            <Text style={styles.reportSubtitle}>
              Genere le {generatedDate}
            </Text>
          </View>
        </View>

        {/* Chantier Info Block */}
        <View style={styles.infoBlock}>
          <Text style={styles.infoTitle}>{chantier.titre}</Text>
          <Text style={styles.infoNumero}>{chantier.numero}</Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Client</Text>
              <Text style={styles.infoValueBold}>{getClientName(client)}</Text>
              {getClientAddress(client) ? (
                <Text style={styles.infoValue}>{getClientAddress(client)}</Text>
              ) : null}
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Adresse chantier</Text>
              <Text style={styles.infoValue}>{chantierAddress || '—'}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Statut</Text>
              <Text style={styles.infoValueBold}>
                {STATUT_LABELS[chantier.statut] || chantier.statut}
              </Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Priorite</Text>
              <Text style={styles.infoValue}>
                {PRIORITE_LABELS[chantier.priorite] || chantier.priorite}
              </Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Date de debut</Text>
              <Text style={styles.infoValue}>{fmtDate(chantier.date_debut) || '—'}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Date de fin prevue</Text>
              <Text style={styles.infoValue}>{fmtDate(chantier.date_fin_prevue) || '—'}</Text>
            </View>
            {chantier.date_fin_reelle && (
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>Date de fin reelle</Text>
                <Text style={styles.infoValue}>{fmtDate(chantier.date_fin_reelle)}</Text>
              </View>
            )}
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Equipe</Text>
              <Text style={styles.infoValue}>{equipe?.nom || 'Non assignee'}</Text>
            </View>
            {devis && (
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>Budget HT (devis {devis.numero})</Text>
                <Text style={styles.infoValueBold}>{fmt(devis.total_ht)}</Text>
              </View>
            )}
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Budget HT</Text>
              <Text style={styles.infoValueBold}>{fmt(chantier.budget_ht)}</Text>
            </View>
          </View>
        </View>

        {/* Section Resume */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Resume</Text>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{avancementPct}%</Text>
            <Text style={styles.summaryLabel}>Avancement</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{journal.length}</Text>
            <Text style={styles.summaryLabel}>Entrees journal</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{completedTaches}/{totalTaches}</Text>
            <Text style={styles.summaryLabel}>Taches terminees</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{totalPhotos}</Text>
            <Text style={styles.summaryLabel}>Photos</Text>
          </View>
        </View>

        {/* Avancement progress bar */}
        <View style={{ marginBottom: 10 }}>
          <View style={styles.journalAvancement}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${avancementPct}%` }]} />
            </View>
            <Text style={styles.progressText}>{avancementPct}%</Text>
          </View>
        </View>

        {/* Budget summary */}
        <View style={[styles.summaryRow, { marginTop: 5 }]}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{fmt(chantier.budget_ht)}</Text>
            <Text style={styles.summaryLabel}>Budget HT</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{fmt(chantier.cout_reel_ht)}</Text>
            <Text style={styles.summaryLabel}>Cout reel HT</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[
              styles.summaryValue,
              { color: chantier.budget_ht - chantier.cout_reel_ht >= 0 ? COLORS.success : COLORS.danger },
            ]}>
              {fmt(chantier.budget_ht - chantier.cout_reel_ht)}
            </Text>
            <Text style={styles.summaryLabel}>Marge</Text>
          </View>
        </View>

        {/* Sous-traitants */}
        {sousTraitants.length > 0 && (
          <View style={{ marginTop: 10 }}>
            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: COLORS.textDark, marginBottom: 6 }}>
              Sous-traitants
            </Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: '50%' }]}>Fournisseur</Text>
                <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Role</Text>
                <Text style={[styles.tableHeaderCell, { width: '25%', textAlign: 'right' as const }]}>Montant HT</Text>
              </View>
              {sousTraitants.map((st, i) => (
                <View key={st.id} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                  <Text style={[styles.tableCell, { width: '50%' }]}>
                    {st.fournisseur?.raison_sociale || '—'}
                  </Text>
                  <Text style={[styles.tableCell, { width: '25%' }]}>
                    {st.role || '—'}
                  </Text>
                  <Text style={[styles.tableCell, { width: '25%', textAlign: 'right' as const, fontFamily: 'Helvetica-Bold' }]}>
                    {fmt(st.montant_prevu_ht)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            HL Renovation — Rapport genere le {generatedDate}
          </Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>

      {/* Page 2+ - Journal de chantier */}
      {journal.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Journal de chantier</Text>
          </View>

          {journal.map(entry => (
            <View key={entry.id} style={styles.journalEntry} wrap={false}>
              <View style={styles.journalHeader}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Text style={styles.journalDate}>{fmtDate(entry.date_entree)}</Text>
                  <Text style={styles.journalType}>
                    {JOURNAL_TYPE_LABELS[entry.type] || entry.type}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {entry.meteo && (
                    <Text style={styles.meteoText}>
                      {METEO_LABELS[entry.meteo] || entry.meteo}
                    </Text>
                  )}
                  <Text style={styles.journalMeta}>
                    {getAuteurName(entry.auteur)}
                  </Text>
                </View>
              </View>
              {entry.contenu && (
                <Text style={styles.journalContent}>{entry.contenu}</Text>
              )}
              {entry.avancement_pct !== null && (
                <View style={styles.journalAvancement}>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${entry.avancement_pct}%` }]} />
                  </View>
                  <Text style={styles.progressText}>{entry.avancement_pct}%</Text>
                </View>
              )}
              {entry.photos && Array.isArray(entry.photos) && entry.photos.length > 0 && (
                <Text style={styles.journalPhotoNote}>
                  [{entry.photos.length} photo{entry.photos.length > 1 ? 's' : ''} jointe{entry.photos.length > 1 ? 's' : ''}]
                </Text>
              )}
            </View>
          ))}

          {/* Footer */}
          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>
              HL Renovation — Rapport genere le {generatedDate}
            </Text>
            <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
          </View>
        </Page>
      )}

      {/* Page - Taches */}
      {taches.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Taches ({completedTaches}/{totalTaches} terminees)</Text>
          </View>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colTache]}>Tache</Text>
              <Text style={[styles.tableHeaderCell, styles.colStatut]}>Statut</Text>
              <Text style={[styles.tableHeaderCell, styles.colAssigne]}>Equipe</Text>
            </View>
            {taches.map((tache, i) => (
              <View key={tache.id} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                <Text style={[styles.tableCell, styles.colTache]}>
                  {tache.titre}
                </Text>
                <Text style={[
                  styles.tableCell,
                  styles.colStatut,
                  {
                    fontFamily: 'Helvetica-Bold',
                    color: tache.statut === 'termine' ? COLORS.success : COLORS.textLight,
                  },
                ]}>
                  {tache.statut === 'termine' ? 'Termine' : (TACHE_STATUT_LABELS[tache.statut] || tache.statut)}
                </Text>
                <Text style={[styles.tableCell, styles.colAssigne]}>
                  {tache.equipe?.nom || '—'}
                </Text>
              </View>
            ))}
          </View>

          {/* Footer */}
          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>
              HL Renovation — Rapport genere le {generatedDate}
            </Text>
            <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
          </View>
        </Page>
      )}

      {/* Page - Photos */}
      {allPhotos.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Photos ({allPhotos.length})</Text>
          </View>

          <View style={styles.photosGrid}>
            {allPhotos.map((photo, i) => (
              <View key={`photo-${i}`} style={styles.photoContainer} wrap={false}>
                <Image src={photo.url} style={styles.photoImage} />
                <Text style={styles.photoCaption}>
                  {fmtDate(photo.date)} — {photo.auteur}
                </Text>
              </View>
            ))}
          </View>

          {/* Footer */}
          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>
              HL Renovation — Rapport genere le {generatedDate}
            </Text>
            <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
          </View>
        </Page>
      )}
    </Document>
  )
}
