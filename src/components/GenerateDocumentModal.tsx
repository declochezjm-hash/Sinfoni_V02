import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatApiError } from '../lib/formatApiError';
import { uploadDocumentToStorage, type DocumentCategory } from '../hooks/useDocuments';
import type { Project } from '../types';
import {
  ADMINISTRATIVE_TEMPLATES,
  downloadBlob,
  generateAdministrativeDocumentPdf,
  type AdministrativeTemplateId,
} from '../utils/administrativeDocumentGenerator';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Label } from './ui/label';

export interface AffaireOption {
  id: string;
  name: string;
  code: string;
}

interface GenerateDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  affaires: AffaireOption[];
  /** Affaires déjà chargées (évite un remapping fragile). */
  projects?: Project[];
  organizationId: string;
  /** Si fourni, enregistre aussi le PDF dans la GED. */
  saveToGed?: boolean;
  onGenerated?: () => void;
}

function mapProjectRow(row: Record<string, unknown>): Project {
  return {
    id: String(row.id),
    reference: String(row.reference ?? ''),
    title: String(row.title ?? ''),
    description: String(row.description ?? ''),
    type: row.type as Project['type'],
    status: row.status as Project['status'],
    budgetTotal: Number(row.budget_total ?? 0),
    budgetConsumed: Number(row.budget_consumed ?? 0),
    quoteStatus: (row.quote_status as Project['quoteStatus']) ?? 'Brouillon',
    quoteAmountHt: Number(row.quote_amount_ht ?? 0),
    billingStatus: (row.billing_status as Project['billingStatus']) ?? 'À émettre',
    invoiceDeposit: Boolean(row.invoice_deposit),
    invoiceBalance: Boolean(row.invoice_balance),
    startDate: String(row.start_date ?? ''),
    expectedEndDate: String(row.expected_end_date ?? ''),
    actualEndDate: row.actual_end_date ? String(row.actual_end_date) : undefined,
    ownerId: String(row.owner_id ?? ''),
    ownerName: String(row.owner_name ?? ''),
    contractorId: row.contractor_id ? String(row.contractor_id) : undefined,
    contractorName: row.contractor_name ? String(row.contractor_name) : undefined,
    location: String(row.location ?? ''),
    latitude: row.latitude != null ? Number(row.latitude) : undefined,
    longitude: row.longitude != null ? Number(row.longitude) : undefined,
    enableTimeTracking: Boolean(row.enable_time_tracking),
    ppiYear: row.ppi_year != null ? Number(row.ppi_year) : null,
    communeInseeCode: row.commune_insee_code ? String(row.commune_insee_code) : undefined,
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  };
}

export function GenerateDocumentModal({
  open,
  onOpenChange,
  affaires,
  projects = [],
  organizationId,
  saveToGed = true,
  onGenerated,
}: GenerateDocumentModalProps) {
  const [selectedAffaireId, setSelectedAffaireId] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<AdministrativeTemplateId | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successFile, setSuccessFile] = useState<string | null>(null);

  const isFormValid = Boolean(selectedAffaireId && selectedTemplate);

  const reset = () => {
    setSelectedAffaireId('');
    setSelectedTemplate('');
    setError(null);
    setSuccessFile(null);
    setLoading(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleGenerate = async () => {
    if (!selectedAffaireId || !selectedTemplate) return;
    setLoading(true);
    setError(null);

    try {
      let project = projects.find((p) => p.id === selectedAffaireId);

      if (!project) {
        const { data, error: fetchError, status } = await supabase
          .from('projects')
          .select('*')
          .eq('id', selectedAffaireId)
          .single();

        if (fetchError) throw { ...fetchError, status };
        if (!data) throw new Error('Affaire introuvable.');
        project = mapProjectRow(data as Record<string, unknown>);
      }

      const { blob, fileName, category } = generateAdministrativeDocumentPdf(
        selectedTemplate,
        project,
      );

      downloadBlob(blob, fileName);

      if (saveToGed && organizationId) {
        const file = new File([blob], fileName, { type: 'application/pdf' });
        await uploadDocumentToStorage(organizationId, {
          file,
          projectId: selectedAffaireId,
          category: category as DocumentCategory,
        });
        onGenerated?.();
      }

      setSuccessFile(fileName);
    } catch (err) {
      console.error('Erreur génération document:', err);
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Génération automatique de document</DialogTitle>
          <DialogDescription>
            Sélectionnez une affaire et un modèle. Les métadonnées du projet seront injectées
            automatiquement.
          </DialogDescription>
        </DialogHeader>

        {successFile ? (
          <div className="space-y-4 py-2 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <FileText size={24} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Document généré</p>
              <p className="mt-1 text-xs text-slate-500">{successFile}</p>
              {saveToGed && (
                <p className="mt-2 text-xs text-emerald-600">Enregistré dans la GED</p>
              )}
            </div>
            <DialogFooter className="sm:justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSuccessFile(null);
                  setSelectedTemplate('');
                  setSelectedAffaireId('');
                }}
              >
                Nouveau document
              </Button>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Fermer
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="gen-doc-affaire">Affaire</Label>
              <select
                id="gen-doc-affaire"
                value={selectedAffaireId}
                onChange={(e) => setSelectedAffaireId(e.target.value)}
                disabled={loading}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none disabled:opacity-50"
              >
                <option value="">Sélectionner une affaire</option>
                {affaires.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} — {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              {ADMINISTRATIVE_TEMPLATES.map((tpl) => {
                const active = selectedTemplate === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    disabled={loading}
                    onClick={() => setSelectedTemplate(tpl.id)}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-3 text-left transition-colors ${
                      active
                        ? 'border-slate-900 bg-slate-50'
                        : 'border-slate-200 hover:bg-slate-50'
                    } disabled:opacity-50`}
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{tpl.label}</div>
                      <div className="text-xs text-slate-500">
                        Format {tpl.format} · export PDF
                      </div>
                    </div>
                    <FileText size={16} className="text-slate-400" />
                  </button>
                );
              })}
            </div>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Annuler
              </Button>
              <Button
                type="button"
                onClick={() => void handleGenerate()}
                disabled={!isFormValid || loading}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    Génération…
                  </span>
                ) : (
                  'Générer le document'
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default GenerateDocumentModal;
