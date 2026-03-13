'use client'

import { useState } from 'react'
import type { Entreprise, RelancesConfig, RelanceTypeConfig } from '@/types/database'
import { DEFAULT_RELANCES_CONFIG, DEFAULT_RELANCE_EMAILS } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Loader2,
  Save,
  Plus,
  Trash2,
  Mail,
  FileText,
  ShoppingCart,
  Clock,
  ToggleLeft,
  ToggleRight,
  GripVertical,
  Info,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react'

interface Props {
  entreprise: Entreprise
}

type RelanceType = 'devis' | 'factures_vente' | 'factures_achat'

const TYPE_LABELS: Record<RelanceType, { title: string; description: string; icon: typeof Mail; joursLabel: string; variables: { key: string; label: string }[] }> = {
  devis: {
    title: 'Relances devis',
    description: 'Rappels envoyes aux clients avant l\'expiration du devis.',
    icon: FileText,
    joursLabel: 'jours avant expiration',
    variables: [
      { key: '{{client}}', label: 'Nom du client' },
      { key: '{{numero}}', label: 'Numero du devis' },
      { key: '{{montant}}', label: 'Montant TTC' },
      { key: '{{date_validite}}', label: 'Date de validite' },
    ],
  },
  factures_vente: {
    title: 'Relances factures vente',
    description: 'Rappels envoyes aux clients apres l\'echeance de la facture.',
    icon: Mail,
    joursLabel: 'jours apres echeance',
    variables: [
      { key: '{{client}}', label: 'Nom du client' },
      { key: '{{numero}}', label: 'Numero de la facture' },
      { key: '{{montant}}', label: 'Montant restant' },
      { key: '{{date_echeance}}', label: 'Date d\'echeance' },
      { key: '{{jours_retard}}', label: 'Jours de retard' },
    ],
  },
  factures_achat: {
    title: 'Relances factures achat',
    description: 'Rappels internes pour le suivi des echeances fournisseurs.',
    icon: ShoppingCart,
    joursLabel: 'jours apres echeance',
    variables: [
      { key: '{{fournisseur}}', label: 'Nom du fournisseur' },
      { key: '{{numero}}', label: 'Numero de la facture' },
      { key: '{{montant}}', label: 'Montant du' },
      { key: '{{date_echeance}}', label: 'Date d\'echeance' },
      { key: '{{jours_retard}}', label: 'Jours de retard' },
    ],
  },
}

