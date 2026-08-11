import { useMemo, useState, useEffect, useRef } from 'react';
import { ChevronsDown, ChevronsUp, Move, Pencil, Save, Search, Table2, Trash2, X } from 'lucide-react';
import {
  useBulkDeleteEnergyAssets,
  useDeleteEnergyAsset,
  useUpdateEnergyAsset,
} from '../hooks/useEnergyAssets';
import { SYNDICAT_STAFF_ROLES, useUpdateMaintenanceTicket } from '../hooks/useTickets';
import { useRole } from '../hooks/useRole';
import { useToast } from '../hooks/useToast';
import {
  buildChantierAttributeTable,
  buildEnergyAssetAttributeTable,
  buildSiteChantierAttributeTable,
  buildTicketAttributeTable,
  getAttributeTableLayerLabel,
  parseAttributeCellValue,
  type AttributeColumnDef,
  type AttributeTableLayerId,
  type AttributeTableRow,
} from '../lib/attributeTable';
import { formatApiError } from '../lib/formatApiError';
import type { EnergyAsset, MaintenanceTicket } from '../types';
import type { Chantier } from '../types';
import type { MapProjectEntry } from '../lib/mapFilters';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface AttributeTableDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  layerId: AttributeTableLayerId | null;
  energyAssets: EnergyAsset[];
  mapEntries: MapProjectEntry[];
  siteChantiers?: Chantier[];
  tickets: MaintenanceTicket[];
  assetsById: Map<string, EnergyAsset>;
  onZoomTo: (latitude: number, longitude: number) => void;
  canRepositionEnergy?: boolean;
  onRepositionAsset?: (asset: EnergyAsset) => void;
}

type DrawerHeightPreset = 'compact' | 'default' | 'expanded';

const DRAWER_HEIGHT_CLASSES: Record<DrawerHeightPreset, string> = {
  compact: 'h-[25vh] max-h-[25vh]',
  default: 'h-[40vh] max-h-[40vh]',
  expanded: 'h-[60vh] max-h-[60vh]',
};

const DRAWER_HEIGHT_LABELS: Record<DrawerHeightPreset, string> = {
  compact: '25 %',
  default: '40 %',
  expanded: '60 %',
};

function getCellValue(
  row: AttributeTableRow,
  columnKey: string,
  edits: Record<string, Record<string, string>>,
): string {
  const rowEdits = edits[row.id];
  if (rowEdits && rowEdits[columnKey] !== undefined) return rowEdits[columnKey];
  return row.values[columnKey] ?? '';
}

function filterRows(rows: AttributeTableRow[], search: string): AttributeTableRow[] {
  const q = search.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) =>
    Object.values(row.values).some((v) => String(v).toLowerCase().includes(q)),
  );
}

