export const REGIONAL_COORDS: Record<string, [number, number]> = {
  Arles: [43.6766, 4.6278],
  Nîmes: [43.8367, 4.3601],
  Montpellier: [43.6108, 3.8767],
  Pia: [42.7443, 2.9197],
  Brouilla: [42.5663, 2.9036],
};

export function normalizeGeoText(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

export function defaultCoordsById(id: string): [number, number] {
  const [baseLat, baseLng] = REGIONAL_COORDS.Arles;
  const seed = [...id].reduce((sum, c) => sum + c.charCodeAt(0), 0);
  const offset = (seed % 12) * 0.0015;
  return [baseLat + offset, baseLng + offset * 0.7];
}

export function resolveProjectCoordinates(params: {
  title: string;
  description: string;
  latitude?: number | null;
  longitude?: number | null;
  id?: string;
}): { latitude: number; longitude: number } {
  const { title, description, latitude, longitude, id } = params;

  if (latitude != null && longitude != null && latitude !== 0 && longitude !== 0) {
    return { latitude, longitude };
  }

  const haystack = normalizeGeoText(`${title} ${description}`);
  for (const [city, coords] of Object.entries(REGIONAL_COORDS)) {
    if (haystack.includes(normalizeGeoText(city))) {
      return { latitude: coords[0], longitude: coords[1] };
    }
  }

  const [lat, lng] = id ? defaultCoordsById(id) : REGIONAL_COORDS.Arles;
  return { latitude: lat, longitude: lng };
}
