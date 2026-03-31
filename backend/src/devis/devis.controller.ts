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
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { PdfService } from '../pdf/pdf.service';
import { MailService } from '../mail/mail.service';

@UseGuards(JwtAuthGuard)
@Controller('devis')
export class DevisController {
  constructor(
    private devisService: DevisService,
    private pdfService: PdfService,
    private mailService: MailService,
  ) {}

  @Get()
  findAll() {
    return this.devisService.findAll();
  }

  @Get('stats')
  getStats() {
    return this.devisService.getStats();
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
      items: devis.items.map(i => ({
        label: i.label,
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        recurring: i.recurring,
        recurringUnit: i.recurringUnit,
      })),
      totalHT: devis.totalHT,
      notes: devis.notes,
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
      throw new BadRequestException('Le client n\'a pas d\'adresse email');
    }

    const pdf = await this.pdfService.generate({
      type: 'devis',
      number: devis.number,
      date: devis.createdAt,
      validUntil: devis.validUntil,
      client: devis.client,
      items: devis.items.map(i => ({
        label: i.label,
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        recurring: i.recurring,
        recurringUnit: i.recurringUnit,
      })),
      totalHT: devis.totalHT,
      notes: devis.notes,
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
}
