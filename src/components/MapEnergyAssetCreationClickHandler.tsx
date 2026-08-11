import { useMapEvents } from 'react-leaflet';

interface MapEnergyAssetCreationClickHandlerProps {
  active: boolean;
  onMapClick: (latitude: number, longitude: number) => void;
}

export function MapEnergyAssetCreationClickHandler({
  active,
  onMapClick,
}: MapEnergyAssetCreationClickHandlerProps) {
  useMapEvents({
    click(e) {
      if (!active) return;
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}
