import { AlertTriangle } from 'lucide-react';
import {
  formatContactWorkloadLabel,
  formatContactWorkloadTooltip,
  getContactWorkloadBadgeClass,
  getContactWorkloadDotClass,
  getContactWorkloadLevel,
} from '../../lib/contactWorkload';
import { cn } from '../../lib/cn';
import { Badge } from '../ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';

interface ContactWorkloadBadgeProps {
  activeTicketsCount: number;
  compact?: boolean;
  className?: string;
  onClick?: (event: React.MouseEvent) => void;
}

export default function ContactWorkloadBadge({
  activeTicketsCount,
  compact = false,
  className,
  onClick,
}: ContactWorkloadBadgeProps) {
  const level = getContactWorkloadLevel(activeTicketsCount);
  const tooltip = formatContactWorkloadTooltip(activeTicketsCount);

  const content = compact ? (
    <span
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-full border px-1 text-[10px] font-bold leading-none',
        getContactWorkloadDotClass(activeTicketsCount),
        level === 'high' && 'gap-0.5 pl-1',
        className,
      )}
      aria-label={tooltip}
    >
      {level === 'high' && <AlertTriangle size={10} className="shrink-0" />}
      {activeTicketsCount}
    </span>
  ) : (
    <Badge
      variant="outline"
      className={cn(
        'text-[10px] font-medium',
        getContactWorkloadBadgeClass(activeTicketsCount),
        level === 'high' && 'gap-1',
        className,
      )}
    >
      {level === 'high' && <AlertTriangle size={11} className="shrink-0" />}
      {formatContactWorkloadLabel(activeTicketsCount)}
    </Badge>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex" tabIndex={0} onClick={onClick}>{content}</span>
        </TooltipTrigger>
        <TooltipContent side="top">{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
