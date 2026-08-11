import {
  Leaf,
  Zap,
  Euro,
  Plus,
  Trash2,
  RotateCcw,
  Info,
} from 'lucide-react';
import { useCEEcalculator } from '../hooks/useCEEcalculator';
import {
  formatKwhCumac,
  formatMwhCumac,
  formatCo2Tonnes,
  RES_EC_104_HOURS_PER_YEAR,
  RES_EC_104_F_CUMAC,
} from '../lib/ceeCalculator';
import { formatCurrency } from '../lib/utils';
import type { Project } from '../types';

interface EnergyCEEDashboardProps {
  project: Project;
}

function KpiCard({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  accent: string;
}) {
  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm ${accent}`}>
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {icon}
        {label}
      </div>
      <p className="text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      <p className="mt-1 text-[11px] text-slate-500">{hint}</p>
    </div>
  );
}

export function EnergyCEEDashboard({ project }: EnergyCEEDashboardProps) {
  const {
    lines,
    totals,
    updateLine,
    addLine,
    removeLine,
    resetToDefaults,
    priceEurPerMwhCumac,
    setPriceEurPerMwhCumac,
  } = useCEEcalculator();

  const inputClass =
    'w-full min-w-0 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs focus:border-slate-400 focus:outline-none';

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Efficacité énergétique & valorisation CEE
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Fiche DGEC <span className="font-semibold text-slate-700">{totals.fiche.code}</span>
            {' — '}
            {totals.fiche.label} · Affaire {project.reference}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
              Prix MWh cumac (€/MWhc)
            </label>
            <input
              type="number"
              min={0}
              step={0.1}
              value={priceEurPerMwhCumac}
              onChange={(e) =>
                setPriceEurPerMwhCumac(Math.max(0, Number(e.target.value) || 0))
              }
              className="w-28 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-slate-400 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={resetToDefaults}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <RotateCcw size={12} /> Réinitialiser
          </button>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
        <Info size={14} className="mt-0.5 shrink-0 text-slate-400" />
        <p>
          E<sub>cumac</sub> = P<sub>gain</sub> (kW) × {RES_EC_104_HOURS_PER_YEAR}&nbsp;h × F
          <sub>cumac</sub> ({RES_EC_104_F_CUMAC}&nbsp;ans) × Nb luminaires. Valorisation = E
          <sub>cumac</sub> (MWh) × {priceEurPerMwhCumac.toFixed(2)}&nbsp;€/MWhc.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          icon={<Zap size={14} className="text-amber-600" />}
          label="Économies kWh cumac"
          value={`${formatKwhCumac(totals.eCumacKwh)} kWhc`}
          hint={`${formatMwhCumac(totals.eCumacMwh)} MWh cumac · ${totals.totalLuminaires} luminaires`}
          accent="border-amber-200"
        />
        <KpiCard
          icon={<Euro size={14} className="text-emerald-600" />}
          label="Primes CEE estimées"
          value={formatCurrency(totals.valorisationEur)}
          hint={`À ${priceEurPerMwhCumac.toFixed(2)} € / MWhc`}
          accent="border-emerald-200"
        />
        <KpiCard
          icon={<Leaf size={14} className="text-teal-600" />}
          label="Tonnage CO₂ évité"
          value={`${formatCo2Tonnes(totals.co2Tonnes)} t`}
          hint="Facteur résiduel 0,052 kg CO₂e / kWh"
          accent="border-teal-200"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h4 className="text-sm font-bold text-slate-900">
            Récapitulatif par équipement
          </h4>
          <button
            type="button"
            onClick={addLine}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
          >
            <Plus size={12} /> Ajouter
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3 py-2 font-semibold">Équipement / secteur</th>
                <th className="px-3 py-2 font-semibold">Avant</th>
                <th className="px-3 py-2 font-semibold">Après</th>
                <th className="px-3 py-2 font-semibold text-right">P ancienne</th>
                <th className="px-3 py-2 font-semibold text-right">P LED</th>
                <th className="px-3 py-2 font-semibold text-right">Qté</th>
                <th className="px-3 py-2 font-semibold text-right">P gain</th>
                <th className="px-3 py-2 font-semibold text-right">kWh cumac</th>
                <th className="px-3 py-2 font-semibold text-right">Prime €</th>
                <th className="px-3 py-2 font-semibold w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map((line) => (
                <tr key={line.id} className="hover:bg-slate-50/80">
                  <td className="px-3 py-2">
                    <input
                      value={line.label}
                      onChange={(e) => updateLine(line.id, { label: e.target.value })}
                      className={inputClass}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={line.oldTechnology}
                      onChange={(e) =>
                        updateLine(line.id, { oldTechnology: e.target.value })
                      }
                      className={inputClass}
                      placeholder="250W SHP"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={line.newTechnology}
                      onChange={(e) =>
                        updateLine(line.id, { newTechnology: e.target.value })
                      }
                      className={inputClass}
                      placeholder="70W LED"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      value={line.oldPowerW}
                      onChange={(e) =>
                        updateLine(line.id, {
                          oldPowerW: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className={`${inputClass} text-right tabular-nums`}
                    />
                    <span className="ml-0.5 text-[10px] text-slate-400">W</span>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      value={line.newPowerW}
                      onChange={(e) =>
                        updateLine(line.id, {
                          newPowerW: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className={`${inputClass} text-right tabular-nums`}
                    />
                    <span className="ml-0.5 text-[10px] text-slate-400">W</span>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      value={line.quantity}
                      onChange={(e) =>
                        updateLine(line.id, {
                          quantity: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className={`${inputClass} text-right tabular-nums`}
                    />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                    {line.powerGainKw.toLocaleString('fr-FR', {
                      maximumFractionDigits: 3,
                    })}{' '}
                    kW
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium text-slate-800">
                    {formatKwhCumac(line.eCumacKwh)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium text-emerald-700">
                    {formatCurrency(line.valorisationEur)}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => removeLine(line.id)}
                      disabled={lines.length <= 1}
                      className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                      title="Supprimer la ligne"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 text-xs font-semibold text-slate-800">
              <tr>
                <td className="px-3 py-2.5" colSpan={5}>
                  Total
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {totals.totalLuminaires}
                </td>
                <td className="px-3 py-2.5" />
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {formatKwhCumac(totals.eCumacKwh)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700">
                  {formatCurrency(totals.valorisationEur)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
