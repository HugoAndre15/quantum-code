import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";

export type CheckoutParams = {
  clientEmail: string;
  clientName: string;
  amountEuros: number;
  invoiceNumber: string;
  invoiceType: "ACOMPTE" | "SOLDE" | "COMPLETE";
  metadata: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
};

export type SubscriptionParams = {
  customerId: string;
  priceId: string;
  metadata?: Record<string, string>;
};

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);

  constructor(private readonly config: ConfigService) {
    const secretKey = this.config.get<string>("STRIPE_SECRET_KEY");
    if (!secretKey) {
      this.logger.warn(
        "STRIPE_SECRET_KEY is not set — Stripe features are disabled",
      );
    }
    this.stripe = new Stripe(secretKey ?? "sk_test_placeholder", {
      apiVersion: "2025-02-24.acacia",
    });
  }

  async createCheckoutSession(
    params: CheckoutParams,
  ): Promise<Stripe.Checkout.Session> {
    const {
      clientEmail,
      clientName,
      amountEuros,
      invoiceNumber,
      invoiceType,
      metadata,
      successUrl,
      cancelUrl,
    } = params;
    const label =
      invoiceType === "ACOMPTE"
        ? "Acompte"
        : invoiceType === "SOLDE"
          ? "Solde du projet"
          : "Facture";

    return this.stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: clientEmail,
      locale: "fr",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `${label} · ${invoiceNumber}`,
              description: `Quantum Code — ${clientName}`,
            },
            unit_amount: Math.round(amountEuros * 100),
          },
          quantity: 1,
        },
      ],
      metadata,
      payment_intent_data: { metadata },
      success_url: successUrl,
      cancel_url: cancelUrl,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });
  }

  async createCustomer(email: string, name: string): Promise<Stripe.Customer> {
    return this.stripe.customers.create({ email, name });
  }

  async createSubscription(
    params: SubscriptionParams,
  ): Promise<Stripe.Subscription> {
    const { customerId, priceId, metadata } = params;
    return this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
      metadata: metadata ?? {},
    });
  }

  async createRecurringPrice(
    monthlyAmountEuros: number,
    label: string,
  ): Promise<Stripe.Price> {
    return this.stripe.prices.create({
      unit_amount: Math.round(monthlyAmountEuros * 100),
      currency: "eur",
      recurring: { interval: "month" },
      product_data: { name: `Quantum Code — ${label}` },
    });
  }

  async cancelSubscription(
    stripeSubscriptionId: string,
  ): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.cancel(stripeSubscriptionId);
  }

  constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    const webhookSecret = this.config.get<string>("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not set");
    }
    return this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );
  }

  async retrieveSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    return this.stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });
  }

  async expireCheckoutSession(
    sessionId: string,
  ): Promise<Stripe.Checkout.Session> {
    return this.stripe.checkout.sessions.expire(sessionId);
  }
}
