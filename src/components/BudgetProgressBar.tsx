export function getBudgetConsumptionRate(budgetTotal: number, budgetConsumed: number): number {
  if (budgetTotal <= 0) return 0;
  return Math.round((budgetConsumed / budgetTotal) * 100);
}

function getBarColor(rate: number): string {
  if (rate > 90) return 'bg-red-500 animate-pulse';
  if (rate >= 70) return 'bg-orange-500';
  return 'bg-emerald-500';
}

interface BudgetProgressBarProps {
  budgetTotal: number;
  budgetConsumed: number;
  showLabel?: boolean;
  compact?: boolean;
}

export function BudgetProgressBar({
  budgetTotal,
  budgetConsumed,
  showLabel = true,
  compact = false,
}: BudgetProgressBarProps) {
  const rate = getBudgetConsumptionRate(budgetTotal, budgetConsumed);
  const barWidth = Math.min(rate, 100);
  const isOverBudget = rate > 100;

  return (
    <div className={compact ? 'space-y-1' : 'space-y-2'}>
      {showLabel && (
        <div className="flex items-center justify-between gap-2">
          <span className={`text-slate-500 ${compact ? 'text-[10px]' : 'text-xs'}`}>
            Consommation : {rate}%
          </span>
          {rate > 90 && (
            <span
              className={`font-semibold text-red-600 ${compact ? 'text-[10px]' : 'text-xs'} ${
                isOverBudget ? 'animate-pulse' : ''
              }`}
            >
              {isOverBudget ? 'Dépassement' : 'Alerte budget'}
            </span>
          )}
        </div>
      )}
      <div
        className={`w-full rounded-full bg-slate-100 overflow-hidden ${compact ? 'h-1.5' : 'h-3'}`}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${getBarColor(rate)}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
}
