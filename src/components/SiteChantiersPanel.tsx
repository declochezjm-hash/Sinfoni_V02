import { HardHat, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { Chantier } from '../types';
import { chantierStatusBadgeClass, formatChantierStatus, hasChantierCoordinates } from '../lib/chantierUtils';

interface SiteChantiersPanelProps {
  chantiers: Chantier[];
  onZoomTo?: (latitude: number, longitude: number) => void;
}

export default function SiteChantiersPanel({ chantiers, onZoomTo }: SiteChantiersPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (chantiers.length === 0) return null;

  return (
    <div className="pointer-events-none absolute right-3 top-3 z-[1000] w-[min(100%,20rem)]">
      <div className="pointer-events-auto overflow-hidden rounded-xl border border-slate-200 bg-white/95 shadow-lg backdrop-blur-sm">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex w-full items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/90 px-3 py-2.5 text-left transition hover:bg-slate-100/90"
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
              <HardHat size={15} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900">Chantiers actifs</p>
              <p className="text-[11px] text-slate-500">
                {chantiers.length} site{chantiers.length > 1 ? 's' : ''}
                {chantiers.every((c) => !hasChantierCoordinates(c))
                  ? ' · sans GPS'
                  : ''}
              </p>
            </div>
          </div>
          <span className="flex shrink-0 items-center gap-1.5">
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white">
              {chantiers.length}
            </span>
            {collapsed ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronUp size={14} className="text-slate-400" />}
          </span>
        </button>

        {!collapsed && (
          <ul className="max-h-[min(50vh,18rem)] divide-y divide-slate-100 overflow-y-auto">
            {chantiers.map((chantier) => {
              const canZoom = hasChantierCoordinates(chantier);

              return (
                <li key={chantier.id}>
                  <button
                    type="button"
                    disabled={!canZoom}
                    onClick={() => {
                      if (canZoom && onZoomTo) {
                        onZoomTo(chantier.latitude!, chantier.longitude!);
                      }
                    }}
                    className={`flex w-full flex-col gap-1 px-3 py-2.5 text-left transition ${
                      canZoom ? 'hover:bg-sky-50/80' : 'cursor-default'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {chantier.code && (
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            {chantier.code}
                          </p>
                        )}
                        <p className="truncate text-sm font-medium text-slate-900">{chantier.name}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${chantierStatusBadgeClass(chantier.status)}`}
                      >
                        {formatChantierStatus(chantier.status)}
                      </span>
                    </div>
                    {chantier.address && (
                      <p className="flex items-start gap-1 text-[11px] leading-snug text-slate-500">
                        <MapPin size={11} className="mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{chantier.address}</span>
                      </p>
                    )}
                    {!canZoom && (
                      <p className="text-[10px] italic text-slate-400">Adresse seule — non affiché sur la carte</p>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
