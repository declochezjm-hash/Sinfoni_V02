/** Durée annuelle de fonctionnement typique de l'éclairage public (heures). */
export const DEFAULT_LIGHTING_HOURS_PER_YEAR = 4000;

/** Fiche BAR-EQ-111 : kWh cumac par foyer rénové. */
export const CEE_KWH_CUMAC_PER_FIXTURE = 3000;

/** Valeur du kWh cumac (€). */
export const CEE_EUR_PER_KWH_CUMAC = 0.007;

/** Taux de subvention incitative du Syndicat (30 % du HT après déduction CEE). */
export const SYNDICAT_SUBSIDY_RATE = 0.3;

export interface LedRoiInputs {
  fixtureCount: number;
  oldPowerW: number;
  newPowerW: number;
  kwhCostEur: number;
  investmentHt: number;
}

export interface LedRoiResults {
  annualEnergyKwh: number;
  annualSavingsEur: number;
  roiYears: number | null;
  hoursPerYear: number;
}

export function computeLedRoi(inputs: LedRoiInputs): LedRoiResults {
  const {
    fixtureCount,
    oldPowerW,
    newPowerW,
    kwhCostEur,
    investmentHt,
  } = inputs;

  const count = Math.max(0, fixtureCount);
  const savedWattsPerFixture = Math.max(0, oldPowerW - newPowerW);
  const annualEnergyKwh =
    Math.round((count * savedWattsPerFixture * DEFAULT_LIGHTING_HOURS_PER_YEAR) / 1000 * 10) / 10;
  const annualSavingsEur = Math.round(annualEnergyKwh * kwhCostEur * 100) / 100;
  const roiYears =
    annualSavingsEur > 0 && investmentHt > 0
      ? Math.round((investmentHt / annualSavingsEur) * 10) / 10
      : null;

  return {
    annualEnergyKwh,
    annualSavingsEur,
    roiYears,
    hoursPerYear: DEFAULT_LIGHTING_HOURS_PER_YEAR,
  };
}

export function isEclairagePublicProject(project: {
  type: string;
  title: string;
}): boolean {
  if (project.type === 'Éclairage Public') return true;
  return /éclairage\s*public/i.test(project.title);
}

/** Prime CEE (BAR-EQ-111) : foyers × kWh cumac/foyer × valeur du kWh cumac. */
export function computeCeePrime(fixtureCount: number): number {
  const count = Math.max(0, fixtureCount);
  return (
    Math.round(count * CEE_KWH_CUMAC_PER_FIXTURE * CEE_EUR_PER_KWH_CUMAC * 100) / 100
  );
}

export interface FinancingPlanInputs {
  devisHt: number;
  fixtureCount: number;
}

export interface FinancingPlanResults {
  devisHt: number;
  ceePrime: number;
  amountAfterCee: number;
  syndicatSubsidy: number;
  resteACharge: number;
  fixtureCount: number;
  kwhCumacTotal: number;
}

export function computeFinancingPlan(inputs: FinancingPlanInputs): FinancingPlanResults {
  const devisHt = Math.max(0, inputs.devisHt);
  const fixtureCount = Math.max(0, inputs.fixtureCount);
  const ceePrime = computeCeePrime(fixtureCount);
  const amountAfterCee = Math.max(0, devisHt - ceePrime);
  const syndicatSubsidy =
    Math.round(amountAfterCee * SYNDICAT_SUBSIDY_RATE * 100) / 100;
  const resteACharge =
    Math.round((devisHt - ceePrime - syndicatSubsidy) * 100) / 100;
  const kwhCumacTotal = fixtureCount * CEE_KWH_CUMAC_PER_FIXTURE;

  return {
    devisHt,
    ceePrime,
    amountAfterCee,
    syndicatSubsidy,
    resteACharge,
    fixtureCount,
    kwhCumacTotal,
  };
}
