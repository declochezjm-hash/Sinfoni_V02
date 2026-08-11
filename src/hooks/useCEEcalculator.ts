import { useCallback, useMemo, useState } from 'react';
import {
  computeCeeForEquipment,
  defaultCeeEquipmentLines,
  DEFAULT_PRICE_EUR_PER_MWH_CUMAC,
  type CeeEquipmentLine,
  type CeeFicheCode,
  type CeeCalculationResult,
} from '../lib/ceeCalculator';

export type {
  CeeEquipmentLine,
  CeeEquipmentLineResult,
  CeeCalculationResult,
  CeeCalculationTotals,
  CeeFicheCode,
} from '../lib/ceeCalculator';

export {
  computeECumacKwh,
  computeValorisationEur,
  computeCo2Tonnes,
  computeCeeForEquipment,
  powerGainKw,
  RES_EC_104_HOURS_PER_YEAR,
  RES_EC_104_F_CUMAC,
  DEFAULT_PRICE_EUR_PER_MWH_CUMAC,
  CEE_FICHES,
} from '../lib/ceeCalculator';

export interface UseCeeCalculatorOptions {
  /** Fiche DGEC (défaut RES-EC-104). */
  ficheCode?: CeeFicheCode;
  /** Lignes initiales (sinon jeu démo rénovation EP). */
  initialLines?: CeeEquipmentLine[];
  /** Prix MWh cumac (€/MWhc), défaut 8.00. */
  initialPriceEurPerMwhCumac?: number;
}

/**
 * Hook métier CEE : gère le parc d’équipements et recalcule
 * E_cumac, prime estimée et CO₂ évité (fiche RES-EC-104).
 */
export function useCEEcalculator(options: UseCeeCalculatorOptions = {}) {
  const {
    ficheCode = 'RES-EC-104',
    initialLines,
    initialPriceEurPerMwhCumac = DEFAULT_PRICE_EUR_PER_MWH_CUMAC,
  } = options;

  const [equipment, setEquipment] = useState<CeeEquipmentLine[]>(
    () => initialLines ?? defaultCeeEquipmentLines(),
  );
  const [priceEurPerMwhCumac, setPriceEurPerMwhCumac] = useState(
    initialPriceEurPerMwhCumac,
  );

  const result: CeeCalculationResult = useMemo(
    () => computeCeeForEquipment(equipment, ficheCode, priceEurPerMwhCumac),
    [equipment, ficheCode, priceEurPerMwhCumac],
  );

  const updateLine = useCallback(
    (id: string, patch: Partial<Omit<CeeEquipmentLine, 'id'>>) => {
      setEquipment((prev) =>
        prev.map((line) => (line.id === id ? { ...line, ...patch } : line)),
      );
    },
    [],
  );

  const addLine = useCallback(() => {
    setEquipment((prev) => [
      ...prev,
      {
        id: `eq-${Date.now().toString(36)}`,
        label: 'Nouvel équipement',
        oldTechnology: 'SHP 250W',
        newTechnology: 'LED 70W',
        oldPowerW: 250,
        newPowerW: 70,
        quantity: 1,
      },
    ]);
  }, []);

  const removeLine = useCallback((id: string) => {
    setEquipment((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.id !== id)));
  }, []);

  const resetToDefaults = useCallback(() => {
    setEquipment(defaultCeeEquipmentLines());
    setPriceEurPerMwhCumac(DEFAULT_PRICE_EUR_PER_MWH_CUMAC);
  }, []);

  return {
    equipment,
    setEquipment,
    updateLine,
    addLine,
    removeLine,
    resetToDefaults,
    priceEurPerMwhCumac,
    setPriceEurPerMwhCumac,
    ficheCode,
    lines: result.lines,
    totals: result.totals,
    result,
  };
}
