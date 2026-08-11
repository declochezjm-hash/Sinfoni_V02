import { useCallback, useRef, useState } from 'react';
import { Upload, FileArchive, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useRole } from '../hooks/useRole';
import { useImportEnergyAssets } from '../hooks/useImportEnergyAssets';
import { isAcceptedSigFile, parseSigFile, type ParsedSigFeature } from '../lib/sigParser';
import {
  CUSTOM_INSEE_OPTION,
  DEPARTMENT_COMMUNES,
  getCommuneLabel,
  isValidInseeCode,
} from '../lib/departmentCommunes';

interface SigImportZoneProps {
  /** Affiché en mode bouton compact (défaut) ou zone dropzone visible */
  variant?: 'button' | 'dropzone';
  onImportSuccess?: (count: number) => void;
}

const SYNDICAT_IMPORT_ROLES = ['DGS', 'DST', "Chargé d'Affaires"] as const;

export default function SigImportZone({ variant = 'button', onImportSuccess }: SigImportZoneProps) {
  const { isCommune, canAccess } = useRole();
  const importMutation = useImportEnergyAssets();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canImport = !isCommune && canAccess([...SYNDICAT_IMPORT_ROLES]);

  const [open, setOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [previewFeatures, setPreviewFeatures] = useState<ParsedSigFeature[] | null>(null);
  const [importSuccess, setImportSuccess] = useState<number | null>(null);
  const [selectedCommune, setSelectedCommune] = useState(DEPARTMENT_COMMUNES[0]?.inseeCode ?? '');
  const [customInseeCode, setCustomInseeCode] = useState('');

  const isCustomInsee = selectedCommune === CUSTOM_INSEE_OPTION;
  const effectiveInseeCode = isCustomInsee ? customInseeCode.trim() : selectedCommune;
  const inseeCodeValid = isValidInseeCode(effectiveInseeCode);

  const resetState = useCallback(() => {
    setParsing(false);
    setParseError(null);
    setPreviewFeatures(null);
    setImportSuccess(null);
    setDragOver(false);
    setSelectedCommune(DEPARTMENT_COMMUNES[0]?.inseeCode ?? '');
    setCustomInseeCode('');
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    resetState();
  }, [resetState]);

  const processFile = useCallback(async (file: File) => {
    setParseError(null);
    setPreviewFeatures(null);
    setImportSuccess(null);

    if (!isAcceptedSigFile(file)) {
      setParseError('Format non supporté. Utilisez un fichier .zip (Shapefile) ou .geojson.');
      return;
    }

    setParsing(true);
    try {
      const features = await parseSigFile(file);
      setPreviewFeatures(features);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Erreur lors de la lecture du fichier.');
    } finally {
      setParsing(false);
    }
  }, []);

  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) void processFile(file);
    },
    [processFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect],
  );

  const handleConfirmImport = async () => {
    if (!previewFeatures?.length || !inseeCodeValid) return;

    try {
      const result = await importMutation.mutateAsync({
        features: previewFeatures,
        communeInseeCode: effectiveInseeCode,
      });
      setImportSuccess(result.inserted);
      onImportSuccess?.(result.inserted);
    } catch {
      // error surfaced via importMutation.error
    }
  };

  if (!canImport) return null;

  const irveCount = previewFeatures?.filter((f) => f.type === 'irve').length ?? 0;
  const eclairageCount = previewFeatures?.filter((f) => f.type === 'eclairage').length ?? 0;

  return (
    <>
      {variant === 'button' ? (
        <button
          type="button"
          onClick={() => {
            resetState();
            setOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
        >
          📥 Importer SIG
        </button>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`cursor-pointer rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
            dragOver
              ? 'border-sky-400 bg-sky-50'
              : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100'
          }`}
        >
          <Upload size={32} className="mx-auto text-slate-400" />
          <p className="mt-3 text-sm font-medium text-slate-700">
            Glissez-déposez un Shapefile (.zip) ou GeoJSON
          </p>
          <p className="mt-1 text-xs text-slate-500">ou cliquez pour parcourir vos fichiers</p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".zip,.geojson,.json,application/zip,application/geo+json,application/json"
        className="hidden"
        onChange={(e) => {
          handleFileSelect(e.target.files);
          e.target.value = '';
          if (variant === 'button') setOpen(true);
        }}
      />

      {open && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Import SIG — Patrimoine énergétique</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Syndicat · Éclairage public & IRVE · Bouches-du-Rhône (13)
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {!previewFeatures && !importSuccess && (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`cursor-pointer rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${
                    dragOver
                      ? 'border-sky-400 bg-sky-50'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  {parsing ? (
                    <div className="flex flex-col items-center gap-2 text-slate-600">
                      <Loader2 size={28} className="animate-spin text-sky-600" />
                      <p className="text-sm">Analyse du fichier en cours…</p>
                    </div>
                  ) : (
                    <>
                      <FileArchive size={32} className="mx-auto text-slate-400" />
                      <p className="mt-3 text-sm font-medium text-slate-700">
                        Déposez votre fichier ici
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Shapefile (.zip) ou GeoJSON (.geojson)
                      </p>
                    </>
                  )}
                </div>
              )}

              {parseError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  {parseError}
                </div>
              )}

              {previewFeatures && !importSuccess && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-4">
                    <p className="text-base font-semibold text-sky-900">
                      {previewFeatures.length} équipement
                      {previewFeatures.length > 1 ? 's' : ''} détecté
                      {previewFeatures.length > 1 ? 's' : ''}
                    </p>
                    <p className="mt-1 text-sm text-sky-700">
                      💡 {eclairageCount} éclairage · ⚡ {irveCount} IRVE
                    </p>
                  </div>

                  <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-slate-600">
                        Commune de rattachement
                      </span>
                      <select
                        value={selectedCommune}
                        onChange={(e) => setSelectedCommune(e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-sky-500 focus:ring-2"
                      >
                        {DEPARTMENT_COMMUNES.map((c) => (
                          <option key={c.inseeCode} value={c.inseeCode}>
                            {c.name} ({c.inseeCode})
                          </option>
                        ))}
                        <option value={CUSTOM_INSEE_OPTION}>Autre — saisir un code INSEE</option>
                      </select>
                    </label>

                    {isCustomInsee && (
                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-slate-600">Code INSEE</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={5}
                          placeholder="Ex. 13004"
                          value={customInseeCode}
                          onChange={(e) => setCustomInseeCode(e.target.value.replace(/\D/g, ''))}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-800 outline-none ring-sky-500 focus:ring-2"
                        />
                      </label>
                    )}

                    {inseeCodeValid ? (
                      <p className="text-xs text-sky-700">
                        Tous les équipements seront rattachés à{' '}
                        <strong>{getCommuneLabel(effectiveInseeCode)}</strong>.
                      </p>
                    ) : (
                      <p className="text-xs text-amber-700">
                        Saisissez un code INSEE valide (5 chiffres, ex. 13004).
                      </p>
                    )}
                  </div>

                  <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-100">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-3 py-2 font-medium">Nom</th>
                          <th className="px-3 py-2 font-medium">Type</th>
                          <th className="px-3 py-2 font-medium">Coords</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {previewFeatures.slice(0, 8).map((f, i) => (
                          <tr key={i} className="text-slate-700">
                            <td className="px-3 py-1.5 truncate max-w-[120px]">{f.name}</td>
                            <td className="px-3 py-1.5">
                              {f.type === 'irve' ? '⚡ IRVE' : '💡 Éclairage'}
                            </td>
                            <td className="px-3 py-1.5 font-mono text-[10px] text-slate-500">
                              {f.latitude.toFixed(4)}, {f.longitude.toFixed(4)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {previewFeatures.length > 8 && (
                      <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-400">
                        … et {previewFeatures.length - 8} autre
                        {previewFeatures.length - 8 > 1 ? 's' : ''} équipement
                        {previewFeatures.length - 8 > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {importSuccess !== null && (
                <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <CheckCircle size={18} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">
                      {importSuccess} équipement{importSuccess > 1 ? 's' : ''} importé
                      {importSuccess > 1 ? 's' : ''} avec succès !
                    </p>
                    <p className="mt-1 text-xs">
                      Rattachés à {getCommuneLabel(effectiveInseeCode)} — visibles sur la couche Énergie.
                    </p>
                  </div>
                </div>
              )}

              {importMutation.error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  {importMutation.error.message}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              {importSuccess !== null ? (
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Fermer
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Annuler
                  </button>
                  {previewFeatures && (
                    <button
                      type="button"
                      disabled={
                        !inseeCodeValid ||
                        importMutation.isPending ||
                        previewFeatures.length === 0
                      }
                      onClick={() => void handleConfirmImport()}
                      className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      {importMutation.isPending ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Importation…
                        </>
                      ) : (
                        'Confirmer l\'importation'
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
