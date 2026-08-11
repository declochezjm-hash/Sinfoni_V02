import { Link } from 'react-router-dom';
import { Marker } from 'react-leaflet';
import { MapPopup } from './MapPopup';
import { getMaintenanceIncidentMarkerIcon } from '../lib/mapMarkers';
import {
  getTicketPriorityLabel,
  getTicketStatusLabel,
} from '../lib/maintenanceTicketLabels';
import { getContactFullName } from '../types/contacts';
import type { EnergyAsset, MaintenanceTicket } from '../types';

interface MaintenanceTicketsMapLayerProps {
  tickets: MaintenanceTicket[];
  assetsById: Map<string, EnergyAsset>;
  maintenancePath?: string;
}

export function MaintenanceTicketsMapLayer({
  tickets,
  assetsById,
  maintenancePath = '/maintenance',
}: MaintenanceTicketsMapLayerProps) {
  const activeTickets = tickets.filter(
    (t) => t.status === 'open' || t.status === 'in_progress',
  );

  return (
    <>
      {activeTickets.map((ticket) => {
        const asset = assetsById.get(ticket.assetId);
        if (!asset) return null;

        return (
          <Marker
            key={`ticket-${ticket.id}`}
            position={[asset.latitude, asset.longitude]}
            icon={getMaintenanceIncidentMarkerIcon()}
            zIndexOffset={500}
          >
            <MapPopup>
              <div className="min-w-[180px] p-1">
                <p className="text-sm font-bold">{ticket.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {getTicketStatusLabel(ticket.status)} — {getTicketPriorityLabel(ticket.priority)}
                </p>
                <p className="mt-1 text-xs text-slate-600">{asset.name}</p>
                {ticket.assignedContact && (
                  <p className="mt-1 text-xs text-slate-600">
                    Responsable : {getContactFullName(ticket.assignedContact)}
                    {ticket.assignedContact.role ? ` (${ticket.assignedContact.role})` : ''}
                  </p>
                )}
                <Link
                  className="mt-2 block text-xs text-sky-600 hover:underline"
                  to={maintenancePath}
                >
                  Voir dans Maintenance →
                </Link>
              </div>
            </MapPopup>
          </Marker>
        );
      })}
    </>
  );
}
