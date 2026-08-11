import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Project, ProjectQuoteLine } from '../types';
import { VAT_RATE } from '../lib/projectConstants';
import { computeQuoteLineTotal } from '../hooks/useProjectQuoteLines';

export type PdfDocumentType = 'devis' | 'facture';

const COMPANY_NAME = 'SINFONI';
const LEGAL_FOOTER =
  'SINFONI — Société de travaux électriques et énergétiques. ' +
  'Document établi à titre informatif. En cas de litige, seule la version signée fait foi. ' +
  'TVA non applicable, art. 293 B du CGI le cas échéant — TVA au taux en vigueur selon nature des prestations.';

function formatEuro(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatToday(): string {
  return new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function sanitizeFilename(reference: string): string {
  return reference.replace(/[^\w\-./]/g, '_');
}

function getDocumentTitle(type: PdfDocumentType): string {
  return type === 'devis' ? 'DEVIS' : 'FACTURE';
}

function getDesignation(project: Project, type: PdfDocumentType): string {
  const base = `${project.type} — ${project.title}`;
  if (type === 'facture') {
    if (project.billingStatus === 'Acompte émis' || project.invoiceDeposit) {
      return `${base} (Acompte 30 %)`;
    }
    if (project.billingStatus === 'Facturé total' || project.invoiceBalance) {
      return `${base} (Solde)`;
    }
  }
  return base;
}

function getInvoiceScale(project: Project): number {
  if (project.billingStatus === 'Acompte émis' || project.invoiceDeposit) {
    return 0.3;
  }
  if (project.billingStatus === 'Facturé total' || project.invoiceBalance) {
    return 0.7;
  }
  return 1;
}

function getInvoiceAmountHt(project: Project): number {
  const scale = getInvoiceScale(project);
  return Math.round(project.quoteAmountHt * scale * 100) / 100;
}

function buildFinancialRows(
  project: Project,
  type: PdfDocumentType,
  quoteLines: ProjectQuoteLine[],
): string[][] {
  if (quoteLines.length > 0) {
    const scale = type === 'facture' ? getInvoiceScale(project) : 1;
    return quoteLines.map((line) => {
      const lineTotal = Math.round(computeQuoteLineTotal(line) * scale * 100) / 100;
      const qtyLabel = line.quantity.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
      return [
        line.designation,
        qtyLabel,
        formatEuro(line.unitPriceHt),
        formatEuro(lineTotal),
      ];
    });
  }

  const amountHt = type === 'facture' ? getInvoiceAmountHt(project) : project.quoteAmountHt;
  const designation = getDesignation(project, type);
  return [[designation, '1', formatEuro(amountHt), formatEuro(amountHt)]];
}

export function generateProjectPdf(
  project: Project,
  type: PdfDocumentType,
  quoteLines: ProjectQuoteLine[] = [],
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  const amountHt = type === 'facture' ? getInvoiceAmountHt(project) : project.quoteAmountHt;
  const vatAmount = Math.round(amountHt * VAT_RATE * 100) / 100;
  const amountTtc = Math.round((amountHt + vatAmount) * 100) / 100;
  const vatPercent = Math.round(VAT_RATE * 100);

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 38, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(COMPANY_NAME, margin, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(getDocumentTitle(type), pageWidth - margin, 14, { align: 'right' });
  doc.text(formatToday(), pageWidth - margin, 22, { align: 'right' });
  doc.text(`Réf. ${project.reference}`, pageWidth - margin, 30, { align: 'right' });

  let y = 50;

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Informations du chantier', margin, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);

  const infoLines: [string, string][] = [
    ['Projet', project.title],
    ['Description', project.description || '—'],
    ['Type de travaux', project.type],
    ['Adresse / Site', project.location || '—'],
  ];

  if (type === 'facture') {
    infoLines.push(['Statut facturation', project.billingStatus]);
  } else {
    infoLines.push(['Statut devis', project.quoteStatus]);
  }

  infoLines.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text(`${label} :`, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);

    const wrapped = doc.splitTextToSize(value, contentWidth - 45);
    doc.text(wrapped, margin + 38, y);
    y += Math.max(6, wrapped.length * 5);
  });

  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Détail financier', margin, y);
  y += 4;

  const bodyRows = buildFinancialRows(project, type, quoteLines);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Désignation', 'Qté', 'P.U. HT', 'Total HT']],
    body: bodyRows,
    foot: [
      ['', '', `Total HT`, formatEuro(amountHt)],
      ['', '', `TVA (${vatPercent} %)`, formatEuro(vatAmount)],
      ['', '', 'Total TTC', formatEuro(amountTtc)],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right', fontStyle: 'bold' },
    },
    styles: {
      fontSize: 9,
      cellPadding: 4,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
  });

  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, pageHeight - 28, pageWidth - margin, pageHeight - 28);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const footerLines = doc.splitTextToSize(LEGAL_FOOTER, contentWidth);
  doc.text(footerLines, margin, pageHeight - 22);

  doc.setFontSize(8);
  doc.text(`${COMPANY_NAME} — ${project.reference}`, pageWidth / 2, pageHeight - 8, {
    align: 'center',
  });

  const prefix = type === 'devis' ? 'Devis' : 'Facture';
  const filename = `${prefix}_${sanitizeFilename(project.reference)}.pdf`;
  doc.save(filename);
}

export function canDownloadQuote(project: Pick<Project, 'quoteAmountHt'>): boolean {
  return project.quoteAmountHt > 0;
}

export function canDownloadInvoice(
  project: Pick<Project, 'billingStatus' | 'quoteAmountHt'>,
): boolean {
  return (
    project.quoteAmountHt > 0 &&
    project.billingStatus !== 'À émettre'
  );
}
