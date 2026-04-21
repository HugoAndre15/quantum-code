import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { DevisService } from '../devis/devis.service';
import { SimulatorLeadDto } from './dto/simulator-lead.dto';

const LEGAL_DEVIS_NOTES = [
  'Le client est et reste propriétaire intégral du code source livré (cession des droits patrimoniaux à compter du paiement intégral).',
  'Hébergement assuré par Quantum Code (serveur, nom de domaine, certificat SSL, sauvegardes) — voir options récurrentes ci-dessous.',
  '14 jours de suivi post-livraison inclus : corrections de bugs et ajustements mineurs offerts.',
  'Au-delà des 14 jours, toute intervention fait l’objet d’un devis complémentaire ou est couverte par un contrat de maintenance.',
].join('\n');

@Injectable()
export class SimulatorService {
  private readonly logger = new Logger(SimulatorService.name);

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private devis: DevisService,
    private config: ConfigService,
  ) {}

  async submitLead(dto: SimulatorLeadDto) {
    // 1) Crée (ou enrichit) le client
    const client = await this.prisma.client.create({
      data: {
        company: dto.company,
        trade: dto.trade || 'À préciser',
        contactName: dto.contactName,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        website: dto.website,
        status: 'A_CONTACTER',
        notes: dto.message
          ? `Demande issue du simulateur :\n${dto.message}`
          : 'Demande issue du simulateur en ligne.',
        budget: dto.estimatedTotal,
        contactDate: new Date(),
        ...(dto.packId && { packId: dto.packId }),
        ...(dto.optionIds?.length && {
          options: {
            create: dto.optionIds.map((serviceOptionId) => ({
              serviceOptionId,
            })),
          },
        }),
      },
      include: {
        pack: true,
        options: { include: { serviceOption: true } },
      },
    });

    // 2) Inclut automatiquement les options récurrentes actives
    //    (maintenance / hébergement) sur le premier devis
    const recurringOptions = await this.prisma.serviceOption.findMany({
      where: { active: true, recurring: true },
    });
    const recurringIds = recurringOptions.map((o) => o.id);
    const baseOptionIds = dto.optionIds || [];
    const allOptionIds = Array.from(new Set([...baseOptionIds, ...recurringIds]));

    // 3) Crée un premier devis en BROUILLON via le DevisService
    let devis: { id: string; number: string; totalHT: number } | null = null;
    try {
      devis = await this.devis.create({
        clientId: client.id,
        packId: dto.packId,
        optionIds: allOptionIds,
        pages: dto.pages,
        notes: LEGAL_DEVIS_NOTES,
      });
    } catch (err) {
      this.logger.warn(
        `Devis automatique non créé pour ${client.id}: ${(err as Error).message}`,
      );
    }

    // 4) Envoie l'email à l'admin avec toutes les infos
    const to = this.config.get('MAIL_FROM', 'contact@quantum-code.fr');
    try {
      await this.mail.sendMail({
        to,
        subject: `Nouvelle simulation – ${dto.company}`,
        replyTo: dto.email,
        html: this.buildLeadEmail(dto, client, devis, recurringOptions),
      });
    } catch (err) {
      this.logger.error(
        `Échec envoi mail simulateur : ${(err as Error).message}`,
      );
    }

    return {
      message: 'Demande enregistrée',
      clientId: client.id,
      devisNumber: devis?.number ?? null,
    };
  }

  private buildLeadEmail(
    dto: SimulatorLeadDto,
    client: { id: string; pack?: { name: string } | null },
    devis: { number: string; totalHT: number } | null,
    recurringOptions: Array<{
      name: string;
      price: number;
      recurringUnit?: string | null;
    }>,
  ): string {
    const rows: Array<{ label: string; value: string }> = [
      { label: 'Société', value: dto.company },
      { label: 'Contact', value: dto.contactName },
      { label: 'Email', value: dto.email },
      ...(dto.phone ? [{ label: 'Téléphone', value: dto.phone }] : []),
      ...(dto.trade ? [{ label: 'Secteur', value: dto.trade }] : []),
      ...(dto.address ? [{ label: 'Adresse', value: dto.address }] : []),
      ...(dto.website ? [{ label: 'Site actuel', value: dto.website }] : []),
    ];

    const simRows: Array<{ label: string; value: string }> = [
      {
        label: 'Mode',
        value: dto.mode === 'pack' ? 'Pack' : 'Sur mesure',
      },
      ...(client.pack
        ? [{ label: 'Pack choisi', value: client.pack.name }]
        : []),
      ...(dto.pages
        ? [{ label: 'Nombre de pages', value: String(dto.pages) }]
        : []),
      ...(dto.optionIds?.length
        ? [{ label: 'Options sélectionnées', value: String(dto.optionIds.length) }]
        : []),
      ...(dto.estimatedTotal !== undefined
        ? [
            {
              label: 'Estimation front',
              value: `${dto.estimatedTotal.toFixed(2)} € HT`,
            },
          ]
        : []),
    ];

    const recurringHtml = recurringOptions.length
      ? `<p style="margin: 16px 0 4px; font-weight: bold; color: #555;">Options récurrentes ajoutées au devis</p>
         <ul style="margin: 0; padding-left: 18px; color: #333;">
           ${recurringOptions
             .map(
               (o) =>
                 `<li>${escapeHtml(o.name)} — ${o.price.toFixed(2)} € / ${escapeHtml(o.recurringUnit || 'mois')}</li>`,
             )
             .join('')}
         </ul>`
      : '';

    const devisBlock = devis
      ? `<div style="background: #eef5ff; padding: 12px 16px; border-radius: 6px; border-left: 4px solid #2d6fff; margin-top: 16px;">
           <p style="margin: 0; color: #333;"><strong>Devis créé :</strong> ${escapeHtml(devis.number)} — ${devis.totalHT.toFixed(2)} € HT (BROUILLON)</p>
         </div>`
      : `<div style="background: #fff5e6; padding: 12px 16px; border-radius: 6px; border-left: 4px solid #e8a900; margin-top: 16px;">
           <p style="margin: 0; color: #333;">Devis automatique non généré — à créer manuellement depuis le back-office.</p>
         </div>`;

    const messageBlock = dto.message
      ? `<div style="background: #f9f9f9; padding: 16px; border-radius: 6px; border-left: 4px solid #2d6fff; margin-top: 16px;">
           <p style="margin: 0 0 4px; font-weight: bold; color: #555;">Message du client</p>
           <p style="margin: 0; color: #333; white-space: pre-wrap;">${escapeHtml(dto.message)}</p>
         </div>`
      : '';

    const renderTable = (entries: Array<{ label: string; value: string }>) =>
      `<table style="width: 100%; border-collapse: collapse;">
         ${entries
           .map(
             (r) => `
           <tr>
             <td style="padding: 6px 12px; font-weight: bold; color: #555; white-space: nowrap; vertical-align: top;">${escapeHtml(r.label)}</td>
             <td style="padding: 6px 12px; color: #333;">${escapeHtml(r.value)}</td>
           </tr>`,
           )
           .join('')}
       </table>`;

    return `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
        <div style="background: #282828; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #fff; margin: 0; font-size: 20px;">Quantum Code</h1>
          <p style="color: #aaa; margin: 4px 0 0; font-size: 12px;">Nouvelle demande issue du simulateur</p>
        </div>
        <div style="padding: 24px; border: 1px solid #eee; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="margin: 0 0 8px; font-weight: bold; color: #555;">Coordonnées client</p>
          ${renderTable(rows)}

          <p style="margin: 16px 0 8px; font-weight: bold; color: #555;">Détails de la simulation</p>
          ${renderTable(simRows)}

          ${recurringHtml}
          ${devisBlock}
          ${messageBlock}

          <p style="margin-top: 20px; color: #777; font-size: 12px;">
            Le client et le devis associé ont été créés automatiquement dans le back-office.
          </p>
        </div>
      </div>
    `;
  }
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
