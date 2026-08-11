import L from 'leaflet';
import type { AlertType } from '../utils/alertEngine';

const MARKER_BASE =
  'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x';
const SHADOW_URL = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png';

function createColoredIcon(color: 'red' | 'orange' | 'blue' | 'green'): L.Icon {
  return new L.Icon({
    iconUrl: `${MARKER_BASE}-${color}.png`,
    shadowUrl: SHADOW_URL,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
}

export const markerIcons = {
  budget: createColoredIcon('red'),
  retard: createColoredIcon('orange'),
  facturation: createColoredIcon('blue'),
  ok: createColoredIcon('green'),
} as const;

export function getMarkerIconForAlertType(type: AlertType | null): L.Icon {
  if (type === 'budget') return markerIcons.budget;
  if (type === 'retard') return markerIcons.retard;
  if (type === 'facturation') return markerIcons.facturation;
  return markerIcons.ok;
}

export function getMaintenanceIncidentMarkerIcon(): L.DivIcon {
  return L.divIcon({
    className: 'maintenance-incident-marker-icon',
    html: `
      <div style="
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: #ea580c;
        border: 3px solid #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        line-height: 1;
        box-shadow: 0 2px 8px rgba(234, 88, 12, 0.45);
        animation: energy-marker-pulse 1.2s ease-in-out infinite;
      ">⚠️</div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

export function getSiteChantierMarkerIcon(): L.DivIcon {
  return L.divIcon({
    className: 'site-chantier-marker-icon',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background: #d97706;
        border: 2px solid #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        line-height: 1;
        box-shadow: 0 2px 10px rgba(217, 119, 6, 0.45);
      ">🏗️</div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

export function getPendingCreationMarkerIcon(type: 'eclairage' | 'irve'): L.DivIcon {
  const iconChar = type === 'irve' ? '⚡' : '💡';
  const bg = type === 'irve' ? '#059669' : '#10b981';

  return L.divIcon({
    className: 'pending-creation-marker-icon',
    html: `
      <div class="energy-marker energy-marker-creation" style="
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: ${bg};
        border: 3px solid #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        line-height: 1;
        box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.45), 0 4px 14px rgba(0,0,0,0.25);
      ">${iconChar}</div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}
