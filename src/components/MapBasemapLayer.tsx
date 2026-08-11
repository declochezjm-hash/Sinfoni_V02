import { TileLayer } from 'react-leaflet';
import { getMapBasemap, type MapBasemapId } from '../lib/mapBasemaps';

interface MapBasemapLayerProps {
  basemapId: MapBasemapId;
}

export function MapBasemapLayer({ basemapId }: MapBasemapLayerProps) {
  const basemap = getMapBasemap(basemapId);

  return (
    <TileLayer
      key={basemap.id}
      attribution={basemap.attribution}
      url={basemap.url}
    />
  );
}
