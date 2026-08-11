import { useState } from 'react';
import { useRole } from '../hooks/useRole';
import { useProjects } from '../hooks/useProjects';
import {
  useDocuments,
  downloadDocument,
  type DocumentCategory,
  type GedDocument,
} from '../hooks/useDocuments';
import { formatDate } from '../lib/utils';
import GenerateDocumentModal from '../components/GenerateDocumentModal';
import {
  FileText,
  FolderOpen,
  Upload,
  Download,
  Clock,
  History,
  Search,
  FilePlus,
  X,
  ChevronDown,
  ChevronUp,
  Building2,
  AlertCircle,
} from 'lucide-react';

const CATEGORY_COLORS: Record<string, string> = {
  Administratif: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  Technique: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  Financier: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
};

export default function GED() {
  const { user, organizationId } = useRole();
  const { projects } = useProjects();
  const {
    docs,
    loading,
    error: docsError,
    uploading,
    uploadProgress,
    uploadError,
    refetch,
    uploadDocument,
  } = useDocuments(organizationId, projects);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const isContractor = user.role === 'Prestataire Extérieur';

  const filtered = docs.filter((d) => {
    const matchesSearch =
      search.trim() === '' ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.projectRef.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || d.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleDownload = (doc: Pick<GedDocument, 'name' | 'fileUrl'>) => {
    if (downloadDocument(doc)) return;
    const blob = new Blob([`Contenu simulé du document : ${doc.name}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const affaireOptions = projects.map((p) => ({
    id: p.id,
    code: p.reference,
    name: p.title,
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">GED centralisée</h1>
          <p className="text-sm text-slate-500">
            Référentiel documentaire unique — {filtered.length} document{filtered.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isContractor && (
            <button
              onClick={() => setShowGenerator(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
            >
              <FilePlus size={16} /> Générer document
            </button>
          )}
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Upload size={16} /> Importer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(['Administratif', 'Technique', 'Financier'] as const).map((cat) => {
          const count = docs.filter((d) => d.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setCategoryFilter(categoryFilter === cat ? 'all' : cat)}
              className={`flex items-center gap-4 rounded-xl border p-4 shadow-sm transition-colors ${
                categoryFilter === cat
                  ? 'border-slate-900 bg-slate-50'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-600">
                <FolderOpen size={18} />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-900">{cat}</p>
                <p className="text-xs text-slate-500">{count} document{count > 1 ? 's' : ''}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un document..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none transition-colors"
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Document</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Catégorie</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Affaire</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Taille</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Version</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">
                    Chargement...
                  </td>
                </tr>
              ) : docsError ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-red-600">
                    Impossible de charger les documents : {docsError}
                  </td>
                </tr>
              ) : (
                <>
                  {filtered.map((doc) => (
                    <FragmentRow
                      key={doc.id}
                      doc={doc}
                      expanded={expandedDoc === doc.id}
                      onToggle={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
                      onDownload={handleDownload}
                    />
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">
                        Aucun document ne correspond aux critères.
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isContractor && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-blue-600" />
            <p className="text-sm font-medium text-blue-900">
              Portail Prestataire — Vous visualisez uniquement les documents partagés avec votre entreprise.
            </p>
          </div>
        </div>
      )}

      {showUpload && (
        <UploadModal
          projects={projects}
          uploading={uploading}
          uploadProgress={uploadProgress}
          uploadError={uploadError}
          onClose={() => setShowUpload(false)}
          onUpload={uploadDocument}
        />
      )}

      {showGenerator && (
        <GenerateDocumentModal
          open={showGenerator}
          onOpenChange={setShowGenerator}
          affaires={affaireOptions}
          projects={projects}
          organizationId={organizationId || ''}
          saveToGed
          onGenerated={() => void refetch()}
        />
      )}
    </div>
  );
}

function UploadModal({
  projects,
  uploading,
  uploadProgress,
  uploadError,
  onClose,
  onUpload,
}: {
  projects: { id: string; reference: string; title: string }[];
  uploading: boolean;
  uploadProgress: number;
  uploadError: string | null;
  onClose: () => void;
  onUpload: (params: { file: File; projectId: string; category: DocumentCategory }) => Promise<void>;
}) {
  const [projectId, setProjectId] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('Administratif');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!projectId || !selectedFile) {
      setLocalError('Sélectionnez une affaire et un fichier.');
      return;
    }
    setLocalError(null);
    try {
      await onUpload({ file: selectedFile, projectId, category });
      setSuccess(true);
    } catch {
      // uploadError géré par le hook
    }
  };

  const handleClose = () => {
    if (uploading) return;
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Importer un document</h3>
          <button
            onClick={handleClose}
            disabled={uploading}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        {success ? (
          <div className="space-y-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mx-auto">
              <Upload size={28} className="text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-slate-900">Document importé avec succès</p>
            <p className="text-xs text-slate-500">{selectedFile?.name}</p>
            <button
              onClick={handleClose}
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
            >
              Fermer
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Affaire</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                disabled={uploading}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none disabled:opacity-50"
              >
                <option value="">Sélectionner une affaire</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.reference} — {p.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Catégorie</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as DocumentCategory)}
                disabled={uploading}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none disabled:opacity-50"
              >
                <option value="Administratif">Administratif</option>
                <option value="Technique">Technique</option>
                <option value="Financier">Financier</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Fichier</label>
              <label
                className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 transition-colors ${
                  selectedFile
                    ? 'border-emerald-300 bg-emerald-50'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100'
                } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
              >
                <Upload size={24} className={selectedFile ? 'text-emerald-600' : 'text-slate-400'} />
                <span className="mt-2 text-sm font-medium text-slate-700">
                  {selectedFile ? selectedFile.name : 'Cliquez ou glissez un fichier'}
                </span>
                <span className="mt-1 text-xs text-slate-400">PDF, DOCX, XLSX, images…</span>
                <input
                  type="file"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    setSelectedFile(e.target.files?.[0] ?? null);
                    setLocalError(null);
                  }}
                />
              </label>
            </div>

            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Envoi en cours…</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-slate-900 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {(localError || uploadError) && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
                <p className="text-xs text-red-700">{localError || uploadError}</p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={uploading || !projectId || !selectedFile}
              className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {uploading ? 'Import en cours…' : 'Importer le document'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FragmentRow({
  doc,
  expanded,
  onToggle,
  onDownload,
}: {
  doc: GedDocument;
  expanded: boolean;
  onToggle: () => void;
  onDownload: (doc: GedDocument) => void;
}) {
  return (
    <>
      <tr className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-slate-400 shrink-0" />
            <span className="font-medium text-slate-900 truncate max-w-[16rem]">{doc.name}</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
              CATEGORY_COLORS[doc.category] || 'bg-gray-50 text-gray-700 ring-gray-600/20'
            }`}
          >
            {doc.category}
          </span>
        </td>
        <td className="px-4 py-3 text-slate-600">{doc.projectRef || '—'}</td>
        <td className="px-4 py-3 text-slate-500">{doc.size || '—'}</td>
        <td className="px-4 py-3">
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <Clock size={12} /> v{doc.version}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onDownload(doc)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Download size={12} /> Télécharger
            </button>
            <button
              onClick={onToggle}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <History size={12} />
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} className="px-4 py-3 bg-slate-50/50">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Métadonnées du document
              </p>
              <div className="flex items-center gap-3 rounded-lg bg-white border border-slate-100 px-3 py-2">
                <span className="text-xs font-bold text-slate-500">v{doc.version}</span>
                <span className="text-xs text-slate-600">{doc.name}</span>
                {doc.fileUrl && (
                  <span className="text-xs text-emerald-600">Fichier stocké</span>
                )}
                <span className="ml-auto text-xs text-slate-400">
                  Créé le {formatDate(doc.createdAt)} · MAJ le {formatDate(doc.updatedAt)}
                </span>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
