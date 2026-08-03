import { Module } from "@nestjs/common";
import { MailModule } from "../mail/mail.module";
import { StripeController } from "./stripe.controller";
import { StripePaymentsService } from "./stripe-payments.service";
import { StripeService } from "./stripe.service";

@Module({
  imports: [MailModule],
  controllers: [StripeController],
  providers: [StripeService, StripePaymentsService],
  exports: [StripeService, StripePaymentsService],
})
export class StripeModule {}
