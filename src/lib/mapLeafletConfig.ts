import L from 'leaflet';

/** Marge haute pour éviter le tronquage des popups au bord supérieur de la carte. */
export const MAP_AUTO_PAN_PADDING_TOP_LEFT = L.point(16, 48);

export const MAP_AUTO_PAN_PADDING_BOTTOM_RIGHT = L.point(16, 80);

/** Padding auto-pan appliqué aux popups. */
export const MAP_POPUP_AUTO_PAN_PADDING: [number, number] = [50, 48];

export const MAP_POPUP_OFFSET: [number, number] = [0, -10];
