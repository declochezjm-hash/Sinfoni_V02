import type { CommuneWorkRequestType } from '../types';
import { COMMUNE_WORK_REQUEST_OPTIONS } from '../lib/projectConstants';
import { X, MapPin, Send } from 'lucide-react';
import { useState } from 'react';

interface CommuneDemandFormProps {
  latitude: number;
  longitude: number;
  saving: boolean;
  error: string | null;
  onSubmit: (workType: CommuneWorkRequestType, description: string) => Promise<void>;
  onCancel: () => void;
}

export default function CommuneDemandForm({
  latitude,
  longitude,
  saving,
  error,
  onSubmit,
  onCancel,
}: CommuneDemandFormProps) {
  const [workType, setWorkType] = useState<CommuneWorkRequestType>('Éclairage Public');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    await onSubmit(workType, description.trim());
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Nouvelle demande de travaux</h2>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
              <MapPin size={12} />
              {latitude.toFixed(5)}, {longitude.toFixed(5)}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 p-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Type de travaux
            </label>
            <select
              value={workType}
              onChange={(e) => setWorkType(e.target.value as CommuneWorkRequestType)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            >
              {COMMUNE_WORK_REQUEST_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Description / Justification du besoin
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              required
              placeholder="Décrivez le besoin, le contexte et l'urgence éventuelle…"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || !description.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <Send size={14} />
              )}
              {saving ? 'Envoi…' : 'Soumettre la demande'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
