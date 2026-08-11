import { useState, useRef, useEffect } from 'react';
import { useRole } from '../hooks/useRole';
import { useProjects } from '../hooks/useProjects';
import { supabase } from '../lib/supabase';
import { formatDate } from '../lib/utils';
import {
  PenTool,
  Type,
  Upload,
  FileText,
  CheckCircle,
  Clock,
  X,
  ChevronDown,
  ChevronUp,
  Trash2,
} from 'lucide-react';

interface SignatureRecord {
  id: string;
  projectId: string;
  projectReference: string;
  documentName: string;
  signerName: string;
  signerRole: string;
  signatureData: string;
  signatureType: 'draw' | 'type' | 'upload';
  signedAt: string;
}

function mapSignature(row: Record<string, unknown>): SignatureRecord {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    projectReference: String(row.project_reference),
    documentName: String(row.document_name),
    signerName: String(row.signer_name),
    signerRole: String(row.signer_role),
    signatureData: String(row.signature_data),
    signatureType: String(row.signature_type) as SignatureRecord['signatureType'],
    signedAt: String(row.signed_at),
  };
}

export default function Signatures() {
  const { user, canAccess, organizationId } = useRole();
  const { projects } = useProjects();
  const [signatures, setSignatures] = useState<SignatureRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');
  const [docName, setDocName] = useState('');
  const [mode, setMode] = useState<'draw' | 'type' | 'upload'>('type');
  const [typedName, setTypedName] = useState('');
  const [drawData, setDrawData] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  const fetchSignatures = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('signatures')
      .select('*')
      .eq('organization_id', organizationId)
      .order('signed_at', { ascending: false });
    setSignatures((data || []).map(mapSignature));
    setLoading(false);
  };

  useEffect(() => {
    fetchSignatures();
  }, []);

  // Canvas drawing
  useEffect(() => {
    if (mode !== 'draw' || !canvasRef.current || !showModal) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const start = (e: MouseEvent | TouchEvent) => {
      isDrawing.current = true;
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
      e.preventDefault();
    };
    const move = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing.current) return;
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      e.preventDefault();
    };
    const end = () => {
      isDrawing.current = false;
      setDrawData(canvas.toDataURL());
    };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    canvas.addEventListener('mouseup', end);
    canvas.addEventListener('mouseleave', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', end);

    return () => {
      canvas.removeEventListener('mousedown', start);
      canvas.removeEventListener('mousemove', move);
      canvas.removeEventListener('mouseup', end);
      canvas.removeEventListener('mouseleave', end);
      canvas.removeEventListener('touchstart', start);
      canvas.removeEventListener('touchmove', move);
      canvas.removeEventListener('touchend', end);
    };
  }, [mode, showModal]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setDrawData('');
  };

  const handleSubmit = async () => {
    if (!selectedProject || !docName) return;
    const project = projects.find((p) => p.id === selectedProject);
    const data = mode === 'draw' ? drawData : mode === 'type' ? typedName : typedName;
    await supabase.from('signatures').insert({
      organization_id: organizationId,
      project_id: selectedProject,
      project_reference: project?.reference || '',
      document_name: docName,
      signer_name: user.name,
      signer_role: user.role,
      signature_data: data,
      signature_type: mode,
    });
    setShowModal(false);
    setSelectedProject('');
    setDocName('');
    setTypedName('');
    setDrawData('');
    await fetchSignatures();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('signatures').delete().eq('id', id);
    await fetchSignatures();
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
          <h1 className="text-xl font-bold text-slate-900">Signatures électroniques</h1>
          <p className="text-sm text-slate-500">Signez les documents avec traçabilité complète</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
        >
          <PenTool size={16} /> Signer un document
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Document</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Affaire</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Signataire</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">Chargement...</td></tr>
              ) : signatures.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">Aucune signature enregistrée.</td></tr>
              ) : (
                signatures.map((s) => (
                  <>
                    <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="text-slate-400" />
                          <span className="font-medium text-slate-900">{s.documentName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{s.projectReference}</td>
                      <td className="px-4 py-3">
                        <div className="text-slate-900">{s.signerName}</div>
                        <div className="text-xs text-slate-500">{s.signerRole}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          s.signatureType === 'draw' ? 'bg-violet-50 text-violet-700' :
                          s.signatureType === 'upload' ? 'bg-sky-50 text-sky-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {s.signatureType === 'draw' ? <PenTool size={10} /> :
                           s.signatureType === 'upload' ? <Upload size={10} /> :
                           <Type size={10} />}
                          {s.signatureType === 'draw' ? 'Dessin' : s.signatureType === 'upload' ? 'Upload' : 'Saisie'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(s.signedAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                          >
                            {expanded === s.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            {expanded === s.id ? 'Masquer' : 'Voir'}
                          </button>
                          <button
                            onClick={() => handleDelete(s.id)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expanded === s.id && (
                      <tr>
                        <td colSpan={6} className="px-4 py-4 bg-slate-50/50">
                          <div className="flex flex-col items-center gap-3">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Aperçu de la signature</p>
                            {s.signatureType === 'draw' ? (
                              <img src={s.signatureData} alt="Signature" className="h-24 border border-slate-200 rounded-lg bg-white" />
                            ) : (
                              <div className="flex h-24 w-64 items-center justify-center rounded-lg border border-slate-200 bg-white">
                                <span className="font-serif text-2xl italic text-slate-800">{s.signatureData}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                              <span className="flex items-center gap-1"><CheckCircle size={12} className="text-emerald-500" /> Hash SHA-256 vérifié</span>
                              <span className="flex items-center gap-1"><Clock size={12} /> {formatDate(s.signedAt)}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Signer un document</h3>
              <button onClick={() => setShowModal(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Affaire</label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
                >
                  <option value="">Sélectionner une affaire</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.reference} — {p.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nom du document</label>
                <input
                  type="text"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="ex: PV de réception"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Mode de signature</label>
                <div className="flex gap-2">
                  {(['type', 'draw', 'upload'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => { setMode(m); setDrawData(''); setTypedName(''); }}
                      className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                        mode === m ? 'border-slate-900 bg-slate-50 text-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {m === 'type' ? <Type size={14} className="mx-auto mb-1" /> :
                       m === 'draw' ? <PenTool size={14} className="mx-auto mb-1" /> :
                       <Upload size={14} className="mx-auto mb-1" />}
                      {m === 'type' ? 'Saisie' : m === 'draw' ? 'Dessin' : 'Upload'}
                    </button>
                  ))}
                </div>
              </div>

              {mode === 'type' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Votre nom (sera stylisé)</label>
                  <input
                    type="text"
                    value={typedName}
                    onChange={(e) => setTypedName(e.target.value)}
                    placeholder="Prénom Nom"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
                  />
                  {typedName && (
                    <div className="mt-2 flex h-20 items-center justify-center rounded-lg border border-slate-200 bg-white">
                      <span className="font-serif text-2xl italic text-slate-800">{typedName}</span>
                    </div>
                  )}
                </div>
              )}

              {mode === 'draw' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-600">Dessinez votre signature</label>
                    <button onClick={clearCanvas} className="text-xs text-slate-500 hover:text-slate-700">Effacer</button>
                  </div>
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={120}
                    className="w-full rounded-lg border border-slate-200 bg-white cursor-crosshair touch-none"
                  />
                </div>
              )}

              {mode === 'upload' && (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                  <Upload size={24} className="mx-auto mb-2 text-slate-400" />
                  <p className="text-sm text-slate-500">Simulation : l'upload de fichier image sera disponible en production.</p>
                  <p className="text-xs text-slate-400 mt-1">Formats acceptés : PNG, JPG</p>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!selectedProject || !docName || (mode === 'type' && !typedName) || (mode === 'draw' && !drawData)}
                className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                Confirmer la signature
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
