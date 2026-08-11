import { Move, X } from 'lucide-react';
import { Button } from './ui/button';

interface EnergyAssetRepositionBannerProps {
  assetName: string;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export default function EnergyAssetRepositionBanner({
  assetName,
  saving,
  onSave,
  onCancel,
}: EnergyAssetRepositionBannerProps) {
  return (
    <div className="absolute left-1/2 top-3 z-[500] w-[min(100%,calc(100%-1.5rem))] max-w-xl -translate-x-1/2">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 shadow-lg backdrop-blur-sm">
        <div className="flex min-w-0 items-start gap-2">
          <Move size={18} className="mt-0.5 shrink-0 text-violet-700" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-violet-950">Repositionnement — {assetName}</p>
            <p className="text-xs text-violet-800">
              Faites glisser le point vers sa nouvelle position sur la carte.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled={saving} onClick={onCancel}>
            <X size={14} />
            Annuler
          </Button>
          <Button type="button" size="sm" disabled={saving} onClick={onSave}>
            {saving ? 'Enregistrement…' : 'Enregistrer la nouvelle position'}
          </Button>
        </div>
      </div>
    </div>
  );
}
