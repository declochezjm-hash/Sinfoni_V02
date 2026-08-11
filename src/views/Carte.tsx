import { useMemo, useState, useEffect, type MouseEvent } from 'react';
import { MapContainer, Marker, useMap, ZoomControl } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Filter, FolderOpen, X } from 'lucide-react';
import { useProjects } from '../hooks/useProjects';
import { useEnergyAssets, useCanRepositionEnergyAssets, useCanCreateEnergyAssets } from '../hooks/useEnergyAssets';
import { useEnergyAssetReposition } from '../hooks/useEnergyAssetReposition';
import { useEnergyAssetCreation } from '../hooks/useEnergyAssetCreation';
import EnergyAssetRepositionBanner from '../components/EnergyAssetRepositionBanner';
import EnergyAssetCreationBanner from '../components/EnergyAssetCreationBanner';
import CreateAssetModal from '../components/CreateAssetModal';
import MapAssetCreateTool from '../components/MapAssetCreateTool';
import { MapEnergyAssetCreationClickHandler } from '../components/MapEnergyAssetCreationClickHandler';
import { useAllProjectTimesheets } from '../hooks/useProjectTimesheets';
import { useRole } from '../hooks/useRole';
import { useAuth } from '../hooks/useAuth';
import {
  buildLaborCostsMap,
  computeProjectAlerts,
  type AlertType,
} from '../utils/alertEngine';
import {
  applyProximityTourFilter,
  buildCompaniesFromTimesheets,
  buildMapProjectEntries,
  buildProjectIdsByCompany,
  filterMapProjects,
  PROXIMITY_RADIUS_KM,
  type MapAffaireStatusFilter,
  type MapAlertFilter,
  type MapProjectEntry,
} from '../lib/mapFilters';
import { getMarkerIconForAlertType, getPendingCreationMarkerIcon, getSiteChantierMarkerIcon } from '../lib/mapMarkers';
import {
  partitionChantiersByGeolocation,
  formatChantierStatus,
  hasChantierCoordinates,
  resolveRelatedProjectId,
} from '../lib/chantierUtils';
import SiteChantiersPanel from '../components/SiteChantiersPanel';
import ApiErrorAlert from '../components/ApiErrorAlert';
import type { Chantier, Project } from '../types';
import { EnergyAssetsMapLayer } from '../components/EnergyAssetsMapLayer';
import { MaintenanceTicketsMapLayer } from '../components/MaintenanceTicketsMapLayer';
import MapLayerControl from '../components/MapLayerControl';
import { MapBasemapLayer } from '../components/MapBasemapLayer';
import SigImportZone from '../components/SigImportZone';
import SigExportButton from '../components/SigExportButton';
import MaintenanceTicketDialog from '../components/MaintenanceTicketDialog';
import AttributeTableDrawer from '../components/AttributeTableDrawer';
import { MapZoomToTarget } from '../components/MapZoomToTarget';
import { MapPopup } from '../components/MapPopup';
import { MAINTENANCE_TICKET_CREATOR_ROLES, useActiveMaintenanceTickets, useMaintenanceTickets } from '../hooks/useTickets';
import { useChantiers } from '../hooks/useChantiers';
import { DEFAULT_MAP_LAYER_VISIBILITY, type MapDataLayerVisibility } from '../lib/mapLayerState';
import type { AttributeTableLayerId } from '../lib/attributeTable';
import type { MapBasemapId } from '../lib/mapBasemaps';
import type { EnergyAsset, EnergyAssetType } from '../types';

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const ALERT_FILTER_OPTIONS: { value: MapAlertFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'budget', label: '🔴 Budgets Critiques' },
  { value: 'retard', label: '🟠 En Retard' },
  { value: 'facturation', label: '🔵 Problème Facturation' },
];

const STATUS_FILTER_OPTIONS: { value: MapAffaireStatusFilter; label: string }[] = [
  { value: 'all', label: 'Tous statuts' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'cloture', label: 'Clôturé' },
  { value: 'en_etude', label: 'En étude' },
];

const ALERT_LABELS: Record<AlertType, string> = {
  budget: 'Budget critique',
  retard: 'En retard',
  facturation: 'Facturation',
};

