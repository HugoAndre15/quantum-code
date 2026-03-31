import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Res,
  Post,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { FacturesService } from './factures.service';
import { UpdateFactureDto } from './dto/facture.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { PdfService } from '../pdf/pdf.service';
import { MailService } from '../mail/mail.service';

@UseGuards(JwtAuthGuard)
@Controller('factures')
export class FacturesController {
  constructor(
    private facturesService: FacturesService,
    private pdfService: PdfService,
    private mailService: MailService,
  ) {}

  @Get()
  findAll() {
    return this.facturesService.findAll();
  }

  @Get('stats')
  getStats() {
    return this.facturesService.getStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.facturesService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFactureDto) {
    return this.facturesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.facturesService.remove(id);
  }

  @Get(':id/pdf')
  async downloadPdf(@Param('id') id: string, @Res() res: Response) {
    const facture = await this.facturesService.findOne(id);
    const items = facture.devis?.items || [];

    const pdf = await this.pdfService.generate({
      type: 'facture',
      number: facture.number,
      date: facture.createdAt,
      client: facture.client,
      items: items.map(i => ({
        label: i.label,
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        recurring: i.recurring,
        recurringUnit: i.recurringUnit,
      })),
      totalHT: facture.totalHT,
      notes: facture.notes,
      paidAt: facture.paidAt,
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${facture.number}.pdf"`,
      'Content-Length': pdf.length,
    });
    res.end(pdf);
  }

  @Post(':id/send-email')
  async sendByEmail(@Param('id') id: string) {
    const facture = await this.facturesService.findOne(id);
    const items = facture.devis?.items || [];

    if (!facture.client.email) {
      throw new BadRequestException('Le client n\'a pas d\'adresse email');
    }

    const pdf = await this.pdfService.generate({
      type: 'facture',
      number: facture.number,
      date: facture.createdAt,
      client: facture.client,
      items: items.map(i => ({
        label: i.label,
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        recurring: i.recurring,
        recurringUnit: i.recurringUnit,
      })),
      totalHT: facture.totalHT,
      notes: facture.notes,
      paidAt: facture.paidAt,
    });

    const html = this.mailService.buildFactureEmail({
      number: facture.number,
      company: facture.client.company,
      total: facture.totalHT,
    });

    await this.mailService.sendDocument({
      to: facture.client.email,
      subject: `Facture ${facture.number} — Quantum Code`,
      html,
      pdf,
      filename: `${facture.number}.pdf`,
    });

    // Auto-update status to ENVOYEE if still BROUILLON
    if (facture.status === 'BROUILLON') {
      await this.facturesService.update(id, { status: 'ENVOYEE' });
    }

    return { message: 'Facture envoyée par email' };
  }
}
