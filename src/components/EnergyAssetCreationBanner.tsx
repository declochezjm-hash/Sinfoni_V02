import { PlusCircle, X } from 'lucide-react';
import { Button } from './ui/button';

interface EnergyAssetCreationBannerProps {
  assetTypeLabel: string;
  onCancel: () => void;
}

export default function EnergyAssetCreationBanner({
  assetTypeLabel,
  onCancel,
}: EnergyAssetCreationBannerProps) {
  return (
    <div className="absolute left-1/2 top-3 z-[500] w-[min(100%,calc(100%-1.5rem))] max-w-xl -translate-x-1/2">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-lg backdrop-blur-sm">
        <div className="flex min-w-0 items-start gap-2">
          <PlusCircle size={18} className="mt-0.5 shrink-0 text-emerald-700" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-950">
              Numérisation — {assetTypeLabel}
            </p>
            <p className="text-xs text-emerald-800">
              Cliquez sur la carte pour placer le nouvel équipement.
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          <X size={14} />
          Annuler
        </Button>
      </div>
    </div>
  );
}
