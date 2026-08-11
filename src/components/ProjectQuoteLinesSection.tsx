import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useBpuCatalog } from '../hooks/useBpuCatalog';
import {
  computeQuoteLineTotal,
  computeQuoteLinesTotal,
  type QuoteLineInput,
} from '../hooks/useProjectQuoteLines';
import { formatCurrency } from '../lib/utils';
import type { ProjectQuoteLine } from '../types';

interface ProjectQuoteLinesSectionProps {
  canEdit: boolean;
  catalogLoading?: boolean;
  lines: ProjectQuoteLine[];
  linesLoading: boolean;
  linesError: string | null;
  addLine: (input: QuoteLineInput) => Promise<void>;
  deleteLine: (id: string) => Promise<void>;
  onProjectSync?: () => void;
}

export function ProjectQuoteLinesSection({
  canEdit,
  lines,
  linesLoading,
  linesError,
  addLine,
  deleteLine,
  onProjectSync,
}: ProjectQuoteLinesSectionProps) {
  const { items: catalogItems, loading: catalogLoading } = useBpuCatalog();

  const [selectedBpuId, setSelectedBpuId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const selectedItem = useMemo(
    () => catalogItems.find((item) => item.id === selectedBpuId),
    [catalogItems, selectedBpuId],
  );

  const totalHt = useMemo(() => computeQuoteLinesTotal(lines), [lines]);

  const handleAdd = async () => {
    if (!canEdit || adding) return;
    if (!selectedItem) {
      setFormError('Sélectionnez une prestation du catalogue.');
      return;
    }
    const qty = parseFloat(quantity.replace(',', '.'));
    if (!Number.isFinite(qty) || qty <= 0) {
      setFormError('La quantité doit être un nombre strictement positif.');
      return;
    }
    setAdding(true);
    setFormError(null);
    setActionError(null);
    try {
      await addLine({
        bpuId: selectedItem.id,
        designation: selectedItem.designation,
        quantity: qty,
        unitPriceHt: selectedItem.unitPriceHt,
      });
      setSelectedBpuId('');
      setQuantity('1');
      onProjectSync?.();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur lors de l\'ajout');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canEdit || deletingId) return;
    setDeletingId(id);
    setActionError(null);
    try {
      await deleteLine(id);
      onProjectSync?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
      {canEdit && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Prestation (catalogue BPU)
              </label>
              <select
                value={selectedBpuId}
                onChange={(e) => setSelectedBpuId(e.target.value)}
                disabled={catalogLoading}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none disabled:bg-slate-50"
              >
                <option value="">
                  {catalogLoading ? 'Chargement du catalogue…' : '— Choisir une prestation —'}
                </option>
                {catalogItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.designation} ({item.unit}) — {formatCurrency(item.unitPriceHt)}/u
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Quantité</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              />
            </div>
          </div>
          {selectedItem && (
            <p className="text-xs text-slate-500">
              Prix unitaire HT : {formatCurrency(selectedItem.unitPriceHt)} / {selectedItem.unit}
            </p>
          )}
          {formError && <p className="text-xs text-red-600">{formError}</p>}
          <button
            type="button"
            onClick={() => void handleAdd()}
            disabled={adding || !selectedBpuId}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
          >
            <Plus size={16} />
            {adding ? 'Ajout…' : 'Ajouter la ligne'}
          </button>
        </div>
      )}

      {actionError && <p className="text-xs text-red-600">{actionError}</p>}

      {linesLoading ? (
        <p className="text-sm text-slate-500">Chargement des lignes de devis…</p>
      ) : linesError ? (
        <p className="text-sm text-red-600">{linesError}</p>
      ) : lines.length === 0 ? (
        <p className="text-sm text-slate-500">Aucune ligne de chiffrage pour le moment.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
                <th className="px-4 py-2 font-medium">Désignation</th>
                <th className="px-4 py-2 font-medium">Qté</th>
                <th className="px-4 py-2 font-medium">P.U. HT</th>
                <th className="px-4 py-2 font-medium">Total HT</th>
                {canEdit && <th className="px-4 py-2 font-medium w-10" />}
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-2.5 text-slate-800">{line.designation}</td>
                  <td className="px-4 py-2.5 text-slate-700">
                    {line.quantity.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">
                    {formatCurrency(line.unitPriceHt)}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-slate-800">
                    {formatCurrency(computeQuoteLineTotal(line))}
                  </td>
                  {canEdit && (
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => void handleDelete(line.id)}
                        disabled={deletingId === line.id}
                        className="rounded p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        title="Supprimer cette ligne"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white">
                <td colSpan={3} className="px-4 py-2.5 text-sm font-semibold">
                  Total devis HT
                </td>
                <td className="px-4 py-2.5 text-sm font-bold">
                  {formatCurrency(totalHt)}
                </td>
                {canEdit && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
