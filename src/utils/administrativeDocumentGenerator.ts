import jsPDF from 'jspdf';
import type { Project } from '../types';
import type { DocumentCategory } from '../hooks/useDocuments';

export type AdministrativeTemplateId =
  | 'courrier'
  | 'pv_reception'
  | 'os'
  | 'attestation';

export interface AdministrativeTemplate {
  id: AdministrativeTemplateId;
  label: string;
  format: 'DOCX' | 'PDF';
  category: DocumentCategory;
}

export const ADMINISTRATIVE_TEMPLATES: AdministrativeTemplate[] = [
  {
    id: 'courrier',
    label: "Courrier d'approbation",
    format: 'DOCX',
    category: 'Administratif',
  },
  {
    id: 'pv_reception',
    label: 'Procès-Verbal de Réception (PV)',
    format: 'PDF',
    category: 'Administratif',
  },
  {
    id: 'os',
    label: 'Ordre de Service',
    format: 'DOCX',
    category: 'Administratif',
  },
  {
    id: 'attestation',
    label: 'Attestation de conformité',
    format: 'PDF',
    category: 'Technique',
  },
];

const COMPANY = 'SINFONI — GSI Concept';

function formatDateFr(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function sanitizeFilename(value: string): string {
  return value.replace(/[^\w\-./]/g, '_');
}

function templateTitle(id: AdministrativeTemplateId): string {
  switch (id) {
    case 'courrier':
      return "COURRIER D'APPROBATION";
    case 'pv_reception':
      return 'PROCÈS-VERBAL DE RÉCEPTION';
    case 'os':
      return 'ORDRE DE SERVICE';
    case 'attestation':
      return 'ATTESTATION DE CONFORMITÉ';
  }
}

function buildBodyLines(id: AdministrativeTemplateId, project: Project): string[] {
  const common = [
    `Référence affaire : ${project.reference}`,
    `Intitulé : ${project.title}`,
    `Type : ${project.type}`,
    `Statut : ${project.status}`,
    `Localisation : ${project.location || '—'}`,
    `Responsable : ${project.ownerName || '—'}`,
    `Prestataire : ${project.contractorName || '—'}`,
    `Planning : ${formatDateFr(project.startDate)} → ${formatDateFr(project.expectedEndDate)}`,
  ];

  switch (id) {
    case 'courrier':
      return [
        ...common,
        '',
        'Objet : Approbation du dossier et autorisation de poursuite des travaux.',
        '',
        'Madame, Monsieur,',
        '',
        `Nous avons le plaisir de vous confirmer l'approbation de l'affaire ${project.reference}.`,
        'Les métadonnées du projet ont été injectées automatiquement afin de limiter les erreurs de ressaisie.',
        '',
        'Veuillez agréer nos salutations distinguées.',
      ];
    case 'pv_reception':
      return [
        ...common,
        '',
        'Le présent procès-verbal atteste la réception des ouvrages / prestations.',
        `Date de réception : ${formatDateFr(project.actualEndDate || new Date().toISOString())}`,
        '',
        'Observations : néant / à compléter sur le terrain.',
        'Visa maître d’ouvrage : ____________________',
        'Visa prestataire : ____________________',
      ];
    case 'os':
      return [
        ...common,
        '',
        'Ordre de service : démarrage / poursuite des travaux selon le planning ci-dessus.',
        `Budget HT devis : ${project.quoteAmountHt.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`,
        '',
        'Le prestataire est tenu de respecter les prescriptions techniques et de sécurité en vigueur.',
      ];
    case 'attestation':
      return [
        ...common,
        '',
        'Nous attestons que les prestations réalisées au titre de cette affaire sont conformes',
        'aux prescriptions techniques applicables et aux règles de l’art.',
        '',
        `Établie le ${formatDateFr(new Date().toISOString())}.`,
      ];
  }
}

/** Génère un PDF (y compris pour les modèles libellés DOCX — export fiable sans API). */
export function generateAdministrativeDocumentPdf(
  templateId: AdministrativeTemplateId,
  project: Project,
): { blob: Blob; fileName: string; category: DocumentCategory } {
  const tpl = ADMINISTRATIVE_TEMPLATES.find((t) => t.id === templateId);
  if (!tpl) throw new Error(`Modèle inconnu : ${templateId}`);

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 18;
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(COMPANY, margin, y);
  y += 8;

  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  doc.setFontSize(14);
  doc.text(templateTitle(templateId), margin, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Généré le ${formatDateFr(new Date().toISOString())}`, margin, y);
  y += 10;

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  const lines = buildBodyLines(templateId, project);
  for (const line of lines) {
    if (!line) {
      y += 4;
      continue;
    }
    const wrapped = doc.splitTextToSize(line, pageWidth - margin * 2);
    if (y + wrapped.length * 5 > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(wrapped, margin, y);
    y += wrapped.length * 5 + 1;
  }

  const blob = doc.output('blob');
  const fileName = `${sanitizeFilename(tpl.label)}_${sanitizeFilename(project.reference)}_${new Date()
    .toISOString()
    .slice(0, 10)}.pdf`;

  return { blob, fileName, category: tpl.category };
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(url);
}
