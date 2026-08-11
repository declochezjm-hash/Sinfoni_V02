import { Lightbulb } from 'lucide-react';
import { buildEclairageAssetSummary } from '../lib/eclairageAssetMetadata';
import type { EnergyAsset } from '../types';

interface EclairageAssetSummaryCardProps {
  asset: EnergyAsset;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-800">{value}</span>
    </div>
  );
}

export default function EclairageAssetSummaryCard({ asset }: EclairageAssetSummaryCardProps) {
  const summary = buildEclairageAssetSummary(asset);

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-900">
        <Lightbulb size={14} />
        Actif sélectionné
      </div>
      <div className="space-y-1.5">
        <SummaryRow label="Nom / Identifiant" value={`${summary.pointName} (${summary.pointIdentifier})`} />
        <SummaryRow
          label="Puissance"
          value={summary.totalPowerW != null ? `${summary.totalPowerW} W` : '—'}
        />
        <SummaryRow label="Type d'éclairage" value={summary.lightingTechnology} />
        <SummaryRow label="Statut / Équipement" value={summary.equipmentStatusLabel} />
      </div>
    </div>
  );
}
