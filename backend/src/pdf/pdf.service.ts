import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';

const INTER_REGULAR =
  require.resolve('@fontsource/inter/files/inter-latin-400-normal.woff');
const INTER_BOLD =
  require.resolve('@fontsource/inter/files/inter-latin-700-normal.woff');

interface PdfItem {
  label: string;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  recurring: boolean;
  recurringUnit?: string | null;
}

interface PdfClient {
  company: string;
  contactName: string;
  email?: string | null;
  address?: string | null;
  phone?: string | null;
}

interface PdfDocumentData {
  type: 'devis' | 'facture';
  number: string;
  date: Date;
  validUntil?: Date | null;
  client: PdfClient;
  items: PdfItem[];
  totalHT: number;
  notes?: string | null;
  paidAt?: Date | null;
  discountAmount?: number;
  promoCode?: string | null;
}

const PAGE = {
  width: 595.28,
  height: 841.89,
  margin: 44,
  contentBottom: 748,
  footerY: 786,
};

const COLOR = {
  ink: '#181B21',
  text: '#2A2F39',
  muted: '#6E7685',
  subtle: '#969EAC',
  border: '#DCE1E8',
  surface: '#F5F6F8',
  blue: '#2D6FFF',
  blueSoft: '#EEF3FF',
  green: '#177A55',
  white: '#FFFFFF',
};

const COMPANY = {
  name: 'Quantum Code',
  tagline: 'Sites web & applications',
  owner: 'Hugo André - Entrepreneur individuel',
  siret: 'SIRET 102 934 916 00010',
  address: 'Oise, Hauts-de-France',
  email: 'contact@quantum-code.fr',
  phone: '+33 6 03 68 11 98',
  website: 'quantum-code.fr',
  tvaNote: 'TVA non applicable, art. 293 B du CGI',
};

