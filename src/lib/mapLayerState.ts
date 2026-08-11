export interface MapDataLayerVisibility {
  chantiers: boolean;
  eclairage: boolean;
  irve: boolean;
  maintenanceTickets: boolean;
}

export const DEFAULT_MAP_LAYER_VISIBILITY: MapDataLayerVisibility = {
  chantiers: true,
  eclairage: false,
  irve: false,
  maintenanceTickets: false,
};
