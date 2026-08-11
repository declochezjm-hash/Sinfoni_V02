import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, GitBranch, Image } from 'lucide-react';
import { ProjectPhotoGallerySection } from './ProjectPhotoGallerySection';
import { ProjectInstructionActions } from './ProjectInstructionActions';
import { TimeProgressBar } from './TimeProgressBar';
import { formatDate, getStatusColor, getTypeColor } from '../lib/utils';
import type { Project, ProjectStatus } from '../types';
import type { WorkflowStep } from '../hooks/useProjects';

interface CommuneProjectDetailProps {
  project: Project;
  steps: WorkflowStep[];
  stepsLoading: boolean;
  projectId: string;
  onUpdateStatus: (status: ProjectStatus) => Promise<void>;
}

export function CommuneProjectDetail({
  project,
  steps,
  stepsLoading,
  projectId,
  onUpdateStatus,
}: CommuneProjectDetailProps) {
  const navigate = useNavigate();

  const progress = steps.length
    ? Math.round((steps.filter((s) => s.status === 'completed').length / steps.length) * 100)
    : 0;

  const activeStep = steps.find((s) => s.status === 'active');

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/commune/dossiers')}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{project.title}</h1>
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusColor(project.status)}`}>
                {project.status}
              </span>
            </div>
            <p className="text-sm text-slate-500">
              {project.reference} · {project.location}
            </p>
          </div>
        </div>
        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${getTypeColor(project.type)}`}>
          {project.type}
        </span>
      </div>

      <ProjectInstructionActions project={project} onUpdateStatus={onUpdateStatus} />

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <GitBranch size={16} className="text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900">Avancement global</h2>
          </div>
          {stepsLoading ? (
            <div className="flex h-24 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
            </div>
          ) : (
            <>
              <div className="mb-3">
                <div className="mb-1 flex justify-between text-xs text-slate-500">
                  <span>Progression du dossier</span>
                  <span className="font-semibold text-slate-800">{progress}%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-slate-900 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              {activeStep && (
                <p className="text-sm text-slate-600">
                  Étape en cours : <span className="font-medium">{activeStep.stepLabel}</span>
                </p>
              )}
              <ul className="mt-4 space-y-2">
                {steps.map((step) => (
                  <li key={step.id} className="flex items-center gap-2 text-xs">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        step.status === 'completed'
                          ? 'bg-emerald-500'
                          : step.status === 'active'
                            ? 'bg-sky-500'
                            : 'bg-slate-200'
                      }`}
                    />
                    <span className={step.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-700'}>
                      {step.stepLabel}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Calendar size={16} className="text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900">Planning</h2>
          </div>
          {project.startDate && project.expectedEndDate ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Début prévu</p>
                  <p className="font-medium text-slate-900">{formatDate(project.startDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Fin prévue</p>
                  <p className="font-medium text-slate-900">{formatDate(project.expectedEndDate)}</p>
                </div>
              </div>
              <TimeProgressBar
                startDate={project.startDate}
                endDate={project.expectedEndDate}
                status={project.status}
              />
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Les dates de planning seront communiquées par le syndicat une fois le dossier validé.
            </p>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Image size={16} className="text-slate-500" />
          <h2 className="text-sm font-bold text-slate-900">Galerie photos</h2>
        </div>
        <ProjectPhotoGallerySection projectId={projectId} canEdit={false} />
      </section>

      {project.description && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-bold text-slate-900">Description</h2>
          <p className="text-sm text-slate-600 whitespace-pre-wrap">{project.description}</p>
        </section>
      )}
    </div>
  );
}
