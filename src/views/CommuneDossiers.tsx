import { useNavigate } from 'react-router-dom';
import { useProjects } from '../hooks/useProjects';
import { useRole } from '../hooks/useRole';
import { TimeProgressBar } from '../components/TimeProgressBar';
import { formatDate, getStatusColor, getTypeColor } from '../lib/utils';
import { FolderOpen, Eye, MapPin } from 'lucide-react';

export default function CommuneDossiers() {
  const { communeInseeCode } = useRole();
  const { data: projects = [], isLoading } = useProjects();
  const navigate = useNavigate();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Nos Dossiers</h1>
        <p className="text-sm text-slate-500">
          Affaires en cours sur votre commune (INSEE {communeInseeCode ?? '—'})
        </p>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <FolderOpen size={32} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-600">Aucun dossier pour le moment</p>
          <p className="mt-1 text-xs text-slate-400">
            Utilisez la carte pour déposer une nouvelle demande de travaux.
          </p>
          <button
            type="button"
            onClick={() => navigate('/commune/carte?mode=demande')}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            <MapPin size={14} /> Nouvelle demande
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Référence</th>
                <th className="px-4 py-3">Intitulé</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Avancement</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{project.reference}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{project.title}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${getTypeColor(project.type)}`}>
                      {project.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 min-w-[140px]">
                    {project.startDate && project.expectedEndDate ? (
                      <TimeProgressBar
                        startDate={project.startDate}
                        endDate={project.expectedEndDate}
                        status={project.status}
                        compact
                        showLabel={false}
                      />
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => navigate(`/commune/dossiers/${project.id}`)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      <Eye size={13} /> Voir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && projects.length > 0 && (
        <p className="text-xs text-slate-400">
          {projects.length} dossier{projects.length > 1 ? 's' : ''} · Dernière mise à jour{' '}
          {formatDate(projects[0]?.updatedAt ?? '')}
        </p>
      )}
    </div>
  );
}
