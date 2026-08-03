import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { Public } from "../auth/decorators/public.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard, RoleGuard } from "../auth/guards/jwt.guard";
import { MailService } from "../mail/mail.service";
import { PdfService } from "../pdf/pdf.service";
import { StripePaymentsService } from "../stripe/stripe-payments.service";
import { UpdateFactureDto } from "./dto/facture.dto";
import { FacturesService } from "./factures.service";

@UseGuards(JwtAuthGuard, RoleGuard)
@Roles("ADMIN", "SUPER_ADMIN")
@Controller("factures")
export class FacturesController {
  constructor(
    private readonly facturesService: FacturesService,
    private readonly pdfService: PdfService,
    private readonly mailService: MailService,
    private readonly stripePayments: StripePaymentsService,
  ) {}

  @Get()
  findAll() {
    return this.facturesService.findAll();
  }

  @Get("stats")
  getStats() {
    return this.facturesService.getStats();
  }

  @Public()
  @Get("payment/:token")
  getPublicInvoice(@Param("token") token: string) {
    return this.stripePayments.getPublicInvoice(token);
  }

  @Public()
  @Post("payment/:token/checkout")
  createCheckout(@Param("token") token: string) {
    return this.stripePayments.createCheckout(token);
  }

  @Public()
  @Get("payment/:token/pdf")
  async downloadPublicPdf(@Param("token") token: string, @Res() res: Response) {
    const facture = await this.stripePayments.getInvoiceForPdf(token);
    return this.sendPdf(facture, res);
  }

  @Post(":id/payment-link")
  createPaymentLink(@Param("id") id: string) {
    return this.stripePayments.ensurePaymentLink(id);
  }

  @Post(":id/payment-link/reset")
  resetPaymentLink(@Param("id") id: string) {
    return this.stripePayments.resetPaymentLink(id);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.facturesService.findOne(id);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: UpdateFactureDto) {
    return this.facturesService.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.facturesService.remove(id);
  }

  @Get(":id/pdf")
  async downloadPdf(@Param("id") id: string, @Res() res: Response) {
    const facture = await this.facturesService.findOne(id);
    return this.sendPdf(facture, res);
  }

  @Post(":id/send-email")
  async sendByEmail(@Param("id") id: string) {
    const facture = await this.facturesService.findOne(id);
    if (!facture.client.email) {
      throw new BadRequestException("Le client n'a pas d'adresse email");
    }

    const [pdf, paymentLink] = await Promise.all([
      this.generatePdf(facture),
      this.stripePayments.ensurePaymentLink(id),
    ]);
    const html = this.mailService.buildFactureEmail({
      number: facture.number,
      contactName: facture.client.contactName,
      company: facture.client.company,
      total: facture.totalHT,
      paidAmount: facture.paidAmount,
      remainingAmount: facture.remainingAmount,
      paymentUrl:
        facture.status !== "ANNULEE" && facture.remainingAmount > 0
          ? paymentLink.url
          : undefined,
    });

    await this.mailService.sendDocument({
      to: facture.client.email,
      subject: `${facture.client.contactName}, votre facture ${facture.number}`,
      html,
      pdf,
      filename: `${facture.number}.pdf`,
    });

    if (facture.status === "BROUILLON") {
      await this.facturesService.update(id, { status: "ENVOYEE" });
    }
    return {
      message: "Facture envoyée par email",
      paymentUrl: paymentLink.url,
    };
  }

  private async sendPdf(facture: any, res: Response) {
    const pdf = await this.generatePdf(facture);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${facture.number}.pdf"`,
      "Content-Length": pdf.length,
    });
    res.end(pdf);
  }

  private generatePdf(facture: any) {
    const items =
      facture.type === "COMPLETE"
        ? facture.devis?.items || []
        : [
            {
              label:
                facture.type === "ACOMPTE"
                  ? `Acompte de ${facture.percentage || 0}%`
                  : "Solde du projet",
              description: `Selon devis ${facture.devis.number}`,
              quantity: 1,
              unitPrice: facture.totalHT,
              recurring: false,
              recurringUnit: null,
            },
          ];

    return this.pdfService.generate({
      type: "facture",
      number: facture.number,
      date: facture.createdAt,
      client: facture.client,
      items: items.map((item: any) => ({
        label: item.label,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        recurring: item.recurring,
        recurringUnit: item.recurringUnit,
      })),
      totalHT: facture.totalHT,
      notes: facture.notes,
      paidAt: facture.paidAt,
      discountAmount:
        facture.type === "COMPLETE" ? facture.devis?.discountAmount : undefined,
      promoCode:
        facture.type === "COMPLETE"
          ? facture.devis?.promoCode?.code
          : undefined,
    });
  }
}
