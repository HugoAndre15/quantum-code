import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';

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

// ─── Constantes visuelles ─────────────────────
const BLUE = '#2D6FFF';
const DARK = '#1E1E1E';
const TEXT = '#333333';
const GREY = '#777777';
const LIGHT_BG = '#F7F8FA';
const TABLE_HEADER_BG = '#2D6FFF';
const TABLE_STRIPE = '#F2F5FF';
const ACCENT_GOLD = '#E8A900';
const BORDER = '#DDE1E8';
const WHITE = '#FFFFFF';

// ─── Infos légales (à personnaliser) ──────────
const COMPANY = {
  name: 'Quantum Code',
  tagline: 'Développement Web & Applications',
  owner: 'Quantum Code — Micro-entreprise',
  siret: 'SIRET : 102 934 916 00010',
  address: 'Oise, Hauts-de-France',
  email: 'devis@quantum-code.fr',
  phone: '+33 6 03 68 11 98',
  website: 'quantum-code.fr',
  tvaNote: 'TVA non applicable, art. 293 B du CGI',
};

@Injectable()
export class PdfService {
  generate(data: PdfDocumentData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 0 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W = 595.28;
      const M = 50; // marge horizontale
      const contentW = W - M * 2;
      const isDevis = data.type === 'devis';
      const title = isDevis ? 'DEVIS' : 'FACTURE';

      // ═══════════════════════════════════════════
      //  HEADER — bandeau bleu fin en haut
      // ═══════════════════════════════════════════
      doc.rect(0, 0, W, 5).fill(BLUE);

      // Logo / Nom entreprise
      doc.fontSize(22).fill(DARK).font('Helvetica-Bold')
        .text(COMPANY.name, M, 28);
      doc.fontSize(9).fill(GREY).font('Helvetica')
        .text(COMPANY.tagline, M, 54);

      // Type document + numéro (aligné à droite)
      doc.fontSize(18).fill(BLUE).font('Helvetica-Bold')
        .text(title, M, 28, { width: contentW, align: 'right' });
      doc.fontSize(10).fill(TEXT).font('Helvetica')
        .text(data.number, M, 52, { width: contentW, align: 'right' });

      // Ligne de séparation
      doc.moveTo(M, 72).lineTo(W - M, 72).strokeColor(BORDER).lineWidth(0.5).stroke();

      // ═══════════════════════════════════════════
      //  INFO BLOCKS — émetteur + client côte à côte
      // ═══════════════════════════════════════════
      let y = 84;
      const colW = (contentW - 30) / 2;

      // Émetteur
      doc.fontSize(8).fill(BLUE).font('Helvetica-Bold').text('ÉMETTEUR', M, y);
      y += 14;
      doc.fontSize(9).fill(DARK).font('Helvetica-Bold').text(COMPANY.name, M, y);
      doc.fontSize(8.5).fill(TEXT).font('Helvetica');
      doc.text(COMPANY.owner, M, y + 13);
      doc.text(COMPANY.siret, M, y + 25);
      doc.text(COMPANY.address, M, y + 37);
      doc.text(COMPANY.email, M, y + 49);
      doc.text(COMPANY.phone, M, y + 61);

      // Client — dans un encadré
      const clientX = M + colW + 30;
      const clientBoxY = y - 14;
      doc.roundedRect(clientX - 10, clientBoxY - 4, colW + 10, 88, 4)
        .fillAndStroke(LIGHT_BG, BORDER);

      doc.fontSize(8).fill(BLUE).font('Helvetica-Bold').text('CLIENT', clientX, clientBoxY + 4);
      doc.fontSize(9).fill(DARK).font('Helvetica-Bold')
        .text(data.client.company, clientX, clientBoxY + 18, { width: colW - 5 });
      doc.fontSize(8.5).fill(TEXT).font('Helvetica');
      let clientY = clientBoxY + 31;
      doc.text(data.client.contactName, clientX, clientY); clientY += 12;
      if (data.client.address) { doc.text(data.client.address, clientX, clientY); clientY += 12; }
      if (data.client.email) { doc.text(data.client.email, clientX, clientY); clientY += 12; }
      if (data.client.phone) { doc.text(data.client.phone, clientX, clientY); }

      // ═══════════════════════════════════════════
      //  DATE / VALIDITÉ
      // ═══════════════════════════════════════════
      y = 180;
      doc.fontSize(8.5).fill(TEXT).font('Helvetica');
      const dateStr = `Date d'émission : ${fmtDate(data.date)}`;
      doc.text(dateStr, M, y);
      if (isDevis && data.validUntil) {
        doc.text(`Validité : ${fmtDate(data.validUntil)}`, M + 200, y);
      }
      if (!isDevis && data.paidAt) {
        doc.fontSize(8.5).fill('#2e7d32').font('Helvetica-Bold')
          .text(`Payée le : ${fmtDate(data.paidAt)}`, M + 200, y);
      }

      // ═══════════════════════════════════════════
      //  TABLEAU — prestations
      // ═══════════════════════════════════════════
      y = 206;
      const oneTimeItems = data.items.filter(i => !i.recurring);
      const recurringItems = data.items.filter(i => i.recurring);

      // Colonnes : Prestation | Qté | P.U. HT | Total HT
      const col = { desc: M, qty: 340, pu: 400, total: 470 };
      const colDescW = col.qty - col.desc - 8;

      // Header
      doc.rect(M, y, contentW, 22).fill(TABLE_HEADER_BG);
      doc.fontSize(8).fill(WHITE).font('Helvetica-Bold');
      doc.text('Prestation', col.desc + 8, y + 6, { width: colDescW });
      doc.text('Qté', col.qty, y + 6, { width: 40, align: 'center' });
      doc.text('P.U. HT', col.pu, y + 6, { width: 55, align: 'right' });
      doc.text('Total HT', col.total, y + 6, { width: 75, align: 'right' });
      y += 22;

      // Rows
      for (let i = 0; i < oneTimeItems.length; i++) {
        const item = oneTimeItems[i];
        const hasDesc = !!item.description;
        const rowH = hasDesc ? 30 : 20;

        // Page break check
        if (y + rowH > 700) {
          doc.addPage({ size: 'A4', margin: 0 });
          doc.rect(0, 0, W, 5).fill(BLUE);
          y = 30;
        }

        const bg = i % 2 === 0 ? WHITE : TABLE_STRIPE;
        doc.rect(M, y, contentW, rowH).fill(bg);
        // Bottom border
        doc.moveTo(M, y + rowH).lineTo(W - M, y + rowH).strokeColor('#E5E8EE').lineWidth(0.3).stroke();

        doc.fontSize(8.5).fill(DARK).font('Helvetica-Bold')
          .text(item.label, col.desc + 8, y + 4, { width: colDescW });
        if (hasDesc) {
          doc.fontSize(7.5).fill(GREY).font('Helvetica')
            .text(item.description!, col.desc + 8, y + 16, { width: colDescW });
        }
        doc.fontSize(8.5).fill(TEXT).font('Helvetica');
        doc.text(String(item.quantity), col.qty, y + 4, { width: 40, align: 'center' });
        doc.text(`${item.unitPrice.toFixed(2)} €`, col.pu, y + 4, { width: 55, align: 'right' });
        doc.font('Helvetica-Bold')
          .text(`${(item.unitPrice * item.quantity).toFixed(2)} €`, col.total, y + 4, { width: 75, align: 'right' });
        y += rowH;
      }

      // ═══════════════════════════════════════════
      //  TOTAUX
      // ═══════════════════════════════════════════
      y += 10;
      const totX = col.pu - 30;
      const totW = W - M - totX;

      // Sous-total HT (avant réduction si promo)
      if (data.discountAmount && data.discountAmount > 0) {
        const subtotalBeforeDiscount = data.totalHT + data.discountAmount;
        doc.fontSize(8.5).fill(TEXT).font('Helvetica')
          .text('Sous-total HT', totX, y, { width: totW - 80, align: 'right' });
        doc.font('Helvetica-Bold')
          .text(`${subtotalBeforeDiscount.toFixed(2)} €`, totX + totW - 80, y, { width: 80, align: 'right' });
        y += 16;

        // Ligne réduction
        const promoLabel = data.promoCode ? `Réduction (${data.promoCode})` : 'Réduction';
        doc.fontSize(8.5).fill('#2e7d32').font('Helvetica')
          .text(promoLabel, totX, y, { width: totW - 80, align: 'right' });
        doc.font('Helvetica-Bold').fill('#2e7d32')
          .text(`-${data.discountAmount.toFixed(2)} €`, totX + totW - 80, y, { width: 80, align: 'right' });
        y += 16;
      }

      // Total HT
      doc.fontSize(8.5).fill(TEXT).font('Helvetica')
        .text('Total HT', totX, y, { width: totW - 80, align: 'right' });
      doc.font('Helvetica-Bold')
        .text(`${data.totalHT.toFixed(2)} €`, totX + totW - 80, y, { width: 80, align: 'right' });
      y += 16;

      // TVA
      doc.fontSize(8).fill(GREY).font('Helvetica')
        .text(COMPANY.tvaNote, totX, y, { width: totW, align: 'right' });
      y += 16;

      // Total TTC (même montant car pas de TVA)
      doc.roundedRect(totX - 5, y - 3, totW + 5, 28, 4).fill(DARK);
      doc.fontSize(10).fill(WHITE).font('Helvetica-Bold')
        .text('Total TTC', totX + 5, y + 4);
      doc.fontSize(12).fill(ACCENT_GOLD).font('Helvetica-Bold')
        .text(`${data.totalHT.toFixed(2)} €`, totX + totW - 100, y + 3, { width: 95, align: 'right' });
      y += 40;

      // ═══════════════════════════════════════════
      //  ABONNEMENTS RÉCURRENTS
      // ═══════════════════════════════════════════
      if (recurringItems.length > 0) {
        if (y + 60 > 700) { doc.addPage({ size: 'A4', margin: 0 }); doc.rect(0, 0, W, 5).fill(BLUE); y = 30; }

        doc.fontSize(9).fill(DARK).font('Helvetica-Bold')
          .text('Prestations récurrentes', M, y);
        y += 16;
        for (const item of recurringItems) {
          doc.fontSize(8.5).fill(TEXT).font('Helvetica')
            .text(`• ${item.label}`, M + 8, y, { width: 300 });
          doc.fill(BLUE).font('Helvetica-Bold')
            .text(`${item.unitPrice.toFixed(2)} € / ${item.recurringUnit || 'mois'}`, col.total, y, { width: 75, align: 'right' });
          y += 15;
        }
        y += 10;
      }

      // ═══════════════════════════════════════════
      //  NOTES
      // ═══════════════════════════════════════════
      if (data.notes) {
        if (y + 50 > 700) { doc.addPage({ size: 'A4', margin: 0 }); doc.rect(0, 0, W, 5).fill(BLUE); y = 30; }
        doc.fontSize(8).fill(BLUE).font('Helvetica-Bold').text('NOTES', M, y);
        y += 12;
        doc.fontSize(8.5).fill(TEXT).font('Helvetica')
          .text(data.notes, M, y, { width: contentW });
        y += 30;
      }

      // ═══════════════════════════════════════════
      //  CONDITIONS (devis uniquement)
      // ═══════════════════════════════════════════
      if (isDevis) {
        if (y + 110 > 700) { doc.addPage({ size: 'A4', margin: 0 }); doc.rect(0, 0, W, 5).fill(BLUE); y = 30; }
        doc.fontSize(8).fill(BLUE).font('Helvetica-Bold').text('CONDITIONS & ENGAGEMENTS', M, y);
        y += 12;
        doc.fontSize(7.5).fill(GREY).font('Helvetica');
        doc.text('• Ce devis est valable pour la durée indiquée ci-dessus.', M, y, { width: contentW }); y += 11;
        doc.text('• Un acompte de 30% est demandé à la signature, le solde à la livraison.', M, y, { width: contentW }); y += 11;
        doc.text('• Tout projet commencé est dû. Les modifications hors périmètre feront l\'objet d\'un avenant.', M, y, { width: contentW }); y += 11;
        doc.text('• Délais de réalisation communiqués après validation du devis.', M, y, { width: contentW }); y += 11;
        doc.text('• Propriété : le client devient pleinement propriétaire du code source livré dès le paiement intégral (cession des droits patrimoniaux).', M, y, { width: contentW }); y += 18;
        doc.text('• Hébergement : le site est hébergé par Quantum Code (serveur, nom de domaine, SSL, sauvegardes), facturé en option récurrente ci-dessus.', M, y, { width: contentW }); y += 18;
        doc.text('• Suivi : 14 jours de suivi post-livraison inclus (corrections de bugs et ajustements mineurs offerts).', M, y, { width: contentW }); y += 11;
        doc.text('• Au-delà des 14 jours, toute intervention fera l\'objet d\'un devis complémentaire ou sera couverte par un contrat de maintenance.', M, y, { width: contentW }); y += 18;
      }

      // ═══════════════════════════════════════════
      //  CONDITIONS DE PAIEMENT (facture uniquement)
      // ═══════════════════════════════════════════
      if (!isDevis) {
        if (y + 80 > 700) { doc.addPage({ size: 'A4', margin: 0 }); doc.rect(0, 0, W, 5).fill(BLUE); y = 30; }
        doc.fontSize(8).fill(BLUE).font('Helvetica-Bold').text('PAIEMENT & ENGAGEMENTS', M, y);
        y += 12;
        doc.fontSize(7.5).fill(GREY).font('Helvetica');
        doc.text('• Paiement par virement bancaire sous 30 jours.', M, y, { width: contentW }); y += 11;
        doc.text('• En cas de retard, une pénalité de 3x le taux d\'intérêt légal sera appliquée.', M, y, { width: contentW }); y += 11;
        doc.text('• Indemnité forfaitaire de recouvrement : 40 € (art. L441-10 du Code de commerce).', M, y, { width: contentW }); y += 11;
        doc.text('• Propriété : le client est pleinement propriétaire du code source livré dès le paiement intégral.', M, y, { width: contentW }); y += 11;
        doc.text('• Hébergement assuré par Quantum Code (serveur, nom de domaine, SSL, sauvegardes) — voir prestations récurrentes ci-dessus.', M, y, { width: contentW }); y += 18;
        doc.text('• 14 jours de suivi post-livraison inclus (corrections de bugs et ajustements mineurs offerts).', M, y, { width: contentW }); y += 18;
      }

      // ═══════════════════════════════════════════
      //  FOOTER — infos légales
      // ═══════════════════════════════════════════
      const footerY = 780;
      doc.moveTo(M, footerY - 8).lineTo(W - M, footerY - 8).strokeColor(BORDER).lineWidth(0.3).stroke();
      doc.fontSize(7).fill(GREY).font('Helvetica');
      doc.text(
        `${COMPANY.name} — ${COMPANY.owner} — ${COMPANY.siret}`,
        M, footerY, { width: contentW, align: 'center' },
      );
      doc.text(
        `${COMPANY.address} — ${COMPANY.email} — ${COMPANY.website}`,
        M, footerY + 10, { width: contentW, align: 'center' },
      );
      doc.text(
        COMPANY.tvaNote,
        M, footerY + 20, { width: contentW, align: 'center' },
      );

      doc.end();
    });
  }
}

function fmtDate(date: Date): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}