export default function AttributeTableDrawer({
  open,
  onOpenChange,
  layerId,
  energyAssets,
  mapEntries,
  siteChantiers = [],
  tickets,
  assetsById,
  onZoomTo,
  canRepositionEnergy = false,
  onRepositionAsset,
}: AttributeTableDrawerProps) {
  const { canAccess, isRole } = useRole();
  const { toast } = useToast();
  const updateEnergyAsset = useUpdateEnergyAsset();
  const deleteEnergyAsset = useDeleteEnergyAsset();
  const bulkDeleteEnergyAssets = useBulkDeleteEnergyAssets();
  const updateTicket = useUpdateMaintenanceTicket();

  const canEditEnergy = canAccess(SYNDICAT_STAFF_ROLES);
  const canEditTickets = canAccess(SYNDICAT_STAFF_ROLES) || isRole('Prestataire Extérieur');
  const isPrestataire = isRole('Prestataire Extérieur');

  const [search, setSearch] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [edits, setEdits] = useState<Record<string, Record<string, string>>>({});
  const [heightPreset, setHeightPreset] = useState<DrawerHeightPreset>('default');
  const [pendingDeleteRow, setPendingDeleteRow] = useState<AttributeTableRow | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [layerId]);

  const tableData = useMemo(() => {
    if (!layerId) return { columns: [], rows: [] };

    switch (layerId) {
      case 'eclairage':
        return buildEnergyAssetAttributeTable(
          energyAssets.filter((a) => a.type === 'eclairage'),
          canEditEnergy,
        );
      case 'irve':
        return buildEnergyAssetAttributeTable(
          energyAssets.filter((a) => a.type === 'irve'),
          canEditEnergy,
        );
      case 'chantiers':
        if (siteChantiers.length > 0) {
          return buildSiteChantierAttributeTable(siteChantiers);
        }
        return buildChantierAttributeTable(mapEntries);
      case 'tickets':
        return buildTicketAttributeTable(tickets, assetsById, canEditTickets);
    }
  }, [layerId, energyAssets, mapEntries, siteChantiers, tickets, assetsById, canEditEnergy, canEditTickets, isPrestataire]);

  const filteredRows = useMemo(
    () => filterRows(tableData.rows, search),
    [tableData.rows, search],
  );

  const canEditLayer =
    layerId === 'eclairage' || layerId === 'irve'
      ? canEditEnergy
      : layerId === 'tickets'
        ? canEditTickets
        : false;

  const canShowReposition =
    canRepositionEnergy &&
    onRepositionAsset &&
    (layerId === 'eclairage' || layerId === 'irve');

  const canDeleteEnergy =
    canEditEnergy && (layerId === 'eclairage' || layerId === 'irve');

  const canShowSelection = canDeleteEnergy;

  const canShowActions = canShowReposition || canDeleteEnergy;

  const actionsColumnCount = canShowActions ? 1 : 0;
  const selectionColumnCount = canShowSelection ? 1 : 0;

  const selectableRows = useMemo(
    () => filteredRows.filter((row) => row.energyAsset),
    [filteredRows],
  );

  const selectedCount = useMemo(
    () => selectableRows.filter((row) => selectedIds.has(row.id)).length,
    [selectableRows, selectedIds],
  );

  const allSelectableSelected =
    selectableRows.length > 0 && selectableRows.every((row) => selectedIds.has(row.id));

  const someSelectableSelected =
    selectableRows.some((row) => selectedIds.has(row.id)) && !allSelectableSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelectableSelected;
    }
  }, [someSelectableSelected]);

  const toggleRowSelection = (rowId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(rowId);
      else next.delete(rowId);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    if (allSelectableSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const row of selectableRows) next.delete(row.id);
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const row of selectableRows) next.add(row.id);
        return next;
      });
    }
  };

  const isColumnEditable = (column: AttributeColumnDef): boolean => {
    if (!editMode || !column.editable) return false;
    if (layerId === 'chantiers') return false;
    if (layerId === 'eclairage' || layerId === 'irve') return canEditEnergy;
    if (layerId === 'tickets') {
      if (!canEditTickets) return false;
      if (isPrestataire && (column.key === 'priority' || column.key === 'title')) return false;
      return true;
    }
    return false;
  };

  const setCellEdit = (rowId: string, columnKey: string, value: string) => {
    setEdits((prev) => ({
      ...prev,
      [rowId]: { ...prev[rowId], [columnKey]: value },
    }));
  };

  const handleClose = () => {
    setEditMode(false);
    setEdits({});
    setSearch('');
    setHeightPreset('default');
    setSelectedIds(new Set());
    setBulkDeleteOpen(false);
    setPendingDeleteRow(null);
    onOpenChange(false);
  };

  const handleSave = async () => {
    if (!layerId || Object.keys(edits).length === 0) return;

    try {
      if (layerId === 'eclairage' || layerId === 'irve') {
        for (const [rowId, rowEdits] of Object.entries(edits)) {
          const row = tableData.rows.find((r) => r.id === rowId);
          if (!row?.energyAsset) continue;

          const metadata = { ...row.energyAsset.metadata };
          const payload: {
            id: string;
            name?: string;
            status?: EnergyAsset['status'];
            communeInseeCode?: string;
            metadata?: Record<string, unknown>;
          } = { id: rowId };

          for (const [key, rawValue] of Object.entries(rowEdits)) {
            const column = tableData.columns.find((c) => c.key === key);
            if (!column) continue;
            const parsed = parseAttributeCellValue(column, rawValue);

            if (key === 'name' && typeof parsed === 'string') payload.name = parsed;
            else if (key === 'status' && typeof parsed === 'string') {
              payload.status = parsed as EnergyAsset['status'];
            } else if (key === 'commune_insee_code' && typeof parsed === 'string') {
              payload.communeInseeCode = parsed;
            } else if (column.source === 'metadata') {
              metadata[key] = parsed;
            }
          }

          payload.metadata = metadata;
          await updateEnergyAsset.mutateAsync(payload);
        }
      } else if (layerId === 'tickets') {
        for (const [rowId, rowEdits] of Object.entries(edits)) {
          const payload: {
            id: string;
            title?: string;
            description?: string;
            status?: MaintenanceTicket['status'];
            priority?: MaintenanceTicket['priority'];
          } = { id: rowId };

          for (const [key, rawValue] of Object.entries(rowEdits)) {
            const column = tableData.columns.find((c) => c.key === key);
            if (!column) continue;
            if (key === 'title') payload.title = rawValue;
            else if (key === 'description') payload.description = rawValue;
            else if (key === 'status') payload.status = rawValue as MaintenanceTicket['status'];
            else if (key === 'priority') payload.priority = rawValue as MaintenanceTicket['priority'];
          }

          await updateTicket.mutateAsync(payload);
        }
      }

      toast.success('Attributs enregistrés', {
        description: 'Les modifications ont été persistées dans Supabase.',
      });
      setEdits({});
      setEditMode(false);
    } catch (err) {
      toast.error('Échec de l\'enregistrement', { description: formatApiError(err) });
    }
  };

  const decreaseHeight = () => {
    setHeightPreset((prev) => (prev === 'expanded' ? 'default' : 'compact'));
  };

  const increaseHeight = () => {
    setHeightPreset((prev) => (prev === 'compact' ? 'default' : 'expanded'));
  };

  const getRowLabel = (row: AttributeTableRow): string => {
    return row.values.name?.trim() || row.energyAsset?.name || row.id;
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteRow?.energyAsset) return;

    const rowId = pendingDeleteRow.id;
    try {
      await deleteEnergyAsset.mutateAsync(rowId);
      toast.success('Équipement supprimé avec succès');
      setEdits((prev) => {
        if (!prev[rowId]) return prev;
        const next = { ...prev };
        delete next[rowId];
        return next;
      });
      setSelectedIds((prev) => {
        if (!prev.has(rowId)) return prev;
        const next = new Set(prev);
        next.delete(rowId);
        return next;
      });
      setPendingDeleteRow(null);
    } catch (err) {
      toast.error('Échec de la suppression', { description: formatApiError(err) });
    }
  };

  const handleConfirmBulkDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;

    try {
      const count = await bulkDeleteEnergyAssets.mutateAsync(ids);
      toast.success(
        `${count} équipement${count > 1 ? 's' : ''} supprimé${count > 1 ? 's' : ''} avec succès`,
      );
      setSelectedIds(new Set());
      setEdits((prev) => {
        const next = { ...prev };
        for (const id of ids) delete next[id];
        return next;
      });
      setBulkDeleteOpen(false);
    } catch (err) {
      toast.error('Échec de la suppression groupée', { description: formatApiError(err) });
    }
  };

  if (!open || !layerId) return null;

  const saving = updateEnergyAsset.isPending || updateTicket.isPending;
  const deleting = deleteEnergyAsset.isPending || bulkDeleteEnergyAssets.isPending;
  const hasEdits = Object.keys(edits).length > 0;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-[2200] flex flex-col rounded-t-2xl border border-slate-200 bg-white shadow-2xl ${DRAWER_HEIGHT_CLASSES[heightPreset]}`}
      role="dialog"
      aria-label="Table d'attributs"
    >
      <div className="flex shrink-0 items-center justify-center border-b border-slate-100 py-1">
        <div className="flex items-center gap-1 rounded-lg bg-slate-100/80 px-1 py-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Réduire"
            disabled={heightPreset === 'compact'}
            onClick={decreaseHeight}
          >
            <ChevronsDown size={14} />
          </Button>
          <span className="px-1 text-[10px] font-medium text-slate-500">
            {DRAWER_HEIGHT_LABELS[heightPreset]}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Agrandir"
            disabled={heightPreset === 'expanded'}
            onClick={increaseHeight}
          >
            <ChevronsUp size={14} />
          </Button>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <Table2 size={18} className="text-slate-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Table d&apos;attributs — {getAttributeTableLayerLabel(layerId)}
              </h2>
              <p className="text-xs text-slate-500">
                {filteredRows.length} objet{filteredRows.length > 1 ? 's' : ''} — clic sur une ligne pour zoomer
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Recherche globale…"
                className="h-9 pl-9"
              />
            </div>

            {canEditLayer && (
              <Button
                type="button"
                variant={editMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setEditMode((v) => !v);
                  if (editMode) setEdits({});
                }}
              >
                <Pencil size={14} />
                {editMode ? 'Édition active' : 'Activer l\'édition'}
              </Button>
            )}

            {editMode && hasEdits && (
              <Button type="button" size="sm" disabled={saving} onClick={() => void handleSave()}>
                <Save size={14} />
                {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
              </Button>
            )}

            <Button type="button" variant="ghost" size="icon" onClick={handleClose}>
              <X size={16} />
            </Button>
          </div>
        </div>

        {selectedCount > 0 && canDeleteEnergy && (
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 border-b border-red-100 bg-red-50 px-4 py-2">
            <span className="text-xs font-medium text-red-900">
              {selectedCount} élément{selectedCount > 1 ? 's' : ''} sélectionné
              {selectedCount > 1 ? 's' : ''}
            </span>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={deleting}
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2 size={14} />
              Supprimer la sélection
            </Button>
          </div>
        )}

        {!canEditLayer && layerId !== 'chantiers' && (
          <div className="shrink-0 border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-600">
            Mode consultation — l&apos;édition des attributs est réservée au syndicat (DGS, DST, Chargé d&apos;Affaires).
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-auto">
          <table className="w-full min-w-max text-left text-xs">
            <thead className="sticky top-0 z-10 bg-white shadow-sm">
              <tr>
                {canShowSelection && (
                  <th className="w-10 border-b border-slate-200 px-3 py-2">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-sky-500"
                      checked={allSelectableSelected}
                      onChange={toggleSelectAllVisible}
                      aria-label="Tout sélectionner"
                    />
                  </th>
                )}
                {tableData.columns.map((col) => (
                  <th
                    key={col.key}
                    className="border-b border-slate-200 px-3 py-2 font-semibold uppercase tracking-wide text-slate-500"
                  >
                    {col.label}
                  </th>
                ))}
                {canShowActions && (
                  <th className="border-b border-slate-200 px-3 py-2 font-semibold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={
                      tableData.columns.length + actionsColumnCount + selectionColumnCount
                    }
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    Aucun objet à afficher.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const isSelected = selectedIds.has(row.id);

                  return (
                  <tr
                    key={row.id}
                    className={`cursor-pointer border-b border-slate-100 hover:bg-sky-50/60 ${
                      isSelected ? 'bg-slate-100/80' : ''
                    }`}
                    onClick={() => {
                      if (row.sourceType === 'site_chantier') return;
                      if (row.latitude === 0 && row.longitude === 0) return;
                      onZoomTo(row.latitude, row.longitude);
                    }}
                  >
                    {canShowSelection && row.energyAsset && (
                      <td className="w-10 px-3 py-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-sky-500"
                          checked={isSelected}
                          aria-label={`Sélectionner ${getRowLabel(row)}`}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => toggleRowSelection(row.id, e.target.checked)}
                        />
                      </td>
                    )}
                    {canShowSelection && !row.energyAsset && (
                      <td className="w-10 px-3 py-2" />
                    )}
                    {tableData.columns.map((col) => {
                      const value = getCellValue(row, col.key, edits);
                      const editable = isColumnEditable(col);

                      return (
                        <td key={col.key} className="max-w-[220px] px-3 py-2 text-slate-800">
                          {editable ? (
                            col.type === 'enum' && col.enumOptions ? (
                              <Select
                                value={value || col.enumOptions[0]?.value}
                                onValueChange={(v) => setCellEdit(row.id, col.key, v)}
                              >
                                <SelectTrigger
                                  className="h-8 min-w-[120px]"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {col.enumOptions.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                value={value}
                                type={col.type === 'number' ? 'number' : 'text'}
                                className="h-8"
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => setCellEdit(row.id, col.key, e.target.value)}
                              />
                            )
                          ) : col.key === 'status' && layerId !== 'chantiers' ? (
                            <Badge variant="outline" className="text-[10px]">{value}</Badge>
                          ) : (
                            <span className="block truncate" title={value}>{value}</span>
                          )}
                        </td>
                      );
                    })}
                    {canShowActions && row.energyAsset && (
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          {canShowReposition && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRepositionAsset?.(row.energyAsset!);
                                handleClose();
                              }}
                            >
                              <Move size={12} />
                              Repositionner
                            </Button>
                          )}
                          {canDeleteEnergy && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                              title="Supprimer l'équipement"
                              disabled={deleting}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPendingDeleteRow(row);
                              }}
                            >
                              <Trash2 size={14} />
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      <AlertDialog
        open={pendingDeleteRow !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteRow(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cet équipement (
              {pendingDeleteRow ? getRowLabel(pendingDeleteRow) : ''}) ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDelete();
              }}
            >
              {deleting ? 'Suppression…' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={bulkDeleteOpen}
        onOpenChange={(open) => {
          if (!open) setBulkDeleteOpen(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression groupée</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer définitivement ces {selectedCount} équipement
              {selectedCount > 1 ? 's' : ''} ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmBulkDelete();
              }}
            >
              {deleting ? 'Suppression…' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
  );
}
