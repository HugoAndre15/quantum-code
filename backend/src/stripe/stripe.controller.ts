import {
  Controller,
  Post,
  Headers,
  RawBodyRequest,
  Req,
  HttpCode,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Request } from 'express';
import Stripe from 'stripe';
import { StripeService } from './stripe.service';

@Controller('stripe')
@SkipThrottle()
export class StripeController {
  private readonly logger = new Logger(StripeController.name);

  constructor(private readonly stripeService: StripeService) {}

  /**
   * POST /api/stripe/webhook
   * Stripe sends raw body — MUST NOT go through JSON body parser.
   * Signature is verified before processing any event.
   */
  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') sig: string,
  ): Promise<{ received: boolean }> {
    if (!sig) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Missing raw body — ensure rawBody: true in NestFactory');
    }

    let event: Stripe.Event;
    try {
      event = this.stripeService.constructWebhookEvent(rawBody, sig);
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${(err as Error).message}`);
      throw new BadRequestException('Invalid Stripe webhook signature');
    }

    this.logger.log(`Stripe event received: ${event.type} [${event.id}]`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      default:
        this.logger.debug(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  // ─── Handlers (implémentés en Phase 2c/2d) ──────────────

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    this.logger.log(
      `checkout.session.completed — session ${session.id} | type=${session.metadata?.type} | client=${session.customer_email}`,
    );
    // TODO Phase 2c:
    //   1. Trouver le Payment via stripeSessionId
    //   2. Marquer Payment PAYE, paidAt = now()
    //   3. Si type === ACOMPTE → créer ClientProject EN_ATTENTE + envoyer email confirmation + PDF facture acompte
    //   4. Si type === SOLDE → marquer Facture PAYEE + envoyer email facture finale + déclencher email demande d'avis
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    this.logger.log(
      `invoice.paid — subscription ${invoice.subscription} | customer ${invoice.customer}`,
    );
    // TODO Phase 2d:
    //   1. Trouver Subscription via stripeSubscriptionId
    //   2. Mettre à jour nextBillingDate
    //   3. Envoyer reçu email mensuel au client
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    this.logger.log(`customer.subscription.deleted — subscription ${subscription.id}`);
    // TODO Phase 2d:
    //   1. Trouver Subscription via stripeSubscriptionId
    //   2. Marquer status = RESILIE, canceledAt = now()
  }
}
