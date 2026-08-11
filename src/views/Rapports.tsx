import { useState, useEffect, useMemo } from 'react';
import { useRole } from '../hooks/useRole';
import { useProjects } from '../hooks/useProjects';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate, getStatusColor, getTypeColor } from '../lib/utils';
import {
  BarChart3,
  Filter,
  FileDown,
  Save,
  Play,
  Trash2,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  FolderKanban,
  Euro,
  AlertTriangle,
} from 'lucide-react';

interface SavedReport {
  id: string;
  name: string;
  filters: ReportFilters;
  columns: string[];
  createdBy: string;
  createdAt: string;
  lastRunAt?: string;
}

interface ReportFilters {
  status: string[];
  type: string[];
  dateFrom: string;
  dateTo: string;
  budgetMin: number;
  budgetMax: number;
  budgetAlert?: boolean;
}

const DEFAULT_FILTERS: ReportFilters = {
  status: [],
  type: [],
  dateFrom: '',
  dateTo: '',
  budgetMin: 0,
  budgetMax: 1000000,
  budgetAlert: false,
};

const ALL_COLUMNS = [
  { key: 'reference', label: 'Référence' },
  { key: 'title', label: 'Titre' },
  { key: 'type', label: 'Type' },
  { key: 'status', label: 'Statut' },
  { key: 'budgetTotal', label: 'Budget Total' },
  { key: 'budgetConsumed', label: 'Budget Consommé' },
  { key: 'budgetRate', label: '% Consommation' },
  { key: 'startDate', label: 'Date début' },
  { key: 'expectedEndDate', label: 'Date fin prévue' },
  { key: 'location', label: 'Localisation' },
  { key: 'ownerName', label: 'Chargé d\'affaires' },
  { key: 'contractorName', label: 'Prestataire' },
];

const STATUS_OPTIONS = ['Brouillon', 'APS/APD', 'BC/OS', 'En cours', 'PV/Réception', 'Clôturé', 'À planifier'];
const TYPE_OPTIONS = ['Électricité', 'Éclairage Public', 'Télécom', 'IRVE'];

function mapReport(row: Record<string, unknown>): SavedReport {
  return {
    id: String(row.id),
    name: String(row.name),
    filters: (row.filters || {}) as ReportFilters,
    columns: (row.columns || []) as string[],
    createdBy: String(row.created_by),
    createdAt: String(row.created_at),
    lastRunAt: row.last_run_at ? String(row.last_run_at) : undefined,
  };
}

