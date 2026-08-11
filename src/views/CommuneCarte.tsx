import { useState, useCallback, useMemo, useEffect } from 'react';
import { MapContainer, Marker, useMapEvents, useMap, ZoomControl } from 'react-leaflet';
import { Link, useSearchParams } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Plus, X, CheckCircle } from 'lucide-react';
import { useProjects, useCreateCommuneDemand } from '../hooks/useProjects';
import { useEnergyAssets, useCanRepositionEnergyAssets } from '../hooks/useEnergyAssets';
import { useEnergyAssetReposition } from '../hooks/useEnergyAssetReposition';
import EnergyAssetRepositionBanner from '../components/EnergyAssetRepositionBanner';
import { useRole } from '../hooks/useRole';
import { buildMapProjectEntries } from '../lib/mapFilters';
import { getMarkerIconForAlertType } from '../lib/mapMarkers';
import { MAP_CENTER, MAP_ZOOM, GEOCODE_ZOOM } from '../lib/projectConstants';
import { redMarkerIcon } from '../components/ProjectMapEditor';
import CommuneDemandForm from '../components/CommuneDemandForm';
import { EnergyAssetsMapLayer } from '../components/EnergyAssetsMapLayer';
import { MaintenanceTicketsMapLayer } from '../components/MaintenanceTicketsMapLayer';
import MapLayerControl from '../components/MapLayerControl';
import { MapBasemapLayer } from '../components/MapBasemapLayer';
import MaintenanceTicketDialog from '../components/MaintenanceTicketDialog';
import AttributeTableDrawer from '../components/AttributeTableDrawer';
import { MapZoomToTarget } from '../components/MapZoomToTarget';
import { MapPopup } from '../components/MapPopup';
import { MAINTENANCE_TICKET_CREATOR_ROLES, useActiveMaintenanceTickets, useMaintenanceTickets } from '../hooks/useTickets';
import { DEFAULT_MAP_LAYER_VISIBILITY, type MapDataLayerVisibility } from '../lib/mapLayerState';
import type { AttributeTableLayerId } from '../lib/attributeTable';
import type { MapBasemapId } from '../lib/mapBasemaps';
import type { CommuneWorkRequestType, EnergyAsset } from '../types';

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

function MapClickHandler({
  active,
  onMapClick,
}: {
  active: boolean;
  onMapClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (active) onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapFitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) return;
    const bounds = L.latLngBounds(positions);
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
  }, [positions, map]);
  return null;
}

