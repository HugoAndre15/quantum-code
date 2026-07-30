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
} from '@nestjs/common';
import { Response } from 'express';
import { DevisService } from './devis.service';
import { CreateDevisDto, UpdateDevisDto } from './dto/devis.dto';
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

  @Get()
  findAll() {
    return this.devisService.findAll();
  }

  @Get('stats')
  getStats() {
    return this.devisService.getStats();
  }

  @Public()
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

    const pdf = await this.pdfService.generate({
      type: 'devis',
      number: devis.number,
      date: devis.createdAt,
      validUntil: devis.validUntil,
      client: devis.client,
      items: devis.items.map((item) => ({
        label: item.label,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        recurring: item.recurring,
        recurringUnit: item.recurringUnit,
      })),
      totalHT: devis.totalHT,
      notes: devis.notes,
      discountAmount: devis.discountAmount,
      promoCode: devis.promoCode?.code,
    });

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
    const pdf = await this.pdfService.generate({
      type: 'devis',
      number: devis.number,
      date: devis.createdAt,
      validUntil: devis.validUntil,
      client: devis.client,
      items: devis.items.map((i) => ({
        label: i.label,
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        recurring: i.recurring,
        recurringUnit: i.recurringUnit,
      })),
      totalHT: devis.totalHT,
      notes: devis.notes,
      discountAmount: devis.discountAmount,
      promoCode: devis.promoCode?.code,
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${devis.number}.pdf"`,
      'Content-Length': pdf.length,
    });
    res.end(pdf);
  }

  @Post(':id/send-email')
  async sendByEmail(@Param('id') id: string) {
    const devis = await this.devisService.findOne(id);

    if (!devis.client.email) {
      throw new BadRequestException("Le client n'a pas d'adresse email");
    }

    const pdf = await this.pdfService.generate({
      type: 'devis',
      number: devis.number,
      date: devis.createdAt,
      validUntil: devis.validUntil,
      client: devis.client,
      items: devis.items.map((i) => ({
        label: i.label,
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        recurring: i.recurring,
        recurringUnit: i.recurringUnit,
      })),
      totalHT: devis.totalHT,
      notes: devis.notes,
      discountAmount: devis.discountAmount,
      promoCode: devis.promoCode?.code,
    });

    const html = this.mailService.buildDevisEmail({
      number: devis.number,
      contactName: devis.client.contactName,
      company: devis.client.company,
      total: devis.totalHT,
      validUntil: devis.validUntil,
      discountAmount: devis.discountAmount,
      promoCode: devis.promoCode?.code,
      items: devis.items,
    });

    await this.mailService.sendDocument({
      to: devis.client.email,
      subject: `${devis.client.contactName}, voici votre devis ${devis.number}`,
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
    const devis = await this.devisService.generateAcceptToken(id);
    const frontendUrl = this.config.get(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const acceptUrl = `${frontendUrl}/devis/accept/${devis.acceptToken}`;
    const pdf = await this.pdfService.generate({
      type: 'devis',
      number: devis.number,
      date: devis.createdAt,
      validUntil: devis.validUntil,
      client: devis.client,
      items: devis.items.map((item) => ({
        label: item.label,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        recurring: item.recurring,
        recurringUnit: item.recurringUnit,
      })),
      totalHT: devis.totalHT,
      notes: devis.notes,
      discountAmount: devis.discountAmount,
      promoCode: devis.promoCode?.code,
    });

    const html = this.mailService.buildDevisEmail({
      number: devis.number,
      contactName: devis.client.contactName,
      company: devis.client.company,
      total: devis.totalHT,
      validUntil: devis.validUntil,
      discountAmount: devis.discountAmount,
      promoCode: devis.promoCode?.code,
      items: devis.items,
      acceptUrl,
    });

    await this.mailService.sendDocument({
      to: devis.client.email!,
      subject: `${devis.client.contactName}, votre proposition est prête`,
      html,
      pdf,
      filename: `${devis.number}.pdf`,
    });

    return { message: "Devis envoyé avec lien d'acceptation", devisId: id };
  }

  /**
   * POST /devis/accept/:token  (PUBLIC — le client clique depuis son email)
   */
  @Public()
  @Post('accept/:token')
  async acceptByToken(@Param('token') token: string) {
    const result = await this.devisService.acceptByToken(token);
    if (result.alreadyAccepted) return result;

    const devis = await this.devisService.findOne(result.devisId);
    const frontendUrl = this.config.get(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
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

    if (devis.client.email) {
      notifications.push(
        this.mailService.sendMail({
          to: devis.client.email,
          subject: `Accord bien reçu — devis ${devis.number}`,
          html: this.mailService.buildQuoteAcceptedClientEmail({
            number: devis.number,
            contactName: devis.client.contactName,
            company: devis.client.company,
            total: devis.totalHT,
            subscriptions: devis.items.filter((item) => item.recurring),
          }),
        }),
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