@Injectable()
export class PdfService {
  generate(data: PdfDocumentData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 0,
        bufferPages: true,
        info: {
          Title: `${data.type === 'devis' ? 'Devis' : 'Facture'} ${data.number}`,
          Author: COMPANY.name,
          Subject: `Document commercial établi pour ${data.client.company}`,
        },
      });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.registerFont('Inter', INTER_REGULAR);
      doc.registerFont('Inter-Bold', INTER_BOLD);

      const contentWidth = PAGE.width - PAGE.margin * 2;
      const isQuote = data.type === 'devis';
      const oneTimeItems = data.items.filter((item) => !item.recurring);
      const recurringItems = data.items.filter((item) => item.recurring);
      const documentLabel = isQuote ? 'DEVIS' : 'FACTURE';
      let y = drawDocumentHeader();

      drawSectionHeading('01', 'Prestations', 'Le périmètre de votre projet');
      y += 34;
      drawItemsTable(oneTimeItems);

      y += 16;
      drawTotals();

      if (recurringItems.length > 0) {
        y += 26;
        drawSubscriptions(recurringItems);
      }

      if (data.notes) {
        y += 26;
        drawNotes(data.notes, recurringItems.length > 0 ? '03' : '02');
      }

      y += 28;
      drawTerms();
      drawFooters();
      doc.end();

      function drawDocumentHeader(): number {
        doc.rect(0, 0, PAGE.width, 126).fill(COLOR.ink);
        doc.rect(0, 0, PAGE.width, 4).fill(COLOR.blue);

        doc
          .roundedRect(PAGE.margin, 32, 30, 30, 6)
          .lineWidth(1)
          .strokeColor('#53617C')
          .stroke();
        doc
          .font('Inter-Bold')
          .fontSize(13)
          .fill(COLOR.white)
          .text('Q', PAGE.margin, 41, { width: 30, align: 'center' });

        doc
          .font('Inter-Bold')
          .fontSize(16)
          .fill(COLOR.white)
          .text(COMPANY.name, PAGE.margin + 42, 33);
        doc
          .font('Inter')
          .fontSize(8)
          .fill('#AAB1BD')
          .text(COMPANY.tagline, PAGE.margin + 42, 53);

        doc
          .font('Inter-Bold')
          .fontSize(9)
          .fill('#9CB9F4')
          .text(documentLabel, PAGE.margin, 32, {
            width: contentWidth,
            align: 'right',
          });
        doc
          .font('Inter-Bold')
          .fontSize(17)
          .fill(COLOR.white)
          .text(data.number, PAGE.margin, 50, {
            width: contentWidth,
            align: 'right',
          });

        doc
          .font('Inter')
          .fontSize(7.5)
          .fill('#8E96A4')
          .text(`${COMPANY.website}  |  ${COMPANY.email}`, PAGE.margin, 91);

        const infoY = 148;
        const clientWidth = 304;
        const metaX = PAGE.margin + clientWidth + 26;
        const metaWidth = contentWidth - clientWidth - 26;

        doc
          .font('Inter-Bold')
          .fontSize(7.5)
          .fill(COLOR.blue)
          .text('PRÉPARÉ POUR', PAGE.margin, infoY);
        doc
          .font('Inter-Bold')
          .fontSize(13)
          .fill(COLOR.ink)
          .text(data.client.company, PAGE.margin, infoY + 17, {
            width: clientWidth,
          });
        doc
          .font('Inter')
          .fontSize(8.5)
          .fill(COLOR.text)
          .text(data.client.contactName, PAGE.margin, infoY + 36, {
            width: clientWidth,
          });

        const clientDetails = [
          data.client.address,
          data.client.email,
          data.client.phone,
        ]
          .filter(Boolean)
          .join('  |  ');
        if (clientDetails) {
          doc
            .fontSize(7.5)
            .fill(COLOR.muted)
            .text(clientDetails, PAGE.margin, infoY + 51, {
              width: clientWidth,
              lineGap: 2,
            });
        }

        doc
          .roundedRect(metaX, infoY - 5, metaWidth, 70, 7)
          .fillAndStroke(COLOR.surface, COLOR.border);

        drawMeta('ÉMIS LE', fmtDate(data.date), metaX + 14, infoY + 8);
        if (isQuote) {
          drawMeta(
            "VALABLE JUSQU'AU",
            data.validUntil ? fmtDate(data.validUntil) : 'Non précisé',
            metaX + 14,
            infoY + 37,
          );
        } else if (data.paidAt) {
          drawMeta(
            'RÈGLEMENT',
            `Payée le ${fmtDate(data.paidAt)}`,
            metaX + 14,
            infoY + 37,
            COLOR.green,
          );
        } else {
          drawMeta('RÈGLEMENT', 'Sous 30 jours', metaX + 14, infoY + 37);
        }

        return 242;
      }

      function drawMeta(
        label: string,
        value: string,
        x: number,
        top: number,
        valueColor = COLOR.text,
      ) {
        doc
          .font('Inter-Bold')
          .fontSize(6.5)
          .fill(COLOR.subtle)
          .text(label, x, top);
        doc
          .font('Inter-Bold')
          .fontSize(8.5)
          .fill(valueColor)
          .text(value, x, top + 10);
      }

      function drawContinuationHeader() {
        doc.rect(0, 0, PAGE.width, 4).fill(COLOR.blue);
        doc
          .font('Inter-Bold')
          .fontSize(10)
          .fill(COLOR.ink)
          .text(COMPANY.name, PAGE.margin, 28);
        doc
          .font('Inter')
          .fontSize(7.5)
          .fill(COLOR.muted)
          .text(`${documentLabel} ${data.number}`, PAGE.margin, 29, {
            width: contentWidth,
            align: 'right',
          });
        doc
          .moveTo(PAGE.margin, 49)
          .lineTo(PAGE.width - PAGE.margin, 49)
          .lineWidth(0.7)
          .strokeColor(COLOR.border)
          .stroke();
        y = 70;
      }

      function addPage() {
        doc.addPage({ size: 'A4', margin: 0 });
        drawContinuationHeader();
      }

      function ensureSpace(height: number) {
        if (y + height > PAGE.contentBottom) addPage();
      }

      function drawSectionHeading(
        index: string,
        eyebrow: string,
        title: string,
      ) {
        ensureSpace(52);
        doc
          .font('Inter-Bold')
          .fontSize(7)
          .fill(COLOR.blue)
          .text(`${index}  ${eyebrow.toUpperCase()}`, PAGE.margin, y);
        doc
          .font('Inter-Bold')
          .fontSize(15)
          .fill(COLOR.ink)
          .text(title, PAGE.margin, y + 14);
      }

      function drawItemsTable(items: PdfItem[]) {
        drawTableHeader();
        if (items.length === 0) {
          doc
            .rect(PAGE.margin, y, contentWidth, 38)
            .fillAndStroke(COLOR.white, COLOR.border);
          doc
            .font('Inter')
            .fontSize(8.5)
            .fill(COLOR.muted)
            .text('Aucune prestation ponctuelle.', PAGE.margin + 12, y + 14);
          y += 38;
          return;
        }

        for (const item of items) {
          const rowHeight = getItemRowHeight(item);
          if (y + rowHeight > PAGE.contentBottom) {
            addPage();
            drawSectionHeading('01', 'Prestations', 'Périmètre - suite');
            y += 34;
            drawTableHeader();
          }
          drawItemRow(item, rowHeight);
        }
      }

      function drawTableHeader() {
        const columns = getColumns();
        doc
          .roundedRect(PAGE.margin, y, contentWidth, 25, 5)
          .fill(COLOR.surface);
        doc.font('Inter-Bold').fontSize(7).fill(COLOR.muted);
        doc.text('PRESTATION', columns.description, y + 9, {
          width: columns.descriptionWidth,
        });
        doc.text('QTÉ', columns.quantity, y + 9, {
          width: 34,
          align: 'center',
        });
        doc.text('PRIX UNIT.', columns.unitPrice, y + 9, {
          width: 68,
          align: 'right',
        });
        doc.text('TOTAL', columns.total, y + 9, {
          width: 71,
          align: 'right',
        });
        y += 25;
      }

      function getColumns() {
        return {
          description: PAGE.margin + 11,
          descriptionWidth: 268,
          quantity: 329,
          unitPrice: 376,
          total: 468,
        };
      }

      function getItemRowHeight(item: PdfItem): number {
        const descriptionHeight = item.description
          ? doc.font('Inter').fontSize(7.5).heightOfString(item.description, {
              width: getColumns().descriptionWidth,
              lineGap: 1,
            })
          : 0;
        return Math.max(38, 28 + descriptionHeight);
      }

      function drawItemRow(item: PdfItem, rowHeight: number) {
        const columns = getColumns();
        doc
          .moveTo(PAGE.margin, y + rowHeight)
          .lineTo(PAGE.width - PAGE.margin, y + rowHeight)
          .lineWidth(0.6)
          .strokeColor(COLOR.border)
          .stroke();

        doc
          .font('Inter-Bold')
          .fontSize(8.5)
          .fill(COLOR.ink)
          .text(item.label, columns.description, y + 10, {
            width: columns.descriptionWidth,
          });
        if (item.description) {
          doc
            .font('Inter')
            .fontSize(7.5)
            .fill(COLOR.muted)
            .text(item.description, columns.description, y + 23, {
              width: columns.descriptionWidth,
              lineGap: 1,
            });
        }

        doc.font('Inter').fontSize(8).fill(COLOR.text);
        doc.text(String(item.quantity), columns.quantity, y + 11, {
          width: 34,
          align: 'center',
        });
        doc.text(formatMoney(item.unitPrice), columns.unitPrice, y + 11, {
          width: 68,
          align: 'right',
        });
        doc
          .font('Inter-Bold')
          .text(
            formatMoney(item.unitPrice * item.quantity),
            columns.total,
            y + 11,
            { width: 71, align: 'right' },
          );
        y += rowHeight;
      }

      function drawTotals() {
        ensureSpace(data.discountAmount ? 112 : 88);
        const width = 244;
        const x = PAGE.width - PAGE.margin - width;

        if (data.discountAmount && data.discountAmount > 0) {
          drawTotalLine(
            'Sous-total',
            formatMoney(data.totalHT + data.discountAmount),
            x,
          );
          y += 18;
          drawTotalLine(
            data.promoCode ? `Remise - ${data.promoCode}` : 'Remise',
            `- ${formatMoney(data.discountAmount)}`,
            x,
            COLOR.green,
          );
          y += 22;
        }

        doc.roundedRect(x, y, width, 48, 7).fill(COLOR.ink);
        doc
          .font('Inter-Bold')
          .fontSize(7)
          .fill('#AFB6C2')
          .text('MONTANT DU PROJET', x + 14, y + 11);
        doc
          .font('Inter-Bold')
          .fontSize(15)
          .fill(COLOR.white)
          .text(formatMoney(data.totalHT), x + 14, y + 25, {
            width: width - 28,
            align: 'right',
          });
        y += 55;
        doc
          .font('Inter')
          .fontSize(7)
          .fill(COLOR.subtle)
          .text(COMPANY.tvaNote, x, y, { width, align: 'right' });
        y += 10;
      }

      function drawTotalLine(
        label: string,
        value: string,
        x: number,
        valueColor = COLOR.text,
      ) {
        doc
          .font('Inter')
          .fontSize(8)
          .fill(COLOR.muted)
          .text(label, x, y, { width: 140, align: 'right' });
        doc
          .font('Inter-Bold')
          .fill(valueColor)
          .text(value, x + 150, y, { width: 94, align: 'right' });
      }

      function drawSubscriptions(items: PdfItem[]) {
        const estimatedHeight =
          78 +
          items.reduce((sum, item) => sum + getSubscriptionRowHeight(item), 0);
        if (estimatedHeight <= PAGE.contentBottom - 70) {
          ensureSpace(estimatedHeight);
        } else if (y + 110 > PAGE.contentBottom) {
          addPage();
        }

        drawSectionHeading(
          '02',
          'Abonnements',
          'Services récurrents, facturés à part',
        );
        y += 37;

        doc
          .font('Inter')
          .fontSize(7.5)
          .fill(COLOR.muted)
          .text(
            'Ces services ne sont pas inclus dans le montant ponctuel du projet. Chaque ligne suit la périodicité indiquée.',
            PAGE.margin,
            y,
            { width: contentWidth, lineGap: 2 },
          );
        y += 27;

        for (const item of items) {
          const rowHeight = getSubscriptionRowHeight(item);
          if (y + rowHeight > PAGE.contentBottom) {
            addPage();
            drawSectionHeading('02', 'Abonnements', 'Services - suite');
            y += 37;
          }

          doc
            .roundedRect(PAGE.margin, y, contentWidth, rowHeight - 6, 6)
            .fillAndStroke(COLOR.blueSoft, '#D8E2F9');
          doc
            .font('Inter-Bold')
            .fontSize(8.5)
            .fill(COLOR.ink)
            .text(
              `${item.label}${item.quantity > 1 ? ` x ${item.quantity}` : ''}`,
              PAGE.margin + 13,
              y + 11,
              { width: 300 },
            );
          if (item.description) {
            doc
              .font('Inter')
              .fontSize(7)
              .fill(COLOR.muted)
              .text(item.description, PAGE.margin + 13, y + 25, {
                width: 300,
                lineGap: 1,
              });
          }
          doc
            .font('Inter-Bold')
            .fontSize(10)
            .fill(COLOR.blue)
            .text(
              `${formatMoney(item.unitPrice * item.quantity)} / ${item.recurringUnit || 'mois'}`,
              PAGE.margin + 325,
              y + 14,
              { width: contentWidth - 338, align: 'right' },
            );
          y += rowHeight;
        }
      }

      function getSubscriptionRowHeight(item: PdfItem) {
        if (!item.description) return 45;
        const descriptionHeight = doc
          .font('Inter')
          .fontSize(7)
          .heightOfString(item.description, { width: 300, lineGap: 1 });
        return Math.max(52, 35 + descriptionHeight);
      }

      function drawNotes(notes: string, index: string) {
        const textHeight = doc
          .font('Inter')
          .fontSize(8)
          .heightOfString(notes, { width: contentWidth - 26, lineGap: 2 });
        const blockHeight = textHeight + 58;
        ensureSpace(blockHeight);
        drawSectionHeading(index, 'Précisions', 'Notes sur la proposition');
        y += 35;
        doc
          .roundedRect(PAGE.margin, y, contentWidth, textHeight + 24, 6)
          .fillAndStroke(COLOR.surface, COLOR.border);
        doc
          .font('Inter')
          .fontSize(8)
          .fill(COLOR.text)
          .text(notes, PAGE.margin + 13, y + 12, {
            width: contentWidth - 26,
            lineGap: 2,
          });
        y += textHeight + 24;
      }

      function drawTerms() {
        const terms = isQuote
          ? [
              'Ce devis est valable pendant la durée indiquée dans le document.',
              'Un acompte de 30 % est demandé après acceptation. Le solde est dû à la livraison.',
              "Toute demande hors du périmètre présenté fera l'objet d'un avenant ou d'un devis complémentaire.",
              'Le planning est confirmé après validation du devis et réception des éléments nécessaires.',
              'Le code source livré devient la propriété du client après paiement intégral.',
              'Quatorze jours de suivi post-livraison sont inclus pour les corrections de bugs et ajustements mineurs.',
              'Les abonnements retenus sont optionnels et facturés séparément selon leur périodicité.',
            ]
          : [
              'Paiement par virement bancaire sous 30 jours.',
              "En cas de retard, une pénalité égale à trois fois le taux d'intérêt légal sera appliquée.",
              'Indemnité forfaitaire de recouvrement : 40 EUR, conformément à l’article L441-10 du Code de commerce.',
              'Le code source livré devient la propriété du client après paiement intégral.',
              'Les abonnements souscrits sont facturés séparément selon leur périodicité.',
            ];

        ensureSpace(64);
        drawSectionHeading(
          data.notes
            ? recurringItems.length
              ? '04'
              : '03'
            : recurringItems.length
              ? '03'
              : '02',
          'Conditions',
          isQuote ? 'Cadre de la proposition' : 'Modalités de paiement',
        );
        y += 38;

        for (const term of terms) {
          const termHeight = doc
            .font('Inter')
            .fontSize(7.5)
            .heightOfString(term, {
              width: contentWidth - 18,
              lineGap: 2,
            });
          ensureSpace(termHeight + 10);
          doc.circle(PAGE.margin + 3, y + 4, 1.5).fill(COLOR.blue);
          doc
            .font('Inter')
            .fontSize(7.5)
            .fill(COLOR.muted)
            .text(term, PAGE.margin + 14, y, {
              width: contentWidth - 14,
              lineGap: 2,
            });
          y += termHeight + 8;
        }
      }

      function drawFooters() {
        const range = doc.bufferedPageRange();
        for (
          let pageIndex = range.start;
          pageIndex < range.start + range.count;
          pageIndex++
        ) {
          doc.switchToPage(pageIndex);
          doc
            .moveTo(PAGE.margin, PAGE.footerY - 11)
            .lineTo(PAGE.width - PAGE.margin, PAGE.footerY - 11)
            .lineWidth(0.6)
            .strokeColor(COLOR.border)
            .stroke();
          doc
            .font('Inter')
            .fontSize(6.5)
            .fill(COLOR.muted)
            .text(
              `${COMPANY.name}  |  ${COMPANY.owner}  |  ${COMPANY.siret}`,
              PAGE.margin,
              PAGE.footerY,
              { width: contentWidth - 50 },
            );
          doc.text(
            `${pageIndex - range.start + 1} / ${range.count}`,
            PAGE.width - PAGE.margin - 50,
            PAGE.footerY,
            { width: 50, align: 'right' },
          );
          doc
            .fontSize(6.2)
            .fill(COLOR.subtle)
            .text(
              `${COMPANY.address}  |  ${COMPANY.email}  |  ${COMPANY.phone}`,
              PAGE.margin,
              PAGE.footerY + 10,
              { width: contentWidth },
            );
        }
      }
    });
  }
}

function fmtDate(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

function formatMoney(amount: number): string {
  const value = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })
    .format(amount)
    .replace(/\u00a0|\u202f/g, ' ');
  return `${value} €`;
}
