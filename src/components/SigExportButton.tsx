import { useState } from 'react';
import { Download, ChevronDown } from 'lucide-react';
import { useRole } from '../hooks/useRole';
import {
  exportEnergyAssetsToShapefile,
  type SigExportFilter,
} from '../lib/sigExporter';
import type { EnergyAsset } from '../types';

interface SigExportButtonProps {
  assets: EnergyAsset[];
}

const SYNDICAT_EXPORT_ROLES = ['DGS', 'DST', "Chargé d'Affaires"] as const;

const EXPORT_OPTIONS: { value: SigExportFilter; label: string }[] = [
  { value: 'all', label: 'Tout le réseau (IRVE + éclairage)' },
  { value: 'eclairage', label: 'Éclairage public uniquement' },
  { value: 'irve', label: 'IRVE uniquement' },
];

export default function SigExportButton({ assets }: SigExportButtonProps) {
  const { isCommune, canAccess } = useRole();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canExport = !isCommune && canAccess([...SYNDICAT_EXPORT_ROLES]);

  if (!canExport) return null;

  const handleExport = (filterType: SigExportFilter) => {
    setError(null);
    try {
      exportEnergyAssetsToShapefile(assets, { filterType });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'export.");
    }
  };

  const counts = {
    all: assets.length,
    eclairage: assets.filter((a) => a.type === 'eclairage').length,
    irve: assets.filter((a) => a.type === 'irve').length,
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={assets.length === 0}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        title={assets.length === 0 ? 'Aucun équipement à exporter' : 'Exporter en Shapefile (.zip)'}
      >
        <Download size={14} />
        Exporter SIG
        <ChevronDown size={12} className={open ? 'rotate-180 transition' : 'transition'} />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[450] cursor-default"
            aria-label="Fermer le menu d'export"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-[460] mt-1 min-w-[240px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            {EXPORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={counts[opt.value] === 0}
                onClick={() => handleExport(opt.value)}
                className="flex w-full flex-col items-start px-3 py-2 text-left text-xs transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="font-medium text-slate-800">{opt.label}</span>
                <span className="text-[10px] text-slate-500">
                  {counts[opt.value]} équipement{counts[opt.value] > 1 ? 's' : ''}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {error && (
        <p className="absolute right-0 top-full z-[460] mt-1 max-w-[220px] rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[10px] text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
