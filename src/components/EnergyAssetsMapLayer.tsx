import { useEffect, useRef, type ReactNode } from 'react';
import { AlertTriangle, Move } from 'lucide-react';
import { Marker } from 'react-leaflet';
import { MapPopup } from './MapPopup';
import type { DivIcon, Marker as LeafletMarker } from 'leaflet';
import { countActiveTicketsLabel } from '../lib/eclairageAssetMetadata';
import {
  getEnergyAssetMarkerIcon,
  getEnergyAssetStatusLabel,
  getEnergyAssetTypeLabel,
} from '../lib/energyAssetMarkers';
import type { EnergyAssetRepositionState } from '../lib/energyAssetReposition';
import type { EnergyAsset, EnergyAssetType } from '../types';

interface EnergyAssetsMapLayerProps {
  assets: EnergyAsset[];
  types?: EnergyAssetType[];
  canReportAnomaly?: boolean;
  onReportAnomaly?: (asset: EnergyAsset) => void;
  activeTicketCountByAssetId?: Map<string, number>;
  canReposition?: boolean;
  onStartReposition?: (asset: EnergyAsset) => void;
  reposition?: EnergyAssetRepositionState | null;
  onRepositionDragEnd?: (latitude: number, longitude: number) => void;
}

function formatMetadata(metadata: Record<string, unknown>): string[] {
  const lines: string[] = [];
  if (metadata.power_kw != null) lines.push(`Puissance : ${metadata.power_kw} kW`);
  if (metadata.connector_type != null) lines.push(`Prise : ${metadata.connector_type}`);
  if (metadata.nb_prises != null) lines.push(`Nombre de prises : ${metadata.nb_prises}`);
  if (metadata.circuit_count != null) lines.push(`Circuits : ${metadata.circuit_count}`);
  if (metadata.total_power_w != null) lines.push(`Puissance totale : ${metadata.total_power_w} W`);
  if (metadata.nb_foyers != null) lines.push(`Foyers : ${metadata.nb_foyers}`);
  return lines;
}

function EnergyAssetMarker({
  isRepositioning,
  position,
  icon,
  onDragEnd,
  children,
}: {
  isRepositioning: boolean;
  position: [number, number];
  icon: DivIcon;
  onDragEnd?: (lat: number, lng: number) => void;
  children: ReactNode;
}) {
  const markerRef = useRef<LeafletMarker>(null);

  useEffect(() => {
    if (!isRepositioning && markerRef.current) {
      markerRef.current.setLatLng(position);
    }
  }, [isRepositioning, position]);

  return (
    <Marker
      ref={markerRef}
      position={position}
      icon={icon}
      draggable={isRepositioning}
      zIndexOffset={isRepositioning ? 1000 : 0}
      eventHandlers={
        isRepositioning && onDragEnd
          ? {
              dragend: (e) => {
                const latLng = e.target.getLatLng();
                onDragEnd(latLng.lat, latLng.lng);
              },
            }
          : undefined
      }
    >
      {children}
    </Marker>
  );
}

export function EnergyAssetsMapLayer({
  assets,
  types,
  canReportAnomaly = false,
  onReportAnomaly,
  activeTicketCountByAssetId,
  canReposition = false,
  onStartReposition,
  reposition,
  onRepositionDragEnd,
}: EnergyAssetsMapLayerProps) {
  const visibleAssets = types ? assets.filter((a) => types.includes(a.type)) : assets;
  const repositioningId = reposition?.assetId ?? null;

  return (
    <>
      {visibleAssets.map((asset) => {
        const activeTicketCount = activeTicketCountByAssetId?.get(asset.id) ?? 0;
        const activeTicketLabel = countActiveTicketsLabel(activeTicketCount);
        const isRepositioning = repositioningId === asset.id;
        const position: [number, number] = isRepositioning
          ? [reposition!.pendingLatitude, reposition!.pendingLongitude]
          : [asset.latitude, asset.longitude];
        const icon = getEnergyAssetMarkerIcon(asset.type, asset.status, isRepositioning);

        return (
          <EnergyAssetMarker
            key={asset.id}
            isRepositioning={isRepositioning}
            position={position}
            icon={icon}
            onDragEnd={
              isRepositioning && onRepositionDragEnd
                ? (lat, lng) => onRepositionDragEnd(lat, lng)
                : undefined
            }
          >
            {!isRepositioning && (
              <MapPopup>
                <div className="min-w-[180px] p-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold">{asset.name}</p>
                    {activeTicketLabel && (
                      <span className="shrink-0 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-800">
                        {activeTicketLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{getEnergyAssetTypeLabel(asset.type)}</p>
                  <p
                    className={`mt-1 text-xs font-medium ${
                      asset.status === 'broken'
                        ? 'text-red-600'
                        : asset.status === 'maintenance'
                          ? 'text-orange-600'
                          : 'text-emerald-600'
                    }`}
                  >
                    {getEnergyAssetStatusLabel(asset.status)}
                  </p>
                  {formatMetadata(asset.metadata).map((line) => (
                    <p key={line} className="mt-0.5 text-xs text-slate-600">
                      {line}
                    </p>
                  ))}
                  {activeTicketCount > 0 && (
                    <p className="mt-2 rounded-md border border-orange-200 bg-orange-50 px-2 py-1.5 text-[11px] text-orange-900">
                      Un signalement est déjà ouvert pour cet équipement. Vérifiez l&apos;état du
                      ticket avant d&apos;en créer un nouveau.
                    </p>
                  )}
                  {canReposition && onStartReposition && (
                    <button
                      type="button"
                      className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-violet-200 bg-violet-50 px-2 py-1.5 text-xs font-medium text-violet-800 transition hover:bg-violet-100"
                      onClick={() => onStartReposition(asset)}
                    >
                      <Move size={12} />
                      Repositionner sur la carte
                    </button>
                  )}
                  {canReportAnomaly && onReportAnomaly && (
                    <button
                      type="button"
                      className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs font-medium text-amber-800 transition hover:bg-amber-100"
                      onClick={() => onReportAnomaly(asset)}
                    >
                      <AlertTriangle size={12} />
                      Signaler une anomalie
                    </button>
                  )}
                </div>
              </MapPopup>
            )}
          </EnergyAssetMarker>
        );
      })}
    </>
  );
}
