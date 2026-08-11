import { useState } from 'react';
import { AlertTriangle, Send } from 'lucide-react';
import { useCreateMaintenanceTicket } from '../hooks/useTickets';
import { useRole } from '../hooks/useRole';
import { useToast } from '../hooks/useToast';
import { formatApiError } from '../lib/formatApiError';
import { getEnergyAssetTypeLabel } from '../lib/energyAssetMarkers';
import type { EnergyAsset, MaintenanceTicketPriority } from '../types';
import EclairageAssetSummaryCard from './EclairageAssetSummaryCard';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Textarea } from './ui/textarea';

const PRIORITY_OPTIONS: { value: MaintenanceTicketPriority; label: string }[] = [
  { value: 'low', label: 'Faible' },
  { value: 'medium', label: 'Moyenne' },
  { value: 'high', label: 'Haute' },
  { value: 'critical', label: 'Critique' },
];

interface MaintenanceTicketDialogProps {
  asset: EnergyAsset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MaintenanceTicketDialog({
  asset,
  open,
  onOpenChange,
}: MaintenanceTicketDialogProps) {
  const { user } = useRole();
  const { toast } = useToast();
  const createTicket = useCreateMaintenanceTicket();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<MaintenanceTicketPriority>('medium');

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asset || !title.trim() || !description.trim()) return;

    try {
      await createTicket.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        priority,
        assetId: asset.id,
        communeInseeCode: asset.communeInseeCode,
        createdBy: user.id,
        asset,
      });
      toast.success('Anomalie signalée avec succès', {
        description: `Le ticket pour « ${asset.name} » a été enregistré.`,
      });
      handleOpenChange(false);
    } catch (err) {
      toast.error('Échec du signalement', { description: formatApiError(err) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-600" />
            Signaler une anomalie
          </DialogTitle>
          {asset && (
            <DialogDescription>
              {asset.name} — {getEnergyAssetTypeLabel(asset.type)} (INSEE {asset.communeInseeCode})
            </DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {asset?.type === 'eclairage' && <EclairageAssetSummaryCard asset={asset} />}

          <div className="space-y-1.5">
            <Label htmlFor="ticket-title">Titre</Label>
            <Input
              id="ticket-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex. Borne hors service, lampadaire éteint…"
              required
              maxLength={200}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ticket-description">Description</Label>
            <Textarea
              id="ticket-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Décrivez l'anomalie constatée, le contexte et l'urgence…"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ticket-priority">Niveau de priorité</Label>
            <Select
              value={priority}
              onValueChange={(value) => setPriority(value as MaintenanceTicketPriority)}
            >
              <SelectTrigger id="ticket-priority">
                <SelectValue placeholder="Choisir une priorité" />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createTicket.isPending}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={createTicket.isPending || !title.trim() || !description.trim()}
            >
              {createTicket.isPending ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <Send size={14} />
              )}
              {createTicket.isPending ? 'Envoi…' : 'Signaler l\'anomalie'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
