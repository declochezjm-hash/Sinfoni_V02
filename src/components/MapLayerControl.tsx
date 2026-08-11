import { Layers, Table2 } from 'lucide-react';
import { MAP_BASEMAPS, type MapBasemapId } from '../lib/mapBasemaps';
import type { AttributeTableLayerId } from '../lib/attributeTable';
import type { MapDataLayerVisibility } from '../lib/mapLayerState';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Switch } from './ui/switch';

interface MapLayerControlProps {
  layers: MapDataLayerVisibility;
  onLayersChange: (layers: MapDataLayerVisibility) => void;
  basemapId: MapBasemapId;
  onBasemapChange: (id: MapBasemapId) => void;
  counts: {
    chantiers?: number;
    eclairage: number;
    irve: number;
    activeTickets: number;
  };
  showChantiersToggle?: boolean;
  className?: string;
  onOpenAttributeTable?: (layerId: AttributeTableLayerId) => void;
}

function LayerToggleRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  badge,
  legend,
  onOpenTable,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  badge?: string;
  legend?: React.ReactNode;
  onOpenTable?: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Label htmlFor={id} className="text-sm font-medium text-slate-900">
            {label}
          </Label>
          {badge && (
            <Badge variant="secondary" className="text-[10px]">
              {badge}
            </Badge>
          )}
          {onOpenTable && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-slate-500 hover:text-slate-900"
              title="Ouvrir la table d'attributs"
              onClick={(e) => {
                e.stopPropagation();
                onOpenTable();
              }}
            >
              <Table2 size={14} />
            </Button>
          )}
        </div>
        {description && <p className="mt-0.5 text-[11px] text-slate-500">{description}</p>}
        {legend && <div className="mt-1.5">{legend}</div>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export default function MapLayerControl({
  layers,
  onLayersChange,
  basemapId,
  onBasemapChange,
  counts,
  showChantiersToggle = true,
  className = '',
  onOpenAttributeTable,
}: MapLayerControlProps) {
  const setLayer = (key: keyof MapDataLayerVisibility, value: boolean) => {
    onLayersChange({ ...layers, [key]: value });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`gap-2 border-slate-200 bg-white hover:bg-white ${className}`}
        >
          <Layers size={16} />
          Calques
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(100vw-2rem,20rem)]" align="end">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Gestion des calques</h3>
            <p className="text-xs text-slate-500">Affichez ou masquez les données sur la carte.</p>
          </div>

          <div className="space-y-2">
            {showChantiersToggle && (
              <LayerToggleRow
                id="layer-chantiers"
                label="🏗️ Chantiers"
                description="Affaires et dossiers géolocalisés"
                checked={layers.chantiers}
                onCheckedChange={(v) => setLayer('chantiers', v)}
                badge={counts.chantiers != null ? `${counts.chantiers}` : undefined}
                onOpenTable={onOpenAttributeTable ? () => onOpenAttributeTable('chantiers') : undefined}
                legend={
                  <div className="flex flex-wrap gap-2 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-red-500" /> Budget
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-orange-500" /> Retard
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-blue-500" /> Facturation
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" /> OK
                    </span>
                  </div>
                }
              />
            )}

            <LayerToggleRow
              id="layer-eclairage"
              label="💡 Éclairage public"
              checked={layers.eclairage}
              onCheckedChange={(v) => setLayer('eclairage', v)}
              badge={`${counts.eclairage}`}
              onOpenTable={onOpenAttributeTable ? () => onOpenAttributeTable('eclairage') : undefined}
              legend={
                <span className="flex items-center gap-1 text-[10px] text-slate-500">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-yellow-600 text-[8px]">
                    💡
                  </span>
                  Armoires & points lumineux
                </span>
              }
            />

            <LayerToggleRow
              id="layer-irve"
              label="🔌 Bornes IRVE"
              checked={layers.irve}
              onCheckedChange={(v) => setLayer('irve', v)}
              badge={`${counts.irve}`}
              onOpenTable={onOpenAttributeTable ? () => onOpenAttributeTable('irve') : undefined}
              legend={
                <span className="flex items-center gap-1 text-[10px] text-slate-500">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[8px] text-white">
                    ⚡
                  </span>
                  Bornes de recharge
                </span>
              }
            />

            <LayerToggleRow
              id="layer-tickets"
              label="⚠️ Tickets & incidents terrain"
              description="Signalements ouverts ou en cours"
              checked={layers.maintenanceTickets}
              onCheckedChange={(v) => setLayer('maintenanceTickets', v)}
              badge={
                counts.activeTickets > 0
                  ? `${counts.activeTickets} actif${counts.activeTickets > 1 ? 's' : ''}`
                  : '0'
              }
              onOpenTable={onOpenAttributeTable ? () => onOpenAttributeTable('tickets') : undefined}
              legend={
                <span className="flex items-center gap-1 text-[10px] text-slate-500">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[8px]">
                    ⚠️
                  </span>
                  Anomalies maintenance
                </span>
              }
            />
          </div>

          <div className="space-y-1.5 border-t border-slate-100 pt-3">
            <Label className="text-xs font-medium text-slate-600">🗺️ Fond de carte</Label>
            <Select value={basemapId} onValueChange={(v) => onBasemapChange(v as MapBasemapId)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MAP_BASEMAPS.map((basemap) => (
                  <SelectItem key={basemap.id} value={basemap.id}>
                    {basemap.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