function MapFitBounds({ entries }: { entries: MapProjectEntry[] }) {
  const map = useMap();

  useEffect(() => {
    if (entries.length === 0) return;
    const bounds = L.latLngBounds(entries.map((e) => [e.latitude, e.longitude]));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 13 });
  }, [entries, map]);

  return null;
}

function MapFitSiteChantiersBounds({ chantiers }: { chantiers: Chantier[] }) {
  const map = useMap();

  useEffect(() => {
    const points = chantiers.filter((c) => hasChantierCoordinates(c));
    if (points.length === 0) return;
    const bounds = L.latLngBounds(
      points.map((c) => [c.latitude!, c.longitude!] as [number, number]),
    );
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
  }, [chantiers, map]);

  return null;
}

function SiteChantierPopup({
  chantier,
  projects,
}: {
  chantier: Chantier;
  projects: Project[];
}) {
  const navigate = useNavigate();
  const projectId = resolveRelatedProjectId(chantier, projects);
  const dossierPath = projectId ? `/affaires/${projectId}` : '/affaires';

  const openDossier = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(dossierPath);
  };

  return (
    <div className="min-w-[200px] max-w-[260px] p-1">
      {chantier.code && (
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {chantier.code}
        </p>
      )}
      <button
        type="button"
        onClick={openDossier}
        className="-mx-1 rounded px-1 text-left text-sm font-bold text-slate-900 transition hover:bg-slate-100 hover:text-sky-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        title="Ouvrir le dossier complet"
      >
        {chantier.name}
      </button>
      <p className="mt-1 text-xs font-medium text-amber-700">
        {formatChantierStatus(chantier.status)}
      </p>
      {chantier.address && (
        <p className="mt-1 text-xs text-slate-500">{chantier.address}</p>
      )}
      <button
        type="button"
        onClick={openDossier}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
      >
        <FolderOpen size={14} className="shrink-0" />
        Voir le dossier complet
      </button>
    </div>
  );
}

function ProjectPopup({
  entry,
  onInspectZone,
}: {
  entry: MapProjectEntry;
  onInspectZone: (entry: MapProjectEntry) => void;
}) {
  const navigate = useNavigate();
  const { project, primaryAlert } = entry;
  const dossierPath = `/affaires/${project.id}`;

  const openDossier = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(dossierPath);
  };

  return (
    <div className="min-w-[200px] max-w-[260px] p-1">
      <button
        type="button"
        onClick={openDossier}
        className="-mx-1 rounded px-1 text-left text-sm font-bold text-slate-900 transition hover:bg-slate-100 hover:text-sky-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        title="Ouvrir le dossier complet"
      >
        {project.title}
      </button>
      <p className="text-xs text-slate-500">{project.reference}</p>
      {primaryAlert ? (
        <p className="mt-1 text-xs font-medium text-slate-600">{ALERT_LABELS[primaryAlert]}</p>
      ) : (
        <p className="mt-1 text-xs text-emerald-600">Aucune alerte</p>
      )}
      <button
        type="button"
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-sky-200 bg-sky-50 px-2 py-1.5 text-xs font-medium text-sky-700 transition hover:bg-sky-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        onClick={() => onInspectZone(entry)}
      >
        🎯 Inspecter la zone
      </button>
      <button
        type="button"
        onClick={openDossier}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
      >
        <FolderOpen size={14} className="shrink-0" />
        Voir le dossier complet
      </button>
    </div>
  );
}

