import { useMemo, useState } from 'react';
import { Lightbulb, TrendingDown, Clock, Euro, Wallet } from 'lucide-react';
import { useProjectQuoteLines, computeQuoteLinesTotal } from '../hooks/useProjectQuoteLines';
import {
  computeLedRoi,
  computeFinancingPlan,
  DEFAULT_LIGHTING_HOURS_PER_YEAR,
  CEE_KWH_CUMAC_PER_FIXTURE,
  CEE_EUR_PER_KWH_CUMAC,
  SYNDICAT_SUBSIDY_RATE,
} from '../lib/ledRoiCalculator';
import { formatCurrency } from '../lib/utils';
import type { Project } from '../types';

interface LedRoiSimulatorProps {
  project: Project;
}

export function LedRoiSimulator({ project }: LedRoiSimulatorProps) {
  const { lines } = useProjectQuoteLines(project.id);

  const quoteTotalFromLines = useMemo(() => computeQuoteLinesTotal(lines), [lines]);
  const defaultInvestment =
    quoteTotalFromLines > 0 ? quoteTotalFromLines : project.quoteAmountHt;

  const [fixtureCount, setFixtureCount] = useState(50);
  const [oldPowerW, setOldPowerW] = useState(250);
  const [newPowerW, setNewPowerW] = useState(40);
  const [kwhCostEur, setKwhCostEur] = useState(0.22);
  const [investmentHt, setInvestmentHt] = useState(defaultInvestment);

  const results = useMemo(
    () =>
      computeLedRoi({
        fixtureCount,
        oldPowerW,
        newPowerW,
        kwhCostEur,
        investmentHt,
      }),
    [fixtureCount, oldPowerW, newPowerW, kwhCostEur, investmentHt],
  );

  const financing = useMemo(
    () => computeFinancingPlan({ devisHt: investmentHt, fixtureCount }),
    [investmentHt, fixtureCount],
  );

  const inputClass =
    'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none';

  return (
    <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50/80 to-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Lightbulb size={18} className="text-amber-600" />
        <h3 className="text-sm font-bold text-slate-900">Simulateur de Rénovation LED</h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Nombre de foyers à rénover
          </label>
          <input
            type="number"
            min={0}
            value={fixtureCount}
            onChange={(e) => setFixtureCount(Math.max(0, Number(e.target.value) || 0))}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Puissance ancienne (W)
          </label>
          <input
            type="number"
            min={0}
            value={oldPowerW}
            onChange={(e) => setOldPowerW(Math.max(0, Number(e.target.value) || 0))}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Nouvelle puissance LED (W)
          </label>
          <input
            type="number"
            min={0}
            value={newPowerW}
            onChange={(e) => setNewPowerW(Math.max(0, Number(e.target.value) || 0))}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Coût estimé du kWh (€)
          </label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={kwhCostEur}
            onChange={(e) => setKwhCostEur(Math.max(0, Number(e.target.value) || 0))}
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Montant total HT du devis (investissement)
          </label>
          <input
            type="number"
            min={0}
            value={investmentHt}
            onChange={(e) => setInvestmentHt(Math.max(0, Number(e.target.value) || 0))}
            className={inputClass}
          />
          {quoteTotalFromLines > 0 && investmentHt !== quoteTotalFromLines && (
            <button
              type="button"
              onClick={() => setInvestmentHt(quoteTotalFromLines)}
              className="mt-1 text-xs text-sky-600 hover:underline"
            >
              Reprendre le total BPU ({formatCurrency(quoteTotalFromLines)} HT)
            </button>
          )}
          {quoteTotalFromLines === 0 && project.quoteAmountHt > 0 && investmentHt !== project.quoteAmountHt && (
            <button
              type="button"
              onClick={() => setInvestmentHt(project.quoteAmountHt)}
              className="mt-1 text-xs text-sky-600 hover:underline"
            >
              Reprendre le devis saisi ({formatCurrency(project.quoteAmountHt)} HT)
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-emerald-800">
            <TrendingDown size={14} />
            Économie d&apos;énergie annuelle
          </div>
          <p className="text-lg font-bold text-emerald-900">
            {results.annualEnergyKwh.toLocaleString('fr-FR')} kWh
          </p>
        </div>
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-sky-800">
            <Euro size={14} />
            Économie financière annuelle
          </div>
          <p className="text-lg font-bold text-sky-900">
            {formatCurrency(results.annualSavingsEur)}
          </p>
        </div>
        <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-violet-800">
            <Clock size={14} />
            Retour sur investissement
          </div>
          <p className="text-lg font-bold text-violet-900">
            {results.roiYears != null ? `${results.roiYears} an${results.roiYears > 1 ? 's' : ''}` : '—'}
          </p>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-slate-500">
        Hypothèse de fonctionnement : {DEFAULT_LIGHTING_HOURS_PER_YEAR.toLocaleString('fr-FR')} h/an.
        Économie = foyers × (W ancien − W LED) × {DEFAULT_LIGHTING_HOURS_PER_YEAR} h / 1000 × prix kWh.
        ROI = montant devis HT / économie annuelle.
      </p>

      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <Wallet size={16} className="text-slate-600" />
          <h4 className="text-sm font-bold text-slate-900">Plan de Financement Estimatif</h4>
        </div>
        <p className="mb-3 text-[11px] text-slate-500">
          Fiche BAR-EQ-111 — Prime CEE = foyers × {CEE_KWH_CUMAC_PER_FIXTURE.toLocaleString('fr-FR')} kWh cumac × {CEE_EUR_PER_KWH_CUMAC} €.
          Subvention syndicat = {Math.round(SYNDICAT_SUBSIDY_RATE * 100)} % du HT après déduction CEE.
        </p>
        <div className="overflow-hidden rounded-lg border border-slate-100">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-slate-50 bg-slate-50/50">
                <td className="px-4 py-2.5 font-medium text-slate-700">Montant global du projet (Devis HT)</td>
                <td className="px-4 py-2.5 text-right font-semibold text-slate-900">
                  {formatCurrency(financing.devisHt)}
                </td>
              </tr>
              <tr className="border-b border-slate-50">
                <td className="px-4 py-2.5 text-slate-600">
                  Prime CEE calculée
                  <span className="ml-1 text-xs text-slate-400">
                    ({financing.fixtureCount} foyers × {CEE_KWH_CUMAC_PER_FIXTURE.toLocaleString('fr-FR')} kWh cumac)
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right font-medium text-emerald-700">
                  − {formatCurrency(financing.ceePrime)}
                </td>
              </tr>
              <tr className="border-b border-slate-50">
                <td className="px-4 py-2.5 text-slate-600">
                  Subvention incitative du Syndicat
                  <span className="ml-1 text-xs text-slate-400">({Math.round(SYNDICAT_SUBSIDY_RATE * 100)} % HT net CEE)</span>
                </td>
                <td className="px-4 py-2.5 text-right font-medium text-sky-700">
                  − {formatCurrency(financing.syndicatSubsidy)}
                </td>
              </tr>
              <tr className="bg-slate-900">
                <td className="px-4 py-3 font-semibold text-white">Reste à charge final pour la Commune</td>
                <td className="px-4 py-3 text-right text-lg font-bold text-white">
                  {formatCurrency(financing.resteACharge)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
