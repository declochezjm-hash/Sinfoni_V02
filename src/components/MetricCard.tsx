import { TrendingUp, TrendingDown } from 'lucide-react';
import type { ReactNode } from 'react';

interface MetricCardProps {
  label: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon: ReactNode;
}

export default function MetricCard({ label, value, change, changeLabel, icon }: MetricCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {label}
          </span>
          <span className="mt-2 text-2xl font-bold text-slate-900">{value}</span>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-600">
          {icon}
        </div>
      </div>
      {change !== undefined && (
        <div className="mt-3 flex items-center gap-1.5">
          {isPositive ? (
            <TrendingUp size={14} className="text-emerald-600" />
          ) : (
            <TrendingDown size={14} className="text-red-500" />
          )}
          <span className={`text-xs font-medium ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
            {isPositive ? '+' : ''}{change}%
          </span>
          {changeLabel && (
            <span className="text-xs text-slate-400">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
