import { useEffect, useState } from 'react';
import { PlusCircle } from 'lucide-react';
import {
  ENERGY_ASSET_STATUS_CREATE_OPTIONS,
  IRVE_CONNECTOR_OPTIONS,
  LIGHTING_TECHNOLOGY_OPTIONS,
} from '../lib/energyAssetCreation';
import { getEnergyAssetTypeLabel } from '../lib/energyAssetMarkers';
import { DEPARTMENT_COMMUNES } from '../lib/departmentCommunes';
import type { CreateEnergyAssetInput } from '../hooks/useEnergyAssets';
import type { EnergyAssetStatus, EnergyAssetType } from '../types';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

export interface CreateAssetFormValues {
  name: string;
  communeInseeCode: string;
  status: EnergyAssetStatus;
  latitude: number;
  longitude: number;
  metadata: Record<string, unknown>;
}

interface CreateAssetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetType: EnergyAssetType;
  latitude: number;
  longitude: number;
  defaultCommuneInsee?: string;
  saving: boolean;
  onSubmit: (values: CreateEnergyAssetInput) => Promise<void>;
  onCancel: () => void;
}

export default function CreateAssetModal({
  open,
  onOpenChange,
  assetType,
  latitude,
  longitude,
  defaultCommuneInsee,
  saving,
  onSubmit,
  onCancel,
}: CreateAssetModalProps) {
  const [name, setName] = useState('');
  const [communeInseeCode, setCommuneInseeCode] = useState(
    defaultCommuneInsee ?? DEPARTMENT_COMMUNES[0]?.inseeCode ?? '',
  );
  const [status, setStatus] = useState<EnergyAssetStatus>('functional');
  const [lat, setLat] = useState(latitude);
  const [lng, setLng] = useState(longitude);

  const [totalPowerW, setTotalPowerW] = useState('');
  const [technologie, setTechnologie] = useState('LED');
  const [hauteurMat, setHauteurMat] = useState('');
  const [nbFoyers, setNbFoyers] = useState('');

  const [nbPrises, setNbPrises] = useState('');
  const [powerKw, setPowerKw] = useState('');
  const [connectorType, setConnectorType] = useState(IRVE_CONNECTOR_OPTIONS[0]);

  useEffect(() => {
    if (!open) return;
    setName('');
    setCommuneInseeCode(defaultCommuneInsee ?? DEPARTMENT_COMMUNES[0]?.inseeCode ?? '');
    setStatus('functional');
    setLat(latitude);
    setLng(longitude);
    setTotalPowerW('');
    setTechnologie('LED');
    setHauteurMat('');
    setNbFoyers('');
    setNbPrises('');
    setPowerKw('');
    setConnectorType(IRVE_CONNECTOR_OPTIONS[0]);
  }, [open, latitude, longitude, defaultCommuneInsee]);

  const buildMetadata = (): Record<string, unknown> => {
    if (assetType === 'eclairage') {
      const metadata: Record<string, unknown> = {};
      if (totalPowerW.trim()) metadata.total_power_w = Number(totalPowerW);
      if (technologie) metadata.technologie = technologie;
      if (hauteurMat.trim()) metadata.hauteur_mat = Number(hauteurMat);
      if (nbFoyers.trim()) metadata.nb_foyers = Number(nbFoyers);
      return metadata;
    }

    const metadata: Record<string, unknown> = {};
    if (nbPrises.trim()) metadata.nb_prises = Number(nbPrises);
    if (powerKw.trim()) metadata.power_kw = Number(powerKw);
    if (connectorType) metadata.connector_type = connectorType;
    return metadata;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !communeInseeCode) return;

    await onSubmit({
      name: name.trim(),
      type: assetType,
      status,
      communeInseeCode,
      latitude: lat,
      longitude: lng,
      metadata: buildMetadata(),
    });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) onCancel();
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle size={18} className="text-emerald-600" />
            Créer un actif — {getEnergyAssetTypeLabel(assetType)}
          </DialogTitle>
          <DialogDescription>
            Complétez les attributs de l&apos;équipement avant enregistrement.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="create-asset-name">Nom / Identifiant *</Label>
            <Input
              id="create-asset-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. Armoire EP — Rue du Port"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="create-asset-commune">Commune (INSEE) *</Label>
              <Select value={communeInseeCode} onValueChange={setCommuneInseeCode}>
                <SelectTrigger id="create-asset-commune">
                  <SelectValue placeholder="Choisir une commune" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENT_COMMUNES.map((c) => (
                    <SelectItem key={c.inseeCode} value={c.inseeCode}>
                      {c.name} ({c.inseeCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-asset-status">Statut initial</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as EnergyAssetStatus)}
              >
                <SelectTrigger id="create-asset-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENERGY_ASSET_STATUS_CREATE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="create-asset-lat">Latitude</Label>
              <Input
                id="create-asset-lat"
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-asset-lng">Longitude</Label>
              <Input
                id="create-asset-lng"
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(Number(e.target.value))}
              />
            </div>
          </div>

          {assetType === 'eclairage' ? (
            <div className="space-y-3 rounded-lg border border-amber-100 bg-amber-50/50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
                Attributs éclairage
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Puissance totale (W)</Label>
                  <Input value={totalPowerW} onChange={(e) => setTotalPowerW(e.target.value)} type="number" />
                </div>
                <div className="space-y-1.5">
                  <Label>Technologie</Label>
                  <Select value={technologie} onValueChange={setTechnologie}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LIGHTING_TECHNOLOGY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Hauteur mât (m)</Label>
                  <Input value={hauteurMat} onChange={(e) => setHauteurMat(e.target.value)} type="number" />
                </div>
                <div className="space-y-1.5">
                  <Label>Nombre de foyers</Label>
                  <Input value={nbFoyers} onChange={(e) => setNbFoyers(e.target.value)} type="number" />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 rounded-lg border border-sky-100 bg-sky-50/50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-900">
                Attributs IRVE
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Nombre de prises</Label>
                  <Input value={nbPrises} onChange={(e) => setNbPrises(e.target.value)} type="number" />
                </div>
                <div className="space-y-1.5">
                  <Label>Puissance max (kW)</Label>
                  <Input value={powerKw} onChange={(e) => setPowerKw(e.target.value)} type="number" step="any" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Type de connecteur</Label>
                  <Select value={connectorType} onValueChange={setConnectorType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {IRVE_CONNECTOR_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving || !name.trim() || !communeInseeCode}>
              {saving ? 'Création…' : 'Créer l\'équipement'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
