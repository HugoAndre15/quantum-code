import { ConfigService } from "@nestjs/config";
import { PaymentStatus, PaymentType } from "@prisma/client";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";
import { StripePaymentsService } from "./stripe-payments.service";
import { StripeService } from "./stripe.service";

describe("StripePaymentsService", () => {
  const prisma = {
    facture: { findUnique: jest.fn(), update: jest.fn() },
    payment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  } as unknown as PrismaService;
  const stripe = {
    createCheckoutSession: jest.fn(),
    retrieveSession: jest.fn(),
    expireCheckoutSession: jest.fn(),
  } as unknown as StripeService;
  const mail = {
    sendMail: jest.fn(),
    buildPaymentReceivedClientEmail: jest.fn(() => "<html />"),
    buildPaymentReceivedAdminEmail: jest.fn(() => "<html />"),
  } as unknown as MailService;
  const config = {
    get: jest.fn((_key: string, fallback?: string) => fallback),
  } as unknown as ConfigService;
  const service = new StripePaymentsService(prisma, stripe, mail, config);

  beforeEach(() => jest.clearAllMocks());

  it("returns only a safe public summary and computes the remaining amount", async () => {
    (prisma.facture.findUnique as jest.Mock).mockResolvedValue({
      number: "FAC-2026-001",
      type: "ACOMPTE",
      status: "ENVOYEE",
      totalHT: 300,
      createdAt: new Date(),
      paidAt: null,
      paymentTokenExpiresAt: new Date(Date.now() + 60_000),
      client: {
        company: "Atelier",
        contactName: "Camille",
        email: "secret@test.fr",
      },
      devis: { items: [] },
      payments: [
        { amount: 100, type: PaymentType.ACOMPTE, status: PaymentStatus.PAYE },
      ],
    });

    const result = await service.getPublicInvoice("token");
    expect(result.remainingAmount).toBe(200);
    expect(result.client).toEqual({
      company: "Atelier",
      contactName: "Camille",
    });
    expect(result).not.toHaveProperty("paymentToken");
  });

  it("creates Checkout from the amount remaining in the database", async () => {
    (prisma.facture.findUnique as jest.Mock).mockResolvedValue({
      id: "invoice-1",
      clientId: "client-1",
      number: "FAC-2026-001",
      type: "SOLDE",
      status: "ENVOYEE",
      totalHT: 500,
      paymentTokenExpiresAt: new Date(Date.now() + 60_000),
      client: {
        company: "Atelier",
        contactName: "Camille",
        email: "camille@test.fr",
      },
      devis: { items: [] },
      payments: [
        { amount: 125, type: PaymentType.ACOMPTE, status: PaymentStatus.PAYE },
      ],
    });
    (stripe.createCheckoutSession as jest.Mock).mockResolvedValue({
      id: "cs_test",
      url: "https://checkout.stripe.com/test",
    });
    (prisma.payment.create as jest.Mock).mockResolvedValue({ id: "payment-1" });

    const result = await service.createCheckout("token");
    expect(stripe.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ amountEuros: 375 }),
    );
    expect(result.url).toBe("https://checkout.stripe.com/test");
  });

  it("reuses an open Checkout session instead of charging twice", async () => {
    (prisma.facture.findUnique as jest.Mock).mockResolvedValue({
      id: "invoice-1",
      clientId: "client-1",
      number: "FAC-2026-001",
      type: "ACOMPTE",
      status: "ENVOYEE",
      totalHT: 250,
      paymentTokenExpiresAt: new Date(Date.now() + 60_000),
      client: {
        company: "Atelier",
        contactName: "Camille",
        email: "camille@test.fr",
      },
      devis: { items: [] },
      payments: [
        {
          id: "payment-1",
          amount: 250,
          type: PaymentType.ACOMPTE,
          status: PaymentStatus.EN_ATTENTE,
          stripeSessionId: "cs_open",
          createdAt: new Date(),
        },
      ],
    });
    (stripe.retrieveSession as jest.Mock).mockResolvedValue({
      id: "cs_open",
      status: "open",
      payment_status: "unpaid",
      url: "https://checkout.stripe.com/open",
    });

    const result = await service.createCheckout("token");
    expect(result.url).toBe("https://checkout.stripe.com/open");
    expect(stripe.createCheckoutSession).not.toHaveBeenCalled();
  });

  it("reconciles a paid Checkout session instead of leaving it pending", async () => {
    (prisma.facture.findUnique as jest.Mock).mockResolvedValue({
      id: "invoice-1",
      clientId: "client-1",
      number: "FAC-2026-001",
      type: "ACOMPTE",
      status: "ENVOYEE",
      totalHT: 250,
      paymentTokenExpiresAt: new Date(Date.now() + 60_000),
      client: {
        company: "Atelier",
        contactName: "Camille",
        email: "camille@test.fr",
      },
      devis: { items: [] },
      payments: [
        {
          id: "payment-1",
          amount: 250,
          type: PaymentType.ACOMPTE,
          status: PaymentStatus.EN_ATTENTE,
          stripeSessionId: "cs_paid",
          createdAt: new Date(),
        },
      ],
    });
    (stripe.retrieveSession as jest.Mock).mockResolvedValue({
      id: "cs_paid",
      status: "complete",
      payment_status: "paid",
    });
    jest
      .spyOn(service, "handleCheckoutCompleted")
      .mockResolvedValueOnce({ processed: true });

    await expect(service.createCheckout("token")).resolves.toEqual({
      paid: true,
    });
    expect(service.handleCheckoutCompleted).toHaveBeenCalledWith(
      "reconcile:cs_paid",
      expect.objectContaining({ id: "cs_paid" }),
    );
    expect(stripe.createCheckoutSession).not.toHaveBeenCalled();
  });

  it("expires an unpaid session and rotates the public payment link", async () => {
    (prisma.facture.findUnique as jest.Mock).mockResolvedValue({
      id: "invoice-1",
      status: "ENVOYEE",
      totalHT: 250,
      client: { email: "camille@test.fr" },
      payments: [
        {
          id: "payment-1",
          amount: 250,
          type: PaymentType.ACOMPTE,
          status: PaymentStatus.EN_ATTENTE,
          stripeSessionId: "cs_open",
        },
      ],
    });
    (prisma.payment.findMany as jest.Mock).mockResolvedValue([
      { id: "payment-1", stripeSessionId: "cs_open" },
    ]);
    (stripe.retrieveSession as jest.Mock).mockResolvedValue({
      id: "cs_open",
      status: "open",
      payment_status: "unpaid",
    });
    (stripe.expireCheckoutSession as jest.Mock).mockResolvedValue({});
    (prisma.payment.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.facture.update as jest.Mock).mockResolvedValue({});

    const result = await service.resetPaymentLink("invoice-1");
    expect(stripe.expireCheckoutSession).toHaveBeenCalledWith("cs_open");
    expect(prisma.facture.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "invoice-1" },
        data: expect.objectContaining({ paymentToken: expect.any(String) }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({ paid: false, url: expect.stringContaining("/paiement/") }),
    );
  });

  it("refuses a manual payment when Stripe already reports the card as paid", async () => {
    (prisma.payment.findMany as jest.Mock).mockResolvedValue([
      { id: "payment-1", stripeSessionId: "cs_paid" },
    ]);
    (stripe.retrieveSession as jest.Mock).mockResolvedValue({
      payment_status: "paid",
      status: "complete",
    });

    await expect(
      service.invalidatePendingSessions("invoice-1"),
    ).rejects.toThrow("Un paiement par carte vient d’être confirmé");
  });
});
