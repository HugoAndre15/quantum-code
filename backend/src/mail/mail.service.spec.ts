import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

describe('MailService templates', () => {
  const service = new MailService({
    get: (_key: string, fallback?: string) => fallback,
  } as ConfigService);

  it('personalizes a quote email and separates subscriptions', () => {
    const html = service.buildDevisEmail({
      number: 'DEV-2026-042',
      contactName: 'Camille Martin',
      company: 'Atelier Camille',
      total: 890,
      validUntil: new Date('2026-08-30T00:00:00.000Z'),
      items: [
        {
          label: 'Pack Vitrine',
          quantity: 1,
          unitPrice: 890,
          recurring: false,
        },
        {
          label: 'Maintenance',
          quantity: 1,
          unitPrice: 19,
          recurring: true,
          recurringUnit: 'mois',
        },
      ],
      acceptUrl: 'https://quantum-code.fr/devis/accept/token',
    });

    expect(html).toContain('Camille, construisons la suite.');
    expect(html).toContain('Atelier Camille');
    expect(html).toContain('Montant ponctuel');
    expect(html).toContain('Maintenance');
    expect(html).toContain('/ mois');
    expect(html).toContain('Consulter et accepter le devis');
    expect(html).not.toContain('890,00&nbsp;€ HT');
  });

  it('escapes customer-provided values in email templates', () => {
    const html = service.buildDevisEmail({
      number: 'DEV-1',
      contactName: '<script>alert(1)</script>',
      company: '<b>Unsafe</b>',
      total: 590,
      items: [],
    });

    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>Unsafe</b>');
    expect(html).toContain('&lt;b&gt;Unsafe&lt;/b&gt;');
  });
});
