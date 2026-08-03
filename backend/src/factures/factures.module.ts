import { Module } from "@nestjs/common";
import { MailModule } from "../mail/mail.module";
import { PdfModule } from "../pdf/pdf.module";
import { StripeModule } from "../stripe/stripe.module";
import { FacturesController } from "./factures.controller";
import { FacturesService } from "./factures.service";

@Module({
  imports: [PdfModule, MailModule, StripeModule],
  controllers: [FacturesController],
  providers: [FacturesService],
  exports: [FacturesService],
})
export class FacturesModule {}
