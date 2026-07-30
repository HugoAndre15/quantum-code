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
      company: devis.client.company,
      total: devis.totalHT,
    });

    await this.mailService.sendDocument({
      to: devis.client.email,
      subject: `Devis ${devis.number} — Quantum Code`,
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

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#282828;padding:24px;border-radius:8px 8px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:20px;">Quantum Code</h1>
          <p style="color:#aaa;margin:4px 0 0;font-size:12px;">Développement Web & Applications</p>
        </div>
        <div style="padding:24px;border:1px solid #eee;border-top:none;border-radius:0 0 8px 8px;">
          <p style="color:#333;">Bonjour ${devis.client.contactName},</p>
          <p style="color:#333;">Votre devis <strong>${devis.number}</strong> d'un montant de <strong>${devis.totalHT.toFixed(2)} € HT</strong> est prêt.</p>
          <p style="color:#333;">Vous pouvez le consulter et l'accepter directement en cliquant sur le bouton ci-dessous :</p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${acceptUrl}" style="background:#2d6fff;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px;">
              Consulter et accepter le devis
            </a>
          </div>
          <p style="color:#777;font-size:12px;">Ce lien est valable 30 jours. Si vous avez des questions, répondez simplement à cet email.</p>
          <p style="color:#333;margin-top:24px;">Cordialement,<br/><strong>Quantum Code</strong></p>
        </div>
      </div>
    `;

    await this.mailService.sendDocument({
      to: devis.client.email!,
      subject: `Votre devis ${devis.number} est prêt — Quantum Code`,
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
  acceptByToken(@Param('token') token: string) {
    return this.devisService.acceptByToken(token);
  }
}
