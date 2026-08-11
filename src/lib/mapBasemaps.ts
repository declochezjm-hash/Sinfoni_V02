export type MapBasemapId = 'plan' | 'satellite' | 'topo';

export interface MapBasemapConfig {
  id: MapBasemapId;
  label: string;
  url: string;
  attribution: string;
}

export const MAP_BASEMAPS: MapBasemapConfig[] = [
  {
    id: 'plan',
    label: 'Plan',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  {
    id: 'satellite',
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, USDA FSA, USGS, Aerogrid, IGN, IGP, and the GIS User Community',
  },
  {
    id: 'topo',
    label: 'Topo',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution:
      'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)',
  },
];

export function getMapBasemap(id: MapBasemapId): MapBasemapConfig {
  return MAP_BASEMAPS.find((b) => b.id === id) ?? MAP_BASEMAPS[0];
}
