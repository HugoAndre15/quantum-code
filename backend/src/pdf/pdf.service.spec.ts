import { PdfService } from './pdf.service';

describe('PdfService', () => {
  const service = new PdfService();

  it('generates a styled quote with one-time and recurring items', async () => {
    const pdf = await service.generate({
      type: 'devis',
      number: 'DEV-2026-042',
      date: new Date('2026-07-30T00:00:00.000Z'),
      validUntil: new Date('2026-08-30T00:00:00.000Z'),
      client: {
        company: 'Atelier Camille',
        contactName: 'Camille Martin',
        email: 'camille@example.com',
        address: '12 rue des Artisans, 60300 Senlis',
      },
      items: [
        {
          label: 'Pack Vitrine',
          description:
            'Un site professionnel conçu pour présenter le savoir-faire et générer des demandes qualifiées.',
          quantity: 1,
          unitPrice: 890,
          recurring: false,
        },
        {
          label: 'Maintenance',
          description: 'Mises à jour, sauvegardes et support technique.',
          quantity: 1,
          unitPrice: 19,
          recurring: true,
          recurringUnit: 'mois',
        },
      ],
      totalHT: 790,
      discountAmount: 100,
      promoCode: 'BIENVENUE',
      notes: 'Le calendrier définitif sera confirmé au démarrage du projet.',
    });

    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(pdf.length).toBeGreaterThan(5_000);
  });
});
