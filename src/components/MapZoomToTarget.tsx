import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

interface MapZoomToTargetProps {
  target: { latitude: number; longitude: number } | null;
  zoom?: number;
}

export function MapZoomToTarget({ target, zoom = 16 }: MapZoomToTargetProps) {
  const map = useMap();

  useEffect(() => {
    if (!target) return;
    map.flyTo([target.latitude, target.longitude], zoom, { duration: 0.8 });
  }, [target, map, zoom]);

  return null;
}