export default function Rapports() {
  const { user, canAccess, organizationId } = useRole();
  const { projects } = useProjects();
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [filters, setFilters] = useState<ReportFilters>({ ...DEFAULT_FILTERS });
  const [selectedColumns, setSelectedColumns] = useState<string[]>(['reference', 'title', 'status', 'budgetTotal', 'budgetConsumed']);
  const [showFilters, setShowFilters] = useState(true);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [reportName, setReportName] = useState('');
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const fetchSaved = async () => {
    const { data } = await supabase
      .from('saved_reports')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    setSavedReports((data || []).map(mapReport));
  };

  useEffect(() => {
    fetchSaved();
  }, []);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (filters.status.length > 0 && !filters.status.includes(p.status)) return false;
      if (filters.type.length > 0 && !filters.type.includes(p.type)) return false;
      if (filters.dateFrom && new Date(p.startDate) < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && new Date(p.startDate) > new Date(filters.dateTo)) return false;
      if (p.budgetTotal < filters.budgetMin || p.budgetTotal > filters.budgetMax) return false;
      if (filters.budgetAlert && p.budgetTotal > 0 && (p.budgetConsumed / p.budgetTotal) <= 0.8) return false;
      return true;
    });
  }, [projects, filters]);

  const summary = useMemo(() => {
    const totalBudget = filteredProjects.reduce((s, p) => s + p.budgetTotal, 0);
    const totalConsumed = filteredProjects.reduce((s, p) => s + p.budgetConsumed, 0);
    const alertCount = filteredProjects.filter((p) => p.budgetTotal > 0 && (p.budgetConsumed / p.budgetTotal) > 0.8).length;
    return { count: filteredProjects.length, totalBudget, totalConsumed, alertCount };
  }, [filteredProjects]);

  const toggleArray = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];

  const handleSave = async () => {
    if (!reportName.trim()) return;
    await supabase.from('saved_reports').insert({
      organization_id: organizationId,
      name: reportName,
      filters,
      columns: selectedColumns,
      created_by: user.name,
      last_run_at: new Date().toISOString(),
    });
    setShowSaveModal(false);
    setReportName('');
    await fetchSaved();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('saved_reports').delete().eq('id', id);
    await fetchSaved();
  };

  const loadReport = (report: SavedReport) => {
    setFilters(report.filters);
    setSelectedColumns(report.columns);
    setExpandedReport(null);
  };

  const handleExportPDF = async () => {
    setGeneratingPdf(true);
    await new Promise((r) => setTimeout(r, 1500));
    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Rapport SINFONI</title>
<style>
body{font-family:Arial,sans-serif;color:#1e293b;padding:40px;}
h1{font-size:20px;margin-bottom:8px;}
.meta{color:#64748b;font-size:12px;margin-bottom:20px;}
table{width:100%;border-collapse:collapse;font-size:11px;margin-top:16px;}
th{background:#f8fafc;text-align:left;padding:8px;border-bottom:2px solid #e2e8f0;font-weight:600;}
td{padding:8px;border-bottom:1px solid #f1f5f9;}
tr:nth-child(even){background:#f8fafc;}
.badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:500;}
.footer{margin-top:24px;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:8px;}
</style>
</head>
<body>
<h1>Rapport d'affaires — SINFONI</h1>
<p class="meta">Généré le ${new Date().toLocaleString('fr-FR')} — ${filteredProjects.length} affaire(s)</p>
<table>
<thead><tr>${selectedColumns.map((c) => `<th>${ALL_COLUMNS.find((ac) => ac.key === c)?.label || c}</th>`).join('')}</tr></thead>
<tbody>
${filteredProjects.map((p) => `<tr>${selectedColumns.map((c) => {
  let val: string = '';
  if (c === 'budgetTotal') val = formatCurrency(p.budgetTotal);
  else if (c === 'budgetConsumed') val = formatCurrency(p.budgetConsumed);
  else if (c === 'budgetRate') val = p.budgetTotal > 0 ? Math.round((p.budgetConsumed / p.budgetTotal) * 100) + '%' : '-';
  else if (c === 'startDate') val = formatDate(p.startDate);
  else if (c === 'expectedEndDate') val = formatDate(p.expectedEndDate);
  else if (c === 'status') val = `<span class="badge" style="background:${p.status === 'En cours' ? '#d1fae5;color:#065f46' : p.status === 'Clôturé' ? '#1e293b;color:#fff' : '#e0f2fe;color:#0369a1'}">${p.status}</span>`;
  else if (c === 'type') val = p.type;
  else val = String((p as unknown as Record<string, unknown>)[c] ?? '');
  return `<td>${val}</td>`;
}).join('')}</tr>`).join('')}
</tbody>
</table>
<div class="footer">SINFONI — Système Intégré de Gestion des Affaires</div>
</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport_${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
    setGeneratingPdf(false);
  };

  const getCellValue = (p: (typeof projects)[0], col: string) => {
    switch (col) {
      case 'budgetTotal': return formatCurrency(p.budgetTotal);
      case 'budgetConsumed': return formatCurrency(p.budgetConsumed);
      case 'budgetRate': return p.budgetTotal > 0 ? Math.round((p.budgetConsumed / p.budgetTotal) * 100) + '%' : '-';
      case 'startDate': return formatDate(p.startDate);
      case 'expectedEndDate': return formatDate(p.expectedEndDate);
      case 'status': return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${getStatusColor(p.status)}`}>{p.status}</span>;
      case 'type': return <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${getTypeColor(p.type)}`}>{p.type}</span>;
      default: return String((p as unknown as Record<string, unknown>)[col] ?? '');
    }
  };

  if (!canAccess(['DGS', 'DST', 'Chargé d\'Affaires'])) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <p className="text-sm text-slate-500">Accès réservé.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Rapports avancés</h1>
          <p className="text-sm text-slate-500">Construisez, filtrez et exportez vos rapports d'affaires</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Filter size={16} /> {showFilters ? 'Masquer filtres' : 'Filtres'}
          </button>
          <button
            onClick={handleExportPDF}
            disabled={generatingPdf || filteredProjects.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            <FileDown size={16} /> {generatingPdf ? 'Génération...' : 'Exporter'}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Statut</label>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilters((f) => ({ ...f, status: toggleArray(f.status, s) }))}
                    className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                      filters.status.includes(s)
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Type</label>
              <div className="flex flex-wrap gap-1.5">
                {TYPE_OPTIONS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilters((f) => ({ ...f, type: toggleArray(f.type, t) }))}
                    className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                      filters.type.includes(t)
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Date de début</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-700"
                />
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-700"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Budget (€)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={filters.budgetMin}
                  onChange={(e) => setFilters((f) => ({ ...f, budgetMin: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-700"
                  placeholder="Min"
                />
                <span className="text-slate-400">—</span>
                <input
                  type="number"
                  value={filters.budgetMax}
                  onChange={(e) => setFilters((f) => ({ ...f, budgetMax: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-700"
                  placeholder="Max"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.budgetAlert || false}
                onChange={(e) => setFilters((f) => ({ ...f, budgetAlert: e.target.checked }))}
                className="rounded border-slate-300"
              />
              Uniquement les alertes budget &gt; 80%
            </label>
            <button
              onClick={() => setFilters({ ...DEFAULT_FILTERS })}
              className="ml-auto text-xs text-slate-500 hover:text-slate-700"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-600"><FolderKanban size={18} /></div>
          <div><p className="text-xs text-slate-500">Affaires</p><p className="text-lg font-bold text-slate-900">{summary.count}</p></div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-600"><Euro size={18} /></div>
          <div><p className="text-xs text-slate-500">Budget total</p><p className="text-lg font-bold text-slate-900">{formatCurrency(summary.totalBudget)}</p></div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-600"><Euro size={18} /></div>
          <div><p className="text-xs text-slate-500">Consommé</p><p className="text-lg font-bold text-slate-900">{formatCurrency(summary.totalConsumed)}</p></div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><AlertTriangle size={18} /></div>
          <div><p className="text-xs text-slate-500">Alertes</p><p className="text-lg font-bold text-slate-900">{summary.alertCount}</p></div>
        </div>
      </div>

      {/* Column selector */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={16} className="text-slate-500" />
          <h3 className="text-sm font-bold text-slate-900">Colonnes affichées</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {ALL_COLUMNS.map((c) => (
            <button
              key={c.key}
              onClick={() => setSelectedColumns((prev) => prev.includes(c.key) ? prev.filter((k) => k !== c.key) : [...prev, c.key])}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                selectedColumns.includes(c.key)
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {selectedColumns.includes(c.key) && <Check size={10} className="inline mr-1" />}
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {selectedColumns.map((c) => (
                  <th key={c} className="px-4 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">
                    {ALL_COLUMNS.find((ac) => ac.key === c)?.label || c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                  {selectedColumns.map((c) => (
                    <td key={c} className="px-4 py-3 text-slate-700 whitespace-nowrap">{getCellValue(p, c)}</td>
                  ))}
                </tr>
              ))}
              {filteredProjects.length === 0 && (
                <tr><td colSpan={selectedColumns.length} className="px-4 py-8 text-center text-sm text-slate-400">Aucun résultat pour ces critères.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowSaveModal(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Save size={16} /> Sauvegarder le rapport
        </button>
      </div>

      {/* Saved reports */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-3">Rapports sauvegardés</h3>
        <div className="space-y-2">
          {savedReports.map((r) => (
            <div key={r.id} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setExpandedReport(expandedReport === r.id ? null : r.id)}>
                    {expandedReport === r.id ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                  </button>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{r.name}</p>
                    <p className="text-[10px] text-slate-500">{r.createdBy} · {formatDate(r.createdAt)} {r.lastRunAt && `· Dernier run : ${formatDate(r.lastRunAt)}`}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => loadReport(r)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 transition-colors"
                    title="Charger"
                  >
                    <Play size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {expandedReport === r.id && (
                <div className="mt-2 ml-6 text-xs text-slate-500 space-y-1">
                  <p><span className="font-medium">Statuts :</span> {r.filters.status.length ? r.filters.status.join(', ') : 'Tous'}</p>
                  <p><span className="font-medium">Types :</span> {r.filters.type.length ? r.filters.type.join(', ') : 'Tous'}</p>
                  <p><span className="font-medium">Colonnes :</span> {r.columns.map((c) => ALL_COLUMNS.find((ac) => ac.key === c)?.label || c).join(', ')}</p>
                </div>
              )}
            </div>
          ))}
          {savedReports.length === 0 && <p className="text-xs text-slate-400">Aucun rapport sauvegardé.</p>}
        </div>
      </div>

      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Sauvegarder le rapport</h3>
              <button onClick={() => setShowSaveModal(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><X size={16} /></button>
            </div>
            <input
              type="text"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              placeholder="Nom du rapport"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
            />
            <button
              onClick={handleSave}
              disabled={!reportName.trim()}
              className="mt-3 w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              Sauvegarder
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
