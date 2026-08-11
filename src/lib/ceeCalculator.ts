/**
 * Calculateur CEE — fiches DGEC (RES-EC-104 Éclairage Public).
 *
 * E_cumac (kWh cumac) = P_gain (kW) × 3600 h × F_cumac × Nb_luminaires
 * Valorisation (€)    = (E_cumac / 1000) × Prix_MWh_cumac   [€ / MWhc]
 */

/** Heures de fonctionnement annuelles — fiche RES-EC-104. */
export const RES_EC_104_HOURS_PER_YEAR = 3600;

/** Facteur de cumac (durée de vie conventionnelle, années) — RES-EC-104. */
export const RES_EC_104_F_CUMAC = 30;

/** Prix de référence du MWh cumac (€ / MWhc). */
export const DEFAULT_PRICE_EUR_PER_MWH_CUMAC = 8.0;

/** Facteur d'émission résiduel France (kg CO₂e / kWh) — ADEME / RTE. */
export const CO2_KG_PER_KWH = 0.052;

export type CeeFicheCode = 'RES-EC-104';

export interface CeeFicheParams {
  code: CeeFicheCode;
  label: string;
  hoursPerYear: number;
  fCumac: number;
  priceEurPerMwhCumac: number;
}

export const CEE_FICHES: Record<CeeFicheCode, CeeFicheParams> = {
  'RES-EC-104': {
    code: 'RES-EC-104',
    label: 'Éclairage public extérieur (LED)',
    hoursPerYear: RES_EC_104_HOURS_PER_YEAR,
    fCumac: RES_EC_104_F_CUMAC,
    priceEurPerMwhCumac: DEFAULT_PRICE_EUR_PER_MWH_CUMAC,
  },
};

export interface CeeEquipmentLine {
  id: string;
  label: string;
  oldTechnology: string;
  newTechnology: string;
  oldPowerW: number;
  newPowerW: number;
  quantity: number;
}

export interface CeeEquipmentLineResult extends CeeEquipmentLine {
  /** Gain unitaire (kW). */
  powerGainKw: number;
  /** kWh cumac pour la ligne. */
  eCumacKwh: number;
  /** MWh cumac pour la ligne. */
  eCumacMwh: number;
  /** Prime CEE estimée (€). */
  valorisationEur: number;
  /** CO₂ évité (tonnes). */
  co2Tonnes: number;
}

export interface CeeCalculationTotals {
  eCumacKwh: number;
  eCumacMwh: number;
  valorisationEur: number;
  co2Tonnes: number;
  totalLuminaires: number;
  fiche: CeeFicheParams;
}

export interface CeeCalculationResult {
  lines: CeeEquipmentLineResult[];
  totals: CeeCalculationTotals;
}

/** P_gain en kW = max(0, P_ancienne − P_nouvelle) / 1000. */
export function powerGainKw(oldPowerW: number, newPowerW: number): number {
  return Math.max(0, oldPowerW - newPowerW) / 1000;
}

/**
 * E_cumac (kWh cumac) = P_gain (kW) × heures × F_cumac × Nb_luminaires
 */
export function computeECumacKwh(
  pGainKw: number,
  quantity: number,
  hoursPerYear: number = RES_EC_104_HOURS_PER_YEAR,
  fCumac: number = RES_EC_104_F_CUMAC,
): number {
  const n = Math.max(0, quantity);
  const p = Math.max(0, pGainKw);
  return p * hoursPerYear * fCumac * n;
}

/**
 * Valorisation (€) = E_cumac_MWh × Prix_MWh_cumac
 * (E_cumac en kWh → conversion / 1000 pour appliquer un prix en €/MWhc)
 */
export function computeValorisationEur(
  eCumacKwh: number,
  priceEurPerMwhCumac: number = DEFAULT_PRICE_EUR_PER_MWH_CUMAC,
): number {
  const eCumacMwh = Math.max(0, eCumacKwh) / 1000;
  return Math.round(eCumacMwh * priceEurPerMwhCumac * 100) / 100;
}

export function computeCo2Tonnes(
  eCumacKwh: number,
  kgPerKwh: number = CO2_KG_PER_KWH,
): number {
  return Math.round(((Math.max(0, eCumacKwh) * kgPerKwh) / 1000) * 1000) / 1000;
}

export function computeCeeForEquipment(
  lines: CeeEquipmentLine[],
  ficheCode: CeeFicheCode = 'RES-EC-104',
  priceOverride?: number,
): CeeCalculationResult {
  const fiche = CEE_FICHES[ficheCode];
  const price = priceOverride ?? fiche.priceEurPerMwhCumac;

  const computed: CeeEquipmentLineResult[] = lines.map((line) => {
    const pGain = powerGainKw(line.oldPowerW, line.newPowerW);
    const eCumacKwh = computeECumacKwh(
      pGain,
      line.quantity,
      fiche.hoursPerYear,
      fiche.fCumac,
    );
    const eCumacMwh = eCumacKwh / 1000;
    const valorisationEur = computeValorisationEur(eCumacKwh, price);
    const co2Tonnes = computeCo2Tonnes(eCumacKwh);

    return {
      ...line,
      powerGainKw: Math.round(pGain * 10000) / 10000,
      eCumacKwh: Math.round(eCumacKwh * 10) / 10,
      eCumacMwh: Math.round(eCumacMwh * 1000) / 1000,
      valorisationEur,
      co2Tonnes,
    };
  });

  const totals: CeeCalculationTotals = {
    eCumacKwh: Math.round(computed.reduce((s, l) => s + l.eCumacKwh, 0) * 10) / 10,
    eCumacMwh:
      Math.round(computed.reduce((s, l) => s + l.eCumacMwh, 0) * 1000) / 1000,
    valorisationEur:
      Math.round(computed.reduce((s, l) => s + l.valorisationEur, 0) * 100) / 100,
    co2Tonnes:
      Math.round(computed.reduce((s, l) => s + l.co2Tonnes, 0) * 1000) / 1000,
    totalLuminaires: computed.reduce((s, l) => s + Math.max(0, l.quantity), 0),
    fiche: { ...fiche, priceEurPerMwhCumac: price },
  };

  return { lines: computed, totals };
}

/** Jeu d’équipements démo réaliste (rénovation EP). */
export function defaultCeeEquipmentLines(): CeeEquipmentLine[] {
  return [
    {
      id: 'eq-1',
      label: 'Avenue Jean Jaurès — candélabres',
      oldTechnology: 'SHP 250W',
      newTechnology: 'LED 70W',
      oldPowerW: 250,
      newPowerW: 70,
      quantity: 48,
    },
    {
      id: 'eq-2',
      label: 'Boulevard Clemenceau — consoles',
      oldTechnology: 'SHP 150W',
      newTechnology: 'LED 40W',
      oldPowerW: 150,
      newPowerW: 40,
      quantity: 32,
    },
    {
      id: 'eq-3',
      label: 'Rue du Refuge — lanternes',
      oldTechnology: 'MV 125W',
      newTechnology: 'LED 30W',
      oldPowerW: 125,
      newPowerW: 30,
      quantity: 18,
    },
  ];
}

export function formatKwhCumac(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: value >= 1000 ? 0 : 1,
  }).format(value);
}

export function formatMwhCumac(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCo2Tonnes(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 2,
  }).format(value);
}
