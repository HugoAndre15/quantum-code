import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  RawBodyRequest,
  Req,
} from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { Request } from "express";
import Stripe from "stripe";
import { Public } from "../auth/decorators/public.decorator";
import { StripePaymentsService } from "./stripe-payments.service";
import { StripeService } from "./stripe.service";

@Controller("stripe")
@SkipThrottle()
export class StripeController {
  private readonly logger = new Logger(StripeController.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly payments: StripePaymentsService,
  ) {}

  @Public()
  @Post("webhook")
  @HttpCode(200)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("stripe-signature") signature: string,
  ): Promise<{ received: boolean }> {
    if (!signature) {
      throw new BadRequestException("Missing stripe-signature header");
    }
    if (!req.rawBody) {
      throw new BadRequestException(
        "Missing raw body — ensure rawBody: true in NestFactory",
      );
    }

    let event: Stripe.Event;
    try {
      event = this.stripeService.constructWebhookEvent(req.rawBody, signature);
    } catch (error) {
      this.logger.error(
        `Webhook signature verification failed: ${(error as Error).message}`,
      );
      throw new BadRequestException("Invalid Stripe webhook signature");
    }

    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await this.payments.handleCheckoutCompleted(
          event.id,
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed":
        await this.payments.handleCheckoutExpired(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      default:
        this.logger.debug(`Unhandled Stripe event: ${event.type}`);
    }

    return { received: true };
  }
}