function RelanceTypeSection({
  type,
  config,
  onChange,
}: {
  type: RelanceType
  config: RelanceTypeConfig
  onChange: (updated: RelanceTypeConfig) => void
}) {
  const meta = TYPE_LABELS[type]
  const Icon = meta.icon
  const [showEmail, setShowEmail] = useState(false)

  const toggleEnabled = () => {
    onChange({ ...config, enabled: !config.enabled })
  }

  const toggleEtape = (index: number) => {
    const newEtapes = [...config.etapes]
    newEtapes[index] = { ...newEtapes[index], enabled: !newEtapes[index].enabled }
    onChange({ ...config, etapes: newEtapes })
  }

  const updateEtapeJours = (index: number, jours: number) => {
    const newEtapes = [...config.etapes]
    newEtapes[index] = { ...newEtapes[index], jours: Math.max(0, jours) }
    onChange({ ...config, etapes: newEtapes })
  }

  const addEtape = () => {
    const lastJours = config.etapes.length > 0 ? config.etapes[config.etapes.length - 1].jours : 7
    const newJours = type === 'devis' ? Math.max(0, lastJours - 2) : lastJours + 15
    onChange({
      ...config,
      etapes: [...config.etapes, { jours: newJours, enabled: true }],
    })
  }

  const removeEtape = (index: number) => {
    onChange({
      ...config,
      etapes: config.etapes.filter((_, i) => i !== index),
    })
  }

  const updateEspacement = (jours: number) => {
    onChange({ ...config, espacement_minimum_jours: Math.max(1, jours) })
  }

  const resetEmailToDefault = () => {
    const defaults = DEFAULT_RELANCE_EMAILS[type]
    onChange({
      ...config,
      objet_email: defaults.objet,
      contenu_email: defaults.contenu,
    })
  }

  return (
    <Card className={!config.enabled ? 'opacity-60' : ''}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config.enabled ? 'bg-[#17C2D7]/10' : 'bg-[#F3F4F6]'}`}>
              <Icon className={`h-5 w-5 ${config.enabled ? 'text-[#17C2D7]' : 'text-[#9CA3AF]'}`} />
            </div>
            <div>
              <CardTitle className="text-base">{meta.title}</CardTitle>
              <CardDescription className="text-xs mt-0.5">{meta.description}</CardDescription>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleEnabled}
            className="flex items-center gap-2 text-sm font-medium cursor-pointer"
          >
            {config.enabled ? (
              <>
                <ToggleRight className="h-6 w-6 text-[#17C2D7]" />
                <span className="text-[#17C2D7]">Actif</span>
              </>
            ) : (
              <>
                <ToggleLeft className="h-6 w-6 text-[#9CA3AF]" />
                <span className="text-[#9CA3AF]">Inactif</span>
              </>
            )}
          </button>
        </div>
      </CardHeader>

      {config.enabled && (
        <CardContent className="space-y-4">
          {/* Etapes list */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">
              Etapes de relance
            </Label>
            {config.etapes.length === 0 && (
              <p className="text-sm text-[#9CA3AF] italic py-2">Aucune etape configuree.</p>
            )}
            {config.etapes.map((etape, index) => (
              <div
                key={index}
                className="flex items-center gap-3 bg-[#F9FAFB] rounded-lg px-3 py-2.5 border border-[#E5E7EB]"
              >
                <GripVertical className="h-4 w-4 text-[#D1D5DB] flex-shrink-0" />
                <Badge
                  variant="outline"
                  className={`text-xs flex-shrink-0 ${
                    etape.enabled
                      ? 'border-[#17C2D7]/30 text-[#17C2D7] bg-[#17C2D7]/5'
                      : 'border-[#E5E7EB] text-[#9CA3AF] bg-white'
                  }`}
                >
                  {index + 1}{index === 0 ? 'er' : 'e'} rappel
                </Badge>
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    type="number"
                    min={0}
                    value={etape.jours}
                    onChange={(e) => updateEtapeJours(index, parseInt(e.target.value) || 0)}
                    className="w-20 h-8 text-sm text-center"
                  />
                  <span className="text-xs text-[#6B7280] whitespace-nowrap">{meta.joursLabel}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleEtape(index)}
                    className="p-1.5 rounded-md hover:bg-white transition-colors cursor-pointer"
                    title={etape.enabled ? 'Desactiver' : 'Activer'}
                  >
                    {etape.enabled ? (
                      <ToggleRight className="h-4 w-4 text-[#17C2D7]" />
                    ) : (
                      <ToggleLeft className="h-4 w-4 text-[#9CA3AF]" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeEtape(index)}
                    className="p-1.5 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4 text-[#9CA3AF] hover:text-red-500" />
                  </button>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addEtape}
              className="w-full border-dashed"
            >
              <Plus className="h-4 w-4" />
              Ajouter une etape
            </Button>
          </div>

          {/* Espacement minimum */}
          <div className="flex items-center gap-3 pt-2 border-t border-[#F3F4F6]">
            <Clock className="h-4 w-4 text-[#9CA3AF] flex-shrink-0" />
            <Label className="text-sm text-[#374151] whitespace-nowrap">
              Espacement minimum entre relances
            </Label>
            <Input
              type="number"
              min={1}
              value={config.espacement_minimum_jours}
              onChange={(e) => updateEspacement(parseInt(e.target.value) || 1)}
              className="w-20 h-8 text-sm text-center"
            />
            <span className="text-xs text-[#6B7280]">jours</span>
          </div>

          {/* Email template section */}
          <div className="pt-2 border-t border-[#F3F4F6]">
            <button
              type="button"
              className="flex items-center gap-2 w-full text-left cursor-pointer group"
              onClick={() => setShowEmail(!showEmail)}
            >
              <Mail className="h-4 w-4 text-[#9CA3AF] group-hover:text-[#6B7280] transition-colors" />
              <span className="text-sm font-medium text-[#374151] flex-1">Contenu de l{"'"}email</span>
              {showEmail ? (
                <ChevronUp className="h-4 w-4 text-[#9CA3AF]" />
              ) : (
                <ChevronDown className="h-4 w-4 text-[#9CA3AF]" />
              )}
            </button>

            {showEmail && (
              <div className="mt-3 space-y-3">
                {/* Variables disponibles */}
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[11px] text-[#9CA3AF] font-medium uppercase tracking-wide mr-1 self-center">Variables :</span>
                  {meta.variables.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[11px] text-[#6B7280] hover:bg-[#E5E7EB] hover:text-[#374151] transition-colors cursor-pointer"
                      onClick={() => {
                        navigator.clipboard.writeText(v.key)
                        toast.success(`${v.key} copie`)
                      }}
                      title={`Cliquer pour copier ${v.key}`}
                    >
                      <code className="font-mono">{v.key}</code>
                      <span className="text-[#9CA3AF]">= {v.label}</span>
                    </button>
                  ))}
                </div>

                {/* Objet email */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#6B7280]">Objet de l{"'"}email</Label>
                  <Input
                    value={config.objet_email || DEFAULT_RELANCE_EMAILS[type].objet}
                    onChange={(e) => onChange({ ...config, objet_email: e.target.value })}
                    className="text-sm"
                    placeholder={DEFAULT_RELANCE_EMAILS[type].objet}
                  />
                </div>

                {/* Contenu email */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#6B7280]">Contenu de l{"'"}email</Label>
                  <textarea
                    value={config.contenu_email || DEFAULT_RELANCE_EMAILS[type].contenu}
                    onChange={(e) => onChange({ ...config, contenu_email: e.target.value })}
                    className="w-full min-h-[160px] rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#17C2D7]/30 focus:border-[#17C2D7] resize-y"
                    placeholder={DEFAULT_RELANCE_EMAILS[type].contenu}
                  />
                </div>

                {/* Reset to default */}
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-xs text-[#9CA3AF] hover:text-[#6B7280] transition-colors cursor-pointer"
                  onClick={resetEmailToDefault}
                >
                  <RotateCcw className="h-3 w-3" />
                  Reinitialiser le texte par defaut
                </button>
              </div>
            )}
          </div>

          {/* Info box for devis */}
          {type === 'devis' && (
            <div className="flex items-start gap-2 bg-[#FEF3C7] rounded-lg p-3 text-xs text-[#92400E]">
              <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>
                Pour les devis, les jours correspondent au nombre de jours <strong>avant</strong> la date de validite.
                0 = relance le jour de l{"'"}expiration.
              </span>
            </div>
          )}

          {type === 'factures_achat' && (
            <div className="flex items-start gap-2 bg-[#EFF6FF] rounded-lg p-3 text-xs text-[#1E40AF]">
              <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>
                Les relances factures achat sont des <strong>rappels internes</strong> envoyes a l{"'"}adresse email
                de votre entreprise pour vous rappeler les echeances fournisseurs a regler.
              </span>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

export function RelancesTab({ entreprise }: Props) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState<RelancesConfig>(() => {
    const saved = entreprise.relances_config as RelancesConfig | null
    if (!saved) return DEFAULT_RELANCES_CONFIG
    // Merge saved config with defaults to ensure new fields have values
    return {
      devis: {
        ...DEFAULT_RELANCES_CONFIG.devis,
        ...saved.devis,
        objet_email: saved.devis?.objet_email || DEFAULT_RELANCE_EMAILS.devis.objet,
        contenu_email: saved.devis?.contenu_email || DEFAULT_RELANCE_EMAILS.devis.contenu,
      },
      factures_vente: {
        ...DEFAULT_RELANCES_CONFIG.factures_vente,
        ...saved.factures_vente,
        objet_email: saved.factures_vente?.objet_email || DEFAULT_RELANCE_EMAILS.factures_vente.objet,
        contenu_email: saved.factures_vente?.contenu_email || DEFAULT_RELANCE_EMAILS.factures_vente.contenu,
      },
      factures_achat: {
        ...DEFAULT_RELANCES_CONFIG.factures_achat,
        ...saved.factures_achat,
        objet_email: saved.factures_achat?.objet_email || DEFAULT_RELANCE_EMAILS.factures_achat.objet,
        contenu_email: saved.factures_achat?.contenu_email || DEFAULT_RELANCE_EMAILS.factures_achat.contenu,
      },
    }
  })
  const [isDirty, setIsDirty] = useState(false)

  const handleChange = (type: RelanceType, updated: RelanceTypeConfig) => {
    setConfig((prev) => ({ ...prev, [type]: updated }))
    setIsDirty(true)
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('entreprises')
        .update({
          relances_config: config as unknown as Record<string, unknown>,
          updated_at: new Date().toISOString(),
        })
        .eq('id', entreprise.id)

      if (error) throw error
      toast.success('Configuration des relances enregistree')
      setIsDirty(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#111827]">Relances automatiques</h2>
          <p className="text-sm text-[#6B7280] mt-0.5">
            Configurez les rappels automatiques et personnalisez le contenu des emails.
          </p>
        </div>
        <Button onClick={handleSave} disabled={loading || !isDirty}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer
        </Button>
      </div>

      <RelanceTypeSection
        type="devis"
        config={config.devis}
        onChange={(updated) => handleChange('devis', updated)}
      />

      <RelanceTypeSection
        type="factures_vente"
        config={config.factures_vente}
        onChange={(updated) => handleChange('factures_vente', updated)}
      />

      <RelanceTypeSection
        type="factures_achat"
        config={config.factures_achat}
        onChange={(updated) => handleChange('factures_achat', updated)}
      />

      <div className="flex items-start gap-2 bg-[#F9FAFB] rounded-lg p-4 text-xs text-[#6B7280] border border-[#E5E7EB]">
        <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p>
            Les relances sont envoyees automatiquement chaque matin a 8h.
            Le systeme respecte l{"'"}espacement minimum entre chaque relance pour eviter le spam.
          </p>
          <p>
            Le nombre de relances par document est limite au nombre d{"'"}etapes configurees.
            Une fois toutes les etapes passees, plus aucune relance n{"'"}est envoyee.
          </p>
        </div>
      </div>
    </div>
  )
}
