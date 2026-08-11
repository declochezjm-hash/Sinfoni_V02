import L from 'leaflet';
import type { EnergyAssetStatus, EnergyAssetType } from '../types';

const STATUS_LABELS: Record<EnergyAssetStatus, string> = {
  functional: 'Fonctionnel',
  maintenance: 'En maintenance',
  broken: 'En panne',
};

const TYPE_LABELS: Record<EnergyAssetType, string> = {
  irve: 'Borne IRVE',
  eclairage: 'Éclairage public',
};

function buildMarkerHtml(
  type: EnergyAssetType,
  status: EnergyAssetStatus,
  editing = false,
): string {
  const isBroken = status === 'broken';
  const isMaintenance = status === 'maintenance';
  const iconChar = type === 'irve' ? '⚡' : '💡';
  const bgColor = editing ? '#7c3aed' : type === 'irve' ? '#2563eb' : '#ca8a04';
  const borderColor = editing ? '#c4b5fd' : isBroken ? '#ef4444' : isMaintenance ? '#f97316' : '#ffffff';
  const pulseClass = editing ? ' energy-marker-editing' : isBroken ? ' energy-marker-broken' : '';

  return `
    <div class="energy-marker${pulseClass}" style="
      width: ${editing ? 36 : 32}px;
      height: ${editing ? 36 : 32}px;
      border-radius: 50%;
      background: ${bgColor};
      border: 3px solid ${borderColor};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      line-height: 1;
      box-shadow: ${editing ? '0 0 0 4px rgba(124, 58, 237, 0.35), 0 4px 12px rgba(0,0,0,0.3)' : '0 2px 6px rgba(0,0,0,0.25)'};
      cursor: ${editing ? 'grab' : 'pointer'};
    ">${iconChar}</div>
  `;
}

export function getEnergyAssetMarkerIcon(
  type: EnergyAssetType,
  status: EnergyAssetStatus,
  editing = false,
): L.DivIcon {
  const size = editing ? 36 : 32;
  const anchor = size / 2;
  return L.divIcon({
    className: 'energy-asset-marker-icon',
    html: buildMarkerHtml(type, status, editing),
    iconSize: [size, size],
    iconAnchor: [anchor, anchor],
    popupAnchor: [0, -anchor],
  });
}

export function getEnergyAssetStatusLabel(status: EnergyAssetStatus): string {
  return STATUS_LABELS[status];
}

export function getEnergyAssetTypeLabel(type: EnergyAssetType): string {
  return TYPE_LABELS[type];
}
