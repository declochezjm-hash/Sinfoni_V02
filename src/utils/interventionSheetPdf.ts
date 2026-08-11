import jsPDF from 'jspdf';
import type { EnergyAsset, MaintenanceTicket } from '../types';
import {
  getTicketPriorityLabel,
  getTicketStatusLabel,
} from '../lib/maintenanceTicketLabels';
import { getCommuneLabel } from '../lib/departmentCommunes';

const COMPANY_NAME = 'SINFONI';
const COMPANY_TAGLINE = 'Syndicat d\'énergie — Gestion des interventions';

export interface InterventionSheetInput {
  ticket: MaintenanceTicket;
  asset?: EnergyAsset | null;
  providerName?: string;
  /** Date d'intervention affichée (défaut : aujourd'hui). */
  interventionDate?: string;
  /** Matériel à remplacer (sinon déduit du type d'actif / description). */
  materials?: string[];
  /** Habilitations électriques requises. */
  habilitations?: string[];
  /** Zone de consignes pré-remplie (sinon description ticket). */
  fieldNotes?: string;
}

function formatDateFr(isoOrEmpty?: string): string {
  const d = isoOrEmpty ? new Date(isoOrEmpty) : new Date();
  if (Number.isNaN(d.getTime())) {
    return new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function sanitizeFilename(value: string): string {
  return value.replace(/[^\w\-./]/g, '_');
}

/** Référence lisible type #TICK-2026-089. */
export function buildTicketReference(ticket: MaintenanceTicket): string {
  const year = new Date(ticket.createdAt).getFullYear() || new Date().getFullYear();
  const short = ticket.id.replace(/-/g, '').slice(-3).toUpperCase();
  const seq = Number.parseInt(short, 16);
  const num = Number.isFinite(seq) ? String((seq % 900) + 100).padStart(3, '0') : '001';
  return `TICK-${year}-${num}`;
}

function priorityRgb(priority: MaintenanceTicket['priority']): [number, number, number] {
  switch (priority) {
    case 'critical':
      return [220, 38, 38];
    case 'high':
      return [234, 88, 12];
    case 'medium':
      return [202, 138, 4];
    default:
      return [100, 116, 139];
  }
}

function statusRgb(status: MaintenanceTicket['status']): [number, number, number] {
  switch (status) {
    case 'open':
      return [37, 99, 235];
    case 'in_progress':
      return [124, 58, 237];
    case 'resolved':
      return [22, 163, 74];
    default:
      return [71, 85, 105];
  }
}

export function defaultHabilitationsForAsset(asset?: EnergyAsset | null): string[] {
  if (!asset) return ['B1V', 'B2V', 'BR'];
  if (asset.type === 'irve') return ['B1V', 'B2V', 'BR', 'H0B0'];
  return ['B1V', 'B2V', 'BR', 'H1V'];
}

export function defaultMaterialsForAsset(
  ticket: MaintenanceTicket,
  asset?: EnergyAsset | null,
): string[] {
  const fromDesc: string[] = [];
  const desc = ticket.description.toLowerCase();
  if (/transformateur|bt\b/.test(desc)) fromDesc.push('Transformateur BT / pièces associées');
  if (/fusible|fuse/.test(desc)) fromDesc.push('Jeu de fusibles adaptés');
  if (/led|foyer|luminaire/.test(desc)) fromDesc.push('Module LED / driver');
  if (/borne|ocpp|irve/.test(desc)) fromDesc.push('Carte mère / module communication OCPP');
  if (/c[aâ]ble/.test(desc)) fromDesc.push('Câble électrique + connectique');
  if (/disjoncteur|diff[eé]rentiel/.test(desc)) fromDesc.push('Disjoncteur différentiel');

  if (fromDesc.length > 0) return fromDesc;

  if (asset?.type === 'irve') {
    return [
      'Module de puissance borne IRVE',
      'Connecteur Type 2 / CCS (selon modèle)',
      'Kit visserie inox',
    ];
  }
  return [
    'Module LED / ballast de remplacement',
    'Fusibles armoire EP',
    'Outillage isolé 1000 V',
  ];
}

/** Miniature cartographique locale (sans dépendance API / CORS). */
function createMapPreviewDataUrl(lat: number, lng: number): string {
  const width = 560;
  const height = 240;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const grd = ctx.createLinearGradient(0, 0, width, height);
  grd.addColorStop(0, '#e2e8f0');
  grd.addColorStop(0.5, '#f1f5f9');
  grd.addColorStop(1, '#cbd5e1');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Routes schématiques
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(40, height * 0.65);
  ctx.quadraticCurveTo(width * 0.45, height * 0.2, width - 40, height * 0.55);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(width * 0.15, height - 20);
  ctx.lineTo(width * 0.7, 30);
  ctx.stroke();

  const cx = width / 2;
  const cy = height / 2;
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(cx, cy - 8, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx, cy + 18);
  ctx.lineTo(cx - 9, cy - 2);
  ctx.lineTo(cx + 9, cy - 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy - 8, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fillRect(0, height - 36, width, 36);
  ctx.fillStyle = '#f8fafc';
  ctx.font = '600 13px Helvetica, Arial, sans-serif';
  ctx.fillText(
    `GPS ${lat.toFixed(5)}° N  ·  ${lng.toFixed(5)}° E`,
    12,
    height - 14,
  );
  ctx.font = '11px Helvetica, Arial, sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('Extrait cartographique indicatif — OpenStreetMap', width - 280, height - 14);

  return canvas.toDataURL('image/png');
}

function drawSectionTitle(doc: jsPDF, title: string, y: number, margin: number): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(title, margin, y);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(margin, y + 2, doc.internal.pageSize.getWidth() - margin, y + 2);
  return y + 8;
}

function drawBadge(
  doc: jsPDF,
  label: string,
  x: number,
  y: number,
  rgb: [number, number, number],
): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const padX = 3;
  const w = doc.getTextWidth(label) + padX * 2;
  const h = 6;
  doc.setFillColor(...rgb);
  doc.roundedRect(x, y - 4.5, w, h, 1.2, 1.2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(label, x + padX, y);
  return w;
}

/**
 * Génère et télécharge la Fiche d'Intervention PDF pour un ticket de maintenance.
 */
export async function generateInterventionSheetPdf(
  input: InterventionSheetInput,
): Promise<void> {
  const {
    ticket,
    asset,
    providerName,
    interventionDate,
    materials = defaultMaterialsForAsset(ticket, asset),
    habilitations = defaultHabilitationsForAsset(asset),
    fieldNotes,
  } = input;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  const ticketRef = buildTicketReference(ticket);
  const commune = getCommuneLabel(ticket.communeInseeCode);
  const lat = asset?.latitude;
  const lng = asset?.longitude;
  const hasGps =
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng);

  // —— En-tête ——
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 36, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(COMPANY_NAME, margin, 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(COMPANY_TAGLINE, margin, 22);

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('FICHE D\'INTERVENTION', pageWidth - margin, 14, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`#${ticketRef}`, pageWidth - margin, 22, { align: 'right' });
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`Émise le ${formatDateFr()}`, pageWidth - margin, 29, { align: 'right' });

  let y = 44;

  // Titre + badges
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  const titleLines = doc.splitTextToSize(ticket.title, contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 6 + 4;

  let badgeX = margin;
  badgeX +=
    drawBadge(doc, getTicketPriorityLabel(ticket.priority), badgeX, y, priorityRgb(ticket.priority)) +
    3;
  badgeX +=
    drawBadge(doc, getTicketStatusLabel(ticket.status), badgeX, y, statusRgb(ticket.status)) + 3;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Date d'intervention : ${formatDateFr(interventionDate ?? ticket.updatedAt)}`,
    badgeX + 2,
    y,
  );
  y += 10;

  // —— Localisation ——
  y = drawSectionTitle(doc, '1. Localisation', y, margin);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);

  const addressLines = [
    `Adresse / secteur : ${asset?.name ?? 'Équipement non renseigné'}`,
    `Commune : ${commune}`,
    hasGps
      ? `Coordonnées GPS : ${lat!.toFixed(6)}, ${lng!.toFixed(6)}`
      : 'Coordonnées GPS : non disponibles',
  ];
  for (const line of addressLines) {
    doc.text(line, margin, y);
    y += 5;
  }
  y += 2;

  if (hasGps) {
    const mapDataUrl = createMapPreviewDataUrl(lat!, lng!);
    if (mapDataUrl) {
      const mapW = contentWidth;
      const mapH = 42;
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.rect(margin, y, mapW, mapH);
      try {
        doc.addImage(mapDataUrl, 'PNG', margin, y, mapW, mapH);
      } catch {
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('Aperçu cartographique indisponible', margin + 4, y + mapH / 2);
      }
      y += mapH + 6;
    }
  } else {
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'Aucun point GPS sur l\'actif — renseigner la position sur la carte Sinfoni.',
      margin + 4,
      y + 9,
    );
    y += 20;
  }

  // —— Informations techniques ——
  y = drawSectionTitle(doc, '2. Informations techniques', y, margin);

  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const techRows: [string, string][] = [
    ['Désignation équipement', asset?.name ?? '—'],
    [
      'Type / état',
      asset
        ? `${asset.type === 'irve' ? 'IRVE' : 'Éclairage public'} — ${asset.status}`
        : '—',
    ],
    [
      'Responsable assigné',
      ticket.assignedContact
        ? `${ticket.assignedContact.firstName} ${ticket.assignedContact.lastName} (${ticket.assignedContact.role})`
        : 'Non assigné',
    ],
    ['Prestataire', providerName?.trim() || 'Non assigné'],
    ['Matériel à remplacer', materials.join(' · ') || 'À préciser sur site'],
    ['Habilitations requises', habilitations.join(', ')],
  ];

  for (const [label, value] of techRows) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(`${label} :`, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const valueLines = doc.splitTextToSize(value, contentWidth - 52);
    doc.text(valueLines, margin + 52, y);
    y += Math.max(5, valueLines.length * 4.5) + 1.5;
  }
  y += 3;

  // —— Consignes terrain ——
  y = drawSectionTitle(doc, '3. Consignes terrain & sécurité', y, margin);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Consignes : consignation électrique, EPI, balisage zone de travaux, vérification d\'absence de tension (VAT).',
    margin,
    y,
  );
  y += 6;

  const notes =
    fieldNotes?.trim() ||
    ticket.description.trim() ||
    'Remarques technicien : _______________________________________________';

  const notesBoxH = 32;
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, notesBoxH, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Zone de remarques technicien', margin + 3, y + 5);
  doc.setTextColor(30, 41, 59);
  const noteLines = doc.splitTextToSize(notes, contentWidth - 8);
  doc.text(noteLines.slice(0, 5), margin + 3, y + 11);
  y += notesBoxH + 8;

  // —— Signatures ——
  if (y > pageHeight - 55) {
    doc.addPage();
    y = margin;
  }

  y = drawSectionTitle(doc, '4. Signatures', y, margin);

  const boxW = (contentWidth - 8) / 2;
  const boxH = 36;
  const boxes = [
    { title: 'Client / Collectivité', subtitle: 'Nom, date et signature' },
    { title: 'Prestataire / Technicien', subtitle: 'Nom, date et signature' },
  ];

  boxes.forEach((box, i) => {
    const x = margin + i * (boxW + 8);
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, boxW, boxH, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(box.title, x + 4, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(box.subtitle, x + 4, y + 13);
    doc.setDrawColor(148, 163, 184);
    doc.line(x + 4, y + boxH - 8, x + boxW - 4, y + boxH - 8);
  });

  // Pied de page
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, pageHeight - 16, pageWidth - margin, pageHeight - 16);
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `${COMPANY_NAME} — Fiche d'intervention #${ticketRef} — Document opérationnel terrain`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' },
  );

  doc.save(`Fiche_Intervention_${sanitizeFilename(ticketRef)}.pdf`);
}
