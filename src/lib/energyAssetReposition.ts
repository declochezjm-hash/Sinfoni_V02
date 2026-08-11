export interface EnergyAssetRepositionState {
  assetId: string;
  assetName: string;
  originalLatitude: number;
  originalLongitude: number;
  pendingLatitude: number;
  pendingLongitude: number;
}
