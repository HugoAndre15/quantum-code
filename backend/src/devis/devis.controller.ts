import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Res,
  UseGuards,
  BadRequestException,
  Logger,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { DevisService } from './devis.service';
import { ContractOffer } from './contract';
import { renderContractPdf } from './contract-pdf';
import { CreateDevisDto, UpdateDevisDto, SignContractDto } from './dto/devis.dto';
import { JwtAuthGuard, RoleGuard } from '../auth/guards/jwt.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { PdfService } from '../pdf/pdf.service';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';

@UseGuards(JwtAuthGuard, RoleGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('devis')
export class DevisController {
  private readonly logger = new Logger(DevisController.name);

  constructor(
    private devisService: DevisService,
    private pdfService: PdfService,
    private mailService: MailService,
    private config: ConfigService,
  ) {}

  private frontendUrl() {
    return this.config.get<string>('FRONTEND_URL', 'http://localhost:3000')
      .split(',')[0].trim().replace(/\/$/, '');
  }

  private async quotePdf(devis: Pick<Awaited<ReturnType<DevisService['findAcceptanceDocument']>>,
    'id' | 'number' | 'createdAt' | 'validUntil' | 'client' | 'items' | 'totalHT' | 'notes' | 'discountAmount' | 'promoCode' | 'contractOffer' | 'status'>) {
    if (devis.contractOffer) {
      if (devis.status === 'ACCEPTE') return this.devisService.archivedPdf(devis.id);
      return renderContractPdf(devis.contractOffer);
    }
    // Historical quotes keep their original PDF and are never labelled as signed.
    return this.pdfService.generate({
      type: 'devis', number: devis.number, date: devis.createdAt, validUntil: devis.validUntil,
      client: devis.client, items: devis.items, totalHT: devis.totalHT, notes: devis.notes,
      discountAmount: devis.discountAmount, promoCode: devis.promoCode?.code,
    });
  }

  @Get()
  findAll() {
    return this.devisService.findAll();
  }

  @Get('stats')
  getStats() {
    return this.devisService.getStats();
  }

  @Public()
  @Header('Cache-Control', 'private, no-store')
  @Get('accept/:token')
  getAcceptancePreview(@Param('token') token: string) {
    return this.devisService.getAcceptancePreview(token);
  }

  @Public()
  @Get('accept/:token/pdf')
  async downloadAcceptancePdf(
    @Param('token') token: string,
    @Res() res: Response,
  ) {
    const devis = await this.devisService.findAcceptanceDocument(token);
    if (
      devis.status !== 'ACCEPTE' &&
      devis.acceptTokenExpiresAt &&
      devis.acceptTokenExpiresAt < new Date()
    ) {
      throw new BadRequestException(
        'Ce lien a expiré. Contactez-nous pour recevoir un nouveau devis.',
      );
    }

    const pdf = await this.quotePdf(devis);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${devis.number}.pdf"`,
      'Content-Length': pdf.length,
      'Cache-Control': 'private, no-store',
    });
    res.end(pdf);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.devisService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateDevisDto) {
    return this.devisService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDevisDto) {
    return this.devisService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.devisService.remove(id);
  }

  @Post(':id/facture')
  transformToFacture(@Param('id') id: string) {
    return this.devisService.transformToFacture(id);
  }

  @Get(':id/pdf')
  async downloadPdf(@Param('id') id: string, @Res() res: Response) {
    const devis = await this.devisService.findOne(id);
    const pdf = await this.quotePdf(devis);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${devis.number}.pdf"`,
      'Cache-Control': 'private, no-store',
      'Content-Length': pdf.length,
    });
    res.end(pdf);
  }

  @Post(':id/send-email')
  async sendByEmail(@Param('id') id: string) {
    const devis = await this.devisService.findOne(id);
    const frozen: ContractOffer | null = devis.contractOffer ? JSON.parse(devis.contractOffer) : null;
    const client = frozen?.client ?? devis.client;
    if (!client.email) {
      throw new BadRequestException("Le client n'a pas d'adresse email");
    }

    const pdf = await this.quotePdf(devis);

    const html = this.mailService.buildDevisEmail({
      number: devis.number,
      contactName: client.contactName,
      company: client.company,
      total: frozen?.totalHT ?? devis.totalHT,
      validUntil: frozen ? new Date(frozen.validUntil) : devis.validUntil,
      discountAmount: frozen?.discountAmount ?? devis.discountAmount,
      promoCode: frozen ? frozen.promoCode : devis.promoCode?.code,
      items: frozen?.items ?? devis.items,
    });

    await this.mailService.sendDocument({
      to: client.email,
      subject: `${client.contactName}, voici votre ${devis.signature ? 'contrat signé' : 'devis'} ${devis.number}`,
      html,
      pdf,
      filename: `${devis.number}.pdf`,
    });

    // Auto-update status to ENVOYE if still BROUILLON
    if (devis.status === 'BROUILLON') {
      await this.devisService.update(id, { status: 'ENVOYE' });
    }

    return { message: 'Devis envoyé par email' };
  }

  /**
   * POST /devis/:id/send-accept-token  (admin)
   * Génère un token d'acceptation et envoie un email au client avec le lien.
   */
  @Post(':id/send-accept-token')
  async sendAcceptToken(@Param('id') id: string) {
    const devis = await this.devisService.generateAcceptToken(id, this.config.get<string>('CONTRACT_ISSUER_ADDRESS', ''));
    const frontendUrl = this.frontendUrl();
    const acceptUrl = `${frontendUrl}/devis/accept/${devis.acceptToken}`;
    const offer: ContractOffer = JSON.parse(devis.contractOffer!);
    const pdf = await this.quotePdf(devis);
    const html = this.mailService.buildDevisEmail({
      number: offer.number,
      contactName: offer.client.contactName,
      company: offer.client.company,
      total: offer.totalHT,
      validUntil: new Date(offer.validUntil),
      discountAmount: offer.discountAmount,
      promoCode: offer.promoCode,
      items: offer.items,
      acceptUrl,
    });

    await this.mailService.sendDocument({
      to: offer.client.email,
      subject: `${devis.client.contactName}, votre contrat est prêt à signer`,
      html,
      pdf,
      filename: `${devis.number}.pdf`,
    });

    await this.devisService.markInvitationSent(id, devis.acceptToken!);
    return { message: 'Invitation à signer transmise au service email', devisId: id };
  }

  /**
   * POST /devis/accept/:token  (PUBLIC — le client clique depuis son email)
   */
  @Public()
  @Post('accept/:token')
  async acceptByToken(@Param('token') token: string, @Body() signature: SignContractDto) {
    const result = await this.devisService.acceptByToken(token, signature);
    if (result.alreadyAccepted) return result;

    const devis = await this.devisService.findOne(result.devisId);
    const frontendUrl = this.frontendUrl();
    const adminEmail = this.config.get(
      'MAIL_ADMIN_TO',
      this.config.get('MAIL_FROM', 'contact@quantum-code.fr'),
    );
    const notifications: Promise<void>[] = [
      this.mailService.sendMail({
        to: adminEmail,
        subject: `✅ ${devis.client.company} a accepté ${devis.number}`,
        html: this.mailService.buildQuoteAcceptedAdminEmail({
          number: devis.number,
          contactName: devis.client.contactName,
          company: devis.client.company,
          total: devis.totalHT,
          adminUrl: `${frontendUrl}/admin/sales/quotes/${devis.id}`,
        }),
      }),
    ];

    const offer: ContractOffer = JSON.parse(devis.contractOffer!);
    if (offer.client.email) {
      notifications.push(
        this.devisService.archivedPdf(devis.id).then((pdf) => this.mailService.sendDocument({
          pdf, filename: `${devis.number}-signe.pdf`,
          to: offer.client.email,
          subject: `Votre contrat signé — ${devis.number}`,
          html: this.mailService.buildQuoteAcceptedClientEmail({
            number: devis.number,
            contactName: offer.client.contactName,
            company: offer.client.company,
            total: offer.totalHT,
            subscriptions: offer.items.filter((item) => item.recurring),
          }),
        })),
      );
    }

    const notificationResults = await Promise.allSettled(notifications);
    for (const notification of notificationResults) {
      if (notification.status === 'rejected') {
        this.logger.error(
          `Échec de la confirmation d'acceptation : ${notification.reason instanceof Error ? notification.reason.message : String(notification.reason)}`,
        );
      }
    }

    return result;
  }
}
