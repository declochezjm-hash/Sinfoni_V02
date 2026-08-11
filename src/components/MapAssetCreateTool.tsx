import { PlusCircle } from 'lucide-react';
import type { EnergyAssetType } from '../types';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface MapAssetCreateToolProps {
  disabled?: boolean;
  onStartCreate: (type: EnergyAssetType) => void;
  className?: string;
}

export default function MapAssetCreateTool({
  disabled = false,
  onStartCreate,
  className = '',
}: MapAssetCreateToolProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className={`gap-2 border-slate-200 bg-white hover:bg-white ${className}`}
        >
          <PlusCircle size={16} />
          Ajouter un actif
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Numérisation SIG</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onStartCreate('eclairage')}>
          💡 Éclairage public
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onStartCreate('irve')}>
          🔌 Borne IRVE
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