export default function CommuneCarte() {
  const { user, communeInseeCode, canAccess } = useRole();
  const canReposition = useCanRepositionEnergyAssets();
  const { data: projects = [], isLoading, refetch } = useProjects();
  const { assets: energyAssets } = useEnergyAssets();
  const { tickets: activeTickets, activeCountByAssetId } = useActiveMaintenanceTickets();
  const { tickets: allMaintenanceTickets } = useMaintenanceTickets();
  const createDemand = useCreateCommuneDemand();
  const [searchParams, setSearchParams] = useSearchParams();

  const [layerVisibility, setLayerVisibility] = useState<MapDataLayerVisibility>(
    DEFAULT_MAP_LAYER_VISIBILITY,
  );
  const [basemapId, setBasemapId] = useState<MapBasemapId>('plan');
  const [attributeTableLayer, setAttributeTableLayer] = useState<AttributeTableLayerId | null>(null);
  const [attributeTableOpen, setAttributeTableOpen] = useState(false);
  const [zoomTarget, setZoomTarget] = useState<{ latitude: number; longitude: number } | null>(null);

  const {
    reposition,
    startReposition,
    handleDragEnd,
    saveReposition,
    cancelReposition,
    saving: repositionSaving,
  } = useEnergyAssetReposition({
    onZoomTo: (latitude, longitude) => setZoomTarget({ latitude, longitude }),
    onEnsureLayerVisible: (type) => {
      setLayerVisibility((prev) => ({
        ...prev,
        eclairage: type === 'eclairage' ? true : prev.eclairage,
        irve: type === 'irve' ? true : prev.irve,
      }));
    },
  });

  const [placementMode, setPlacementMode] = useState(
    () => searchParams.get('mode') === 'demande',
  );
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [ticketAsset, setTicketAsset] = useState<EnergyAsset | null>(null);
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);

  const canReportAnomaly = canAccess(MAINTENANCE_TICKET_CREATOR_ROLES);

  const handleReportAnomaly = (asset: EnergyAsset) => {
    setTicketAsset(asset);
    setTicketDialogOpen(true);
  };

  const openAttributeTable = (layerId: AttributeTableLayerId) => {
    setAttributeTableLayer(layerId);
    setAttributeTableOpen(true);
  };

  const handleZoomTo = (latitude: number, longitude: number) => {
    setZoomTarget({ latitude, longitude });
  };

  useEffect(() => {
    if (searchParams.get('mode') === 'demande') {
      setPlacementMode(true);
    }
  }, [searchParams]);

  const mapEntries = useMemo(
    () => buildMapProjectEntries(projects, []),
    [projects],
  );

  const positions = useMemo(
    () => mapEntries.map((e) => [e.latitude, e.longitude] as [number, number]),
    [mapEntries],
  );

  const eclairageAssets = useMemo(
    () => energyAssets.filter((a) => a.type === 'eclairage'),
    [energyAssets],
  );
  const irveAssets = useMemo(
    () => energyAssets.filter((a) => a.type === 'irve'),
    [energyAssets],
  );
  const assetsById = useMemo(() => {
    const map = new Map<string, EnergyAsset>();
    for (const asset of energyAssets) map.set(asset.id, asset);
    return map;
  }, [energyAssets]);

  const togglePlacementMode = useCallback(
    (active: boolean) => {
      setPlacementMode(active);
      setPendingCoords(null);
      setShowForm(false);
      if (active) {
        setSearchParams({ mode: 'demande' });
      } else {
        setSearchParams({});
      }
    },
    [setSearchParams],
  );

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setPendingCoords({ lat, lng });
    setShowForm(true);
    setSubmitSuccess(false);
  }, []);

  const handleSubmitDemand = async (workType: CommuneWorkRequestType, description: string) => {
    if (!pendingCoords || !communeInseeCode) return;
    await createDemand.mutateAsync({
      workType,
      description,
      latitude: pendingCoords.lat,
      longitude: pendingCoords.lng,
      communeInseeCode,
      ownerId: user.id,
      ownerName: user.name,
    });
    setShowForm(false);
    setPendingCoords(null);
    setPlacementMode(false);
    setSearchParams({});
    setSubmitSuccess(true);
    void refetch();
    setTimeout(() => setSubmitSuccess(false), 4000);
  };

  const mapCenter: [number, number] =
    positions.length > 0 ? positions[0] : MAP_CENTER;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Carte de la Commune</h1>
          <p className="text-sm text-slate-500">
            {isLoading
              ? 'Chargement…'
              : `${mapEntries.length} chantier${mapEntries.length > 1 ? 's' : ''} sur votre territoire (INSEE ${communeInseeCode ?? '—'})`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => togglePlacementMode(!placementMode)}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              placementMode
                ? 'bg-amber-500 text-white hover:bg-amber-600'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            {placementMode ? (
              <>
                <X size={16} /> Annuler le placement
              </>
            ) : (
              <>
                <Plus size={16} /> Placer une demande de travaux
              </>
            )}
          </button>
        </div>
      </div>

      {submitSuccess && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle size={16} />
          Votre demande a été enregistrée en brouillon. Le syndicat la traitera prochainement.
        </div>
      )}

      {placementMode && !showForm && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <MapPin size={14} className="mr-1 inline" />
          Cliquez sur la carte à l&apos;emplacement souhaité pour ouvrir le formulaire de demande.
        </div>
      )}

      <div className="relative h-[calc(100vh-13rem)] min-h-[480px] w-full rounded-2xl border border-slate-200 shadow-sm">
        <div className="absolute inset-0 z-0 overflow-hidden rounded-2xl">
          <MapContainer
            center={mapCenter}
            zoom={positions.length > 0 ? GEOCODE_ZOOM : MAP_ZOOM}
            zoomControl={false}
            style={{ height: '100%', width: '100%' }}
            className={placementMode ? 'cursor-crosshair' : undefined}
          >
            <ZoomControl position="bottomleft" />
            <MapBasemapLayer basemapId={basemapId} />
            <MapZoomToTarget target={zoomTarget} />
            {positions.length > 0 && <MapFitBounds positions={positions} />}
            <MapClickHandler active={placementMode} onMapClick={handleMapClick} />
            {layerVisibility.chantiers &&
              mapEntries.map((entry) => (
                <Marker
                  key={entry.project.id}
                  position={[entry.latitude, entry.longitude]}
                  icon={getMarkerIconForAlertType(entry.primaryAlert)}
                >
                  <MapPopup>
                    <div className="min-w-[160px] p-1">
                      <p className="text-sm font-bold">{entry.project.title}</p>
                      <p className="text-xs text-slate-500">{entry.project.reference}</p>
                      <p className="mt-1 text-xs text-slate-600">Statut : {entry.project.status}</p>
                      <Link
                        className="mt-2 block text-xs text-sky-600 hover:underline"
                        to={`/commune/dossiers/${entry.project.id}`}
                      >
                        Voir le dossier →
                      </Link>
                    </div>
                  </MapPopup>
                </Marker>
              ))}
            {pendingCoords && (
              <Marker
                position={[pendingCoords.lat, pendingCoords.lng]}
                icon={redMarkerIcon}
              >
                <MapPopup>Nouvelle demande</MapPopup>
              </Marker>
            )}
            {layerVisibility.eclairage && (
              <EnergyAssetsMapLayer
                assets={energyAssets}
                types={['eclairage']}
                canReportAnomaly={canReportAnomaly}
                onReportAnomaly={handleReportAnomaly}
                activeTicketCountByAssetId={activeCountByAssetId}
                canReposition={canReposition}
                onStartReposition={startReposition}
                reposition={reposition}
                onRepositionDragEnd={handleDragEnd}
              />
            )}
            {layerVisibility.irve && (
              <EnergyAssetsMapLayer
                assets={energyAssets}
                types={['irve']}
                canReportAnomaly={canReportAnomaly}
                onReportAnomaly={handleReportAnomaly}
                activeTicketCountByAssetId={activeCountByAssetId}
                canReposition={canReposition}
                onStartReposition={startReposition}
                reposition={reposition}
                onRepositionDragEnd={handleDragEnd}
              />
            )}
            {layerVisibility.maintenanceTickets && (
              <MaintenanceTicketsMapLayer
                tickets={activeTickets}
                assetsById={assetsById}
                maintenancePath="/maintenance"
              />
            )}
          </MapContainer>
        </div>

        <div className="pointer-events-none absolute inset-0 z-[450]">
          <div className="pointer-events-auto absolute right-3 top-3">
            <MapLayerControl
              layers={layerVisibility}
              onLayersChange={setLayerVisibility}
              basemapId={basemapId}
              onBasemapChange={setBasemapId}
              counts={{
                chantiers: mapEntries.length,
                eclairage: eclairageAssets.length,
                irve: irveAssets.length,
                activeTickets: activeTickets.length,
              }}
              onOpenAttributeTable={openAttributeTable}
            />
          </div>
        </div>

        <AttributeTableDrawer
          open={attributeTableOpen}
          onOpenChange={setAttributeTableOpen}
          layerId={attributeTableLayer}
          energyAssets={energyAssets}
          mapEntries={mapEntries}
          tickets={allMaintenanceTickets}
          assetsById={assetsById}
          onZoomTo={handleZoomTo}
          canRepositionEnergy={canReposition}
          onRepositionAsset={startReposition}
        />

        {reposition && (
          <EnergyAssetRepositionBanner
            assetName={reposition.assetName}
            saving={repositionSaving}
            onSave={() => void saveReposition()}
            onCancel={cancelReposition}
          />
        )}
      </div>

      <MaintenanceTicketDialog
        asset={ticketAsset}
        open={ticketDialogOpen}
        onOpenChange={setTicketDialogOpen}
      />

      {showForm && pendingCoords && (
        <CommuneDemandForm
          latitude={pendingCoords.lat}
          longitude={pendingCoords.lng}
          saving={createDemand.isPending}
          error={createDemand.error?.message ?? null}
          onSubmit={handleSubmitDemand}
          onCancel={() => {
            setShowForm(false);
            setPendingCoords(null);
          }}
        />
      )}
    </div>
  );
}
