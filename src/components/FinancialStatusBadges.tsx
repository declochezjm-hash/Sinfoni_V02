import type { BillingStatus, QuoteStatus } from '../types';
import { getBillingStatusColor, getQuoteStatusColor } from '../lib/utils';

const QUOTE_SHORT_LABELS: Record<QuoteStatus, string> = {
  Brouillon: 'Brouillon',
  'Envoyé au client': 'Envoyé',
  Accepté: 'Accepté',
  Refusé: 'Refusé',
};

const BILLING_SHORT_LABELS: Record<BillingStatus, string> = {
  'À émettre': 'À émettre',
  'Acompte émis': 'Acompte',
  'Facturé total': 'Facturé',
  Payé: 'Payé',
};

interface FinancialStatusBadgesProps {
  quoteStatus: QuoteStatus;
  billingStatus: BillingStatus;
}

export function FinancialStatusBadges({ quoteStatus, billingStatus }: FinancialStatusBadgesProps) {
  return (
    <div className="flex min-w-[88px] flex-col gap-1">
      <span
        title={`Devis : ${quoteStatus}`}
        className={`inline-flex w-fit items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${getQuoteStatusColor(
          quoteStatus,
        )}`}
      >
        <span className="mr-1 opacity-60">D</span>
        {QUOTE_SHORT_LABELS[quoteStatus]}
      </span>
      <span
        title={`Facturation : ${billingStatus}`}
        className={`inline-flex w-fit items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${getBillingStatusColor(
          billingStatus,
        )}`}
      >
        <span className="mr-1 opacity-60">F</span>
        {BILLING_SHORT_LABELS[billingStatus]}
      </span>
    </div>
  );
}
