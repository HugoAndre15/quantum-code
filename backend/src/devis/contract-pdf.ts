import * as PDFDocument from 'pdfkit';
import { ContractOffer, offerDigest, Signer } from './contract';

const euro = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n).replace(/[\u00a0\u202f]/g, ' ');
const date = (d: Date | string) => new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris', dateStyle: 'long',
}).format(new Date(d));

export function renderContractPdf(snapshot: string, signer?: Signer): Promise<Buffer> {
  const offer: ContractOffer = JSON.parse(snapshot);
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', bufferPages: true,
      margins: { top: 66, bottom: 68, left: 50, right: 50 },
      info: { Title: `Devis et contrat ${offer.number}`, Author: offer.issuer.name } });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.registerFont('Body', require.resolve('@fontsource/inter/files/inter-latin-400-normal.woff'));
    doc.registerFont('Bold', require.resolve('@fontsource/inter/files/inter-latin-700-normal.woff'));
    const ink = '#1B2635', blue = '#2855AC', muted = '#465569';
    const h = (s: string) => {
      if (doc.y > 690) doc.addPage();
      doc.font('Bold').fontSize(12).fillColor(blue).text(s); doc.moveDown(.35);
    };
    const p = (s: string) => {
      doc.font('Body').fontSize(10).fillColor(ink).text(s, { lineGap: 2 }); doc.moveDown(.6);
    };
    doc.font('Bold').fontSize(23).fillColor(ink).text('Contrat de création de site');
    p(`Devis ${offer.number} · Émis le ${date(offer.createdAt)} · Offre valable jusqu’au ${date(offer.validUntil)}`);
    h('Prestataire'); p(`${offer.issuer.name} · SIRET ${offer.issuer.siret}\n${offer.issuer.address} · ${offer.issuer.email}`);
    h('Client professionnel'); p([offer.client.company, offer.client.address, offer.client.contactName, offer.client.email].filter(Boolean).join('\n'));
    h('Prestations et prix');
    for (const item of offer.items) {
      const price = euro(item.quantity * item.unitPrice);
      p(`${item.label} — ${item.quantity} × ${euro(item.unitPrice)} = ${price}${item.recurring ? ' / ' + (item.recurringUnit || 'mois') + ' (récurrent)' : ' (ponctuel)'}${item.description ? '\n' + item.description : ''}`);
    }
    if (offer.discountAmount > 0) p(`Remise${offer.promoCode ? ' (' + offer.promoCode + ')' : ''} : −${euro(offer.discountAmount)}`);
    h(`Total ponctuel : ${euro(offer.totalHT)}`); p(offer.tax + ' Les montants récurrents sont indiqués à part.');
    if (offer.notes) { h('Conditions particulières du devis'); p(offer.notes); }
    doc.addPage();
    h('Conditions générales de vente · ' + offer.version);
    for (const clause of offer.clauses) {
      const needed = doc.font('Body').fontSize(10).heightOfString(clause.text, { width: 495, lineGap: 2 }) + 43;
      if (doc.y + needed > 766) doc.addPage();
      h(clause.title); p(clause.text);
    }
    if (doc.y > 405) doc.addPage();
    else doc.moveDown();
    h(signer ? 'Signature du client enregistrée' : 'Accord à donner');
    p(offer.scope); p(offer.consent);
    if (signer) {
      p(`Signataire déclaré : ${signer.signerName}\nQualité : ${signer.signerRole}\nClient : ${offer.client.company}\nAdresse destinataire de l’invitation : ${offer.client.email}\nDate et heure (UTC) : ${signer.signedAt.toISOString()}`);
      p('Accord électronique simple recueilli par lien individuel. Il ne s’agit pas d’une signature qualifiée ni d’un certificat d’identité.');
    } else {
      p('Pour signer en ligne, utilisez le lien individuel de la proposition. Aucun accord n’est enregistré par le téléchargement de ce document.');
    }
    h('Référence du contenu'); p(`Devis ${offer.number} · ${offer.version}\nSHA-256 du contenu contractuel :\n${offerDigest(snapshot)}`);
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i); doc.page.margins.bottom = 0;
      doc.font('Bold').fontSize(8).fillColor(blue).text('QUANTUM CODE  /  CONTRATS', 50, 30, { lineBreak: false });
      doc.font('Body').fontSize(8).fillColor(muted).text(`${offer.number}   ·   ${offer.version}   ·   ${signer ? 'Exemplaire signé' : 'Proposition à signer'}`, 50, 800, { lineBreak: false });
      doc.text(`${i + 1} / ${range.count}`, 480, 800, { width: 65, align: 'right', lineBreak: false });
    }
    doc.end();
  });
}