export default function Carte() {
  const { canAccess } = useRole();
  const { organizationId } = useAuth();
  const canReposition = useCanRepositionEnergyAssets();
  const canCreate = useCanCreateEnergyAssets();
  const { data: projects = [], isLoading } = useProjects();
  const { data: timesheets = [], isLoading: timesheetsLoading } = useAllProjectTimesheets();
  const { assets: energyAssets, loading: energyAssetsLoading } = useEnergyAssets();
  const { tickets: activeTickets, activeCountByAssetId } = useActiveMaintenanceTickets();
  const { tickets: allMaintenanceTickets } = useMaintenanceTickets();
  const { chantiers: siteChantiers, loading: siteChantiersLoading, error: chantiersError, refetch: refetchChantiers } = useChantiers();

  const [layerVisibility, setLayerVisibility] = useState<MapDataLayerVisibility>(
    DEFAULT_MAP_LAYER_VISIBILITY,
  );
  const [basemapId, setBasemapId] = useState<MapBasemapId>('plan');
  const [attributeTableLayer, setAttributeTableLayer] = useState<AttributeTableLayerId | null>(null);
  const [attributeTableOpen, setAttributeTableOpen] = useState(false);
  const [zoomTarget, setZoomTarget] = useState<{ latitude: number; longitude: number } | null>(null);

  const ensureEnergyLayerVisible = (type: EnergyAssetType) => {
    setLayerVisibility((prev) => ({
      ...prev,
      eclairage: type === 'eclairage' ? true : prev.eclairage,
      irve: type === 'irve' ? true : prev.irve,
    }));
  };

  const handleZoomTo = (latitude: number, longitude: number) => {
    setZoomTarget({ latitude, longitude });
  };

  const {
    reposition,
    startReposition,
    handleDragEnd,
    saveReposition,
    cancelReposition,
    saving: repositionSaving,
  } = useEnergyAssetReposition({
    onZoomTo: handleZoomTo,
    onEnsureLayerVisible: ensureEnergyLayerVisible,
  });

  const {
    creationType,
    creationTypeLabel,
    isCreationActive,
    pendingPlacement,
    modalOpen,
    startCreation,
    cancelCreation,
    handleMapClick: handleCreationMapClick,
    submitCreate,
    saving: createSaving,
  } = useEnergyAssetCreation({
    energyAssets,
    onZoomTo: handleZoomTo,
    onEnsureLayerVisible: ensureEnergyLayerVisible,
  });

  const handleStartCreate = (type: EnergyAssetType) => {
    if (reposition) cancelReposition();
    startCreation(type);
  };

  const handleStartReposition = (asset: EnergyAsset) => {
    if (creationType) cancelCreation();
    startReposition(asset);
  };

  const [alertFilter, setAlertFilter] = useState<MapAlertFilter>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<MapAffaireStatusFilter>('all');
  const [ticketAsset, setTicketAsset] = useState<EnergyAsset | null>(null);
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [proximityFocus, setProximityFocus] = useState<{
    projectId: string;
    latitude: number;
    longitude: number;
  } | null>(null);

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

  const showEnergyData = layerVisibility.eclairage || layerVisibility.irve;
  const laborCosts = useMemo(() => buildLaborCostsMap(timesheets), [timesheets]);
  const alerts = useMemo(() => computeProjectAlerts(projects, laborCosts), [projects, laborCosts]);
  const mapEntries = useMemo(
    () => buildMapProjectEntries(projects, alerts),
    [projects, alerts],
  );
  const companies = useMemo(() => buildCompaniesFromTimesheets(timesheets), [timesheets]);
  const projectIdsByCompany = useMemo(
    () => buildProjectIdsByCompany(timesheets),
    [timesheets],
  );

  const filteredEntries = useMemo(() => {
    const base = filterMapProjects({
      entries: mapEntries,
      alertFilter,
      companyFilter,
      statusFilter,
      projectIdsByCompany,
    });

    if (!proximityFocus) return base;

    return applyProximityTourFilter(base, proximityFocus, PROXIMITY_RADIUS_KM);
  }, [mapEntries, alertFilter, companyFilter, statusFilter, projectIdsByCompany, proximityFocus]);

  const handleInspectZone = (entry: MapProjectEntry) => {
    setProximityFocus({
      projectId: entry.project.id,
      latitude: entry.latitude,
      longitude: entry.longitude,
    });
  };

  const clearProximityFocus = () => setProximityFocus(null);

  const canReportAnomaly = canAccess(MAINTENANCE_TICKET_CREATOR_ROLES);

  const handleReportAnomaly = (asset: EnergyAsset) => {
    setTicketAsset(asset);
    setTicketDialogOpen(true);
  };

  const openAttributeTable = (layerId: AttributeTableLayerId) => {
    setAttributeTableLayer(layerId);
    setAttributeTableOpen(true);
  };

  const chantierDisplayCount =
    siteChantiers.length > 0 ? siteChantiers.length : filteredEntries.length;

  const { geolocated: geolocatedSiteChantiers, withoutCoordinates: siteChantiersWithoutGps } =
    useMemo(() => partitionChantiersByGeolocation(siteChantiers), [siteChantiers]);

  const showSiteChantiersLayer = layerVisibility.chantiers && siteChantiers.length > 0;
  const showLegacyProjectMarkers = layerVisibility.chantiers && siteChantiers.length === 0;

  const loading =
    isLoading || timesheetsLoading || siteChantiersLoading || (showEnergyData && energyAssetsLoading);
  const chantiersLoaded = !siteChantiersLoading && !loading;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Carte des chantiers</h1>
        <p className="text-sm text-slate-500">
          {loading
            ? 'Chargement des chantiers…'
            : `${chantierDisplayCount} chantier${chantierDisplayCount > 1 ? 's' : ''} site${geolocatedSiteChantiers.length > 0 ? ` · ${geolocatedSiteChantiers.length} géolocalisé${geolocatedSiteChantiers.length > 1 ? 's' : ''}` : siteChantiersWithoutGps.length > 0 ? ' (liste — sans GPS)' : ''}${siteChantiers.length > 0 ? '' : ` · ${filteredEntries.length} affaire${filteredEntries.length > 1 ? 's' : ''} géolocalisée${filteredEntries.length > 1 ? 's' : ''}`}${proximityFocus ? ` — tournée proximité (${PROXIMITY_RADIUS_KM} km)` : ''}`}
        </p>
      </div>

      {chantiersError && (
        <ApiErrorAlert
          title="Impossible de charger les chantiers"
          message={chantiersError}
          onRetry={() => void refetchChantiers()}
        />
      )}

      {chantiersLoaded && !chantiersError && siteChantiers.length === 0 && (
        <ApiErrorAlert
          title="Aucun chantier site trouvé"
          message={`Aucune ligne dans public.chantiers pour l'organisation ${organizationId ?? '?'}. Vérifiez le seed SQL ou les filtres RLS.`}
          onRetry={() => void refetchChantiers()}
        />
      )}

      <div className="flex h-[calc(100vh-11rem)] min-h-[480px] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="shrink-0 border-b border-slate-100 bg-white/95 p-3 backdrop-blur-sm">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Filter size={13} />
            Filtres carte
          </div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3">
              <label className="flex min-w-[160px] flex-col gap-1">
                <span className="text-[11px] font-medium text-slate-600">Statut d&apos;alerte</span>
                <select
                  value={alertFilter}
                  onChange={(e) => setAlertFilter(e.target.value as MapAlertFilter)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none ring-sky-500 focus:ring-2"
                >
                  {ALERT_FILTER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex min-w-[160px] flex-col gap-1">
                <span className="text-[11px] font-medium text-slate-600">Entreprise présente</span>
                <select
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none ring-sky-500 focus:ring-2"
                >
                  <option value="all">Toutes les entreprises</option>
                  {companies.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex min-w-[140px] flex-col gap-1">
                <span className="text-[11px] font-medium text-slate-600">Statut d&apos;affaire</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as MapAffaireStatusFilter)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none ring-sky-500 focus:ring-2"
                >
                  {STATUS_FILTER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              {proximityFocus && (
                <button
                  type="button"
                  onClick={clearProximityFocus}
                  className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 transition hover:bg-amber-100"
                >
                  <X size={13} />
                  Quitter la tournée
                </button>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {canCreate && (
                <MapAssetCreateTool
                  disabled={reposition !== null || repositionSaving || createSaving}
                  onStartCreate={handleStartCreate}
                />
              )}
              <MapLayerControl
                layers={layerVisibility}
                onLayersChange={setLayerVisibility}
                basemapId={basemapId}
                onBasemapChange={setBasemapId}
                counts={{
                  chantiers: chantierDisplayCount,
                  eclairage: eclairageAssets.length,
                  irve: irveAssets.length,
                  activeTickets: activeTickets.length,
                }}
                onOpenAttributeTable={openAttributeTable}
              />
              <SigExportButton assets={energyAssets} />
              <SigImportZone
                onImportSuccess={() =>
                  setLayerVisibility((prev) => ({
                    ...prev,
                    eclairage: true,
                    irve: true,
                  }))
                }
              />
            </div>
          </div>
        </div>

        <div className="relative min-h-0 flex-1">
          <div className="absolute inset-0 overflow-hidden">
            <MapContainer
              center={[43.7, 4.0]}
              zoom={8}
              zoomControl={false}
              style={{ height: '100%', width: '100%' }}
              className={isCreationActive ? 'cursor-crosshair' : undefined}
            >
            <ZoomControl position="bottomleft" />
            <MapBasemapLayer basemapId={basemapId} />
            <MapZoomToTarget target={zoomTarget} />
            <MapEnergyAssetCreationClickHandler
              active={isCreationActive}
              onMapClick={handleCreationMapClick}
            />
            {proximityFocus && filteredEntries.length > 0 && (
              <MapFitBounds entries={filteredEntries} />
            )}
            {showSiteChantiersLayer && geolocatedSiteChantiers.length > 0 && !proximityFocus && (
              <MapFitSiteChantiersBounds chantiers={geolocatedSiteChantiers} />
            )}
            {showSiteChantiersLayer &&
              geolocatedSiteChantiers.map((chantier) => (
                <Marker
                  key={chantier.id}
                  position={[chantier.latitude!, chantier.longitude!]}
                  icon={getSiteChantierMarkerIcon()}
                >
                  <MapPopup>
                    <SiteChantierPopup chantier={chantier} projects={projects} />
                  </MapPopup>
                </Marker>
              ))}
            {showLegacyProjectMarkers &&
              filteredEntries.map((entry) => (
                <Marker
                  key={entry.project.id}
                  position={[entry.latitude, entry.longitude]}
                  icon={getMarkerIconForAlertType(entry.primaryAlert)}
                >
                  <MapPopup>
                    <ProjectPopup entry={entry} onInspectZone={handleInspectZone} />
                  </MapPopup>
                </Marker>
              ))}
            {pendingPlacement && creationType && (
              <Marker
                position={[pendingPlacement.latitude, pendingPlacement.longitude]}
                icon={getPendingCreationMarkerIcon(creationType)}
              >
                <MapPopup>Nouvel équipement (en cours de saisie)</MapPopup>
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
                onStartReposition={handleStartReposition}
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
                onStartReposition={handleStartReposition}
                reposition={reposition}
                onRepositionDragEnd={handleDragEnd}
              />
            )}
            {layerVisibility.maintenanceTickets && (
              <MaintenanceTicketsMapLayer
                tickets={activeTickets}
                assetsById={assetsById}
              />
            )}
            </MapContainer>
          </div>

          {showSiteChantiersLayer && siteChantiers.length > 0 && (
            <SiteChantiersPanel
              chantiers={siteChantiers}
              onZoomTo={handleZoomTo}
            />
          )}

          <AttributeTableDrawer
          open={attributeTableOpen}
          onOpenChange={setAttributeTableOpen}
          layerId={attributeTableLayer}
          energyAssets={energyAssets}
          mapEntries={filteredEntries}
          siteChantiers={siteChantiers}
          tickets={allMaintenanceTickets}
          assetsById={assetsById}
          onZoomTo={handleZoomTo}
          canRepositionEnergy={canReposition}
          onRepositionAsset={handleStartReposition}
        />

        {isCreationActive && (
          <EnergyAssetCreationBanner
            assetTypeLabel={creationTypeLabel}
            onCancel={cancelCreation}
          />
        )}

        {reposition && (
          <EnergyAssetRepositionBanner
            assetName={reposition.assetName}
            saving={repositionSaving}
            onSave={() => void saveReposition()}
            onCancel={cancelReposition}
          />
        )}
        </div>
      </div>

      {creationType && pendingPlacement && (
        <CreateAssetModal
          open={modalOpen}
          onOpenChange={(open) => {
            if (!open) cancelCreation();
          }}
          assetType={creationType}
          latitude={pendingPlacement.latitude}
          longitude={pendingPlacement.longitude}
          defaultCommuneInsee={pendingPlacement.inferredCommuneInsee}
          saving={createSaving}
          onSubmit={async (values) => {
            await submitCreate(values);
          }}
          onCancel={cancelCreation}
        />
      )}

      <MaintenanceTicketDialog
        asset={ticketAsset}
        open={ticketDialogOpen}
        onOpenChange={setTicketDialogOpen}
      />
    </div>
  );
}
