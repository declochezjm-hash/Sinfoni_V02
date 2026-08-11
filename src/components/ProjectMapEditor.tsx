import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin } from 'lucide-react';
import { REGIONAL_COORDS } from '../lib/geo';
import { GEOCODE_ZOOM, MAP_CENTER, MAP_ZOOM } from '../lib/projectConstants';

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

export const redMarkerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function MapClickHandler({
  onMapClick,
  readOnly,
}: {
  onMapClick: (lat: number, lng: number) => void;
  readOnly?: boolean;
}) {
  useMapEvents({
    click(e) {
      if (!readOnly) onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapFlyTo({
  target,
}: {
  target: { center: [number, number]; zoom: number; token: number } | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo(target.center, target.zoom);
    }
  }, [target, map]);
  return null;
}

export interface ProjectMapEditorProps {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  location?: string;
  onLocationChange?: (location: string) => void;
  onCoordinatesChange: (lat: number, lng: number) => void;
  readOnly?: boolean;
  mapKey?: string;
  showLocationField?: boolean;
  showRegionalHint?: boolean;
}

export function ProjectMapEditor({
  latitude,
  longitude,
  location = '',
  onLocationChange,
  onCoordinatesChange,
  readOnly = false,
  mapKey = 'map',
  showLocationField = true,
  showRegionalHint = true,
}: ProjectMapEditorProps) {
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [flyTarget, setFlyTarget] = useState<{
    center: [number, number];
    zoom: number;
    token: number;
  } | null>(null);

  const markerPosition =
    latitude != null && longitude != null ? ([latitude, longitude] as [number, number]) : null;

  const mapCenter = markerPosition ?? MAP_CENTER;

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      onCoordinatesChange(lat, lng);
    },
    [onCoordinatesChange],
  );

  const handleGeocode = useCallback(async () => {
    const adresse = location.trim();
    if (!adresse) {
      setGeocodeError('Saisissez une adresse à localiser.');
      return;
    }

    setGeocoding(true);
    setGeocodeError(null);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(adresse)}&limit=1`,
      );
      if (!res.ok) throw new Error('Réponse invalide');

      const data: { lat: string; lon: string }[] = await res.json();
      if (!data.length) {
        setGeocodeError('Aucun résultat trouvé pour cette adresse.');
        return;
      }

      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);

      onCoordinatesChange(lat, lng);
      setFlyTarget({ center: [lat, lng], zoom: GEOCODE_ZOOM, token: Date.now() });
    } catch {
      setGeocodeError('Erreur lors de la géolocalisation. Réessayez.');
    } finally {
      setGeocoding(false);
    }
  }, [location, onCoordinatesChange]);

  return (
    <div className="space-y-3">
      {showLocationField && onLocationChange && (
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Adresse / Localisation
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <input
              type="text"
              value={location}
              onChange={(e) => {
                setGeocodeError(null);
                onLocationChange(e.target.value);
              }}
              readOnly={readOnly}
              disabled={readOnly}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
              placeholder="Ex. 13200 Arles, Rue de la République"
            />
            {!readOnly && (
              <button
                type="button"
                onClick={() => void handleGeocode()}
                disabled={geocoding || !location.trim()}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Search size={14} />
                {geocoding ? 'Localisation...' : 'Localiser sur la carte'}
              </button>
            )}
          </div>
          {geocodeError && <p className="mt-1.5 text-xs text-red-600">{geocodeError}</p>}
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center gap-2">
          <MapPin size={14} className="text-slate-500" />
          <label className="text-xs font-medium text-slate-600">
            {readOnly
              ? 'Emplacement géographique'
              : 'Emplacement géographique — cliquez sur la carte pour affiner'}
          </label>
        </div>
        <div className="relative z-0 overflow-hidden rounded-lg border border-slate-200">
          <MapContainer
            key={mapKey}
            center={mapCenter}
            zoom={markerPosition ? GEOCODE_ZOOM : MAP_ZOOM}
            style={{ height: '220px', width: '100%' }}
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapFlyTo target={flyTarget} />
            <MapClickHandler onMapClick={handleMapClick} readOnly={readOnly} />
            {markerPosition && (
              <Marker position={markerPosition} icon={redMarkerIcon}>
                <Popup>Emplacement sélectionné</Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
        {showRegionalHint && !readOnly && (
          <p className="mt-1.5 text-xs text-slate-500">
            Sans position sur la carte, les coordonnées seront déduites du titre ou de la description
            ({Object.keys(REGIONAL_COORDS).join(', ')}).
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Latitude</label>
          <input
            type="number"
            step="any"
            readOnly
            value={latitude ?? ''}
            placeholder="Cliquez sur la carte"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Longitude</label>
          <input
            type="number"
            step="any"
            readOnly
            value={longitude ?? ''}
            placeholder="Cliquez sur la carte"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
          />
        </div>
      </div>
    </div>
  );
}
