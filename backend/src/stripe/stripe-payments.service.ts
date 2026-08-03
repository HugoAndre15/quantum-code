import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ActivityType,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  TaskStatus,
  TaskType,
} from "@prisma/client";
import { randomBytes } from "crypto";
import Stripe from "stripe";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";
import { StripeService } from "./stripe.service";

const TOKEN_LIFETIME_DAYS = 60;
const MONEY_EPSILON = 0.005;

@Injectable()
export class StripePaymentsService {
  private readonly logger = new Logger(StripePaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async ensurePaymentLink(factureId: string) {
    const facture = await this.prisma.facture.findUnique({
      where: { id: factureId },
      select: {
        id: true,
        paymentToken: true,
        paymentTokenExpiresAt: true,
      },
    });
    if (!facture) throw new NotFoundException("Facture introuvable");

    const now = new Date();
    let token = facture.paymentToken;
    let expiresAt = facture.paymentTokenExpiresAt;
    if (!token || !expiresAt || expiresAt <= now) {
      token = randomBytes(32).toString("hex");
      expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + TOKEN_LIFETIME_DAYS);
      await this.prisma.facture.update({
        where: { id: facture.id },
        data: { paymentToken: token, paymentTokenExpiresAt: expiresAt },
      });
    }

    return {
      url: `${this.frontendUrl()}/paiement/${token}`,
      expiresAt,
    };
  }

  async getPublicInvoice(token: string) {
    let facture = await this.findByToken(token);
    if (await this.reconcilePaidPendingSessions(facture)) {
      facture = await this.findByToken(token);
    }
    return this.toPublicInvoice(facture);
  }

  async getInvoiceForPdf(token: string) {
    return this.findByToken(token);
  }

  async createCheckout(token: string) {
    const facture = await this.findByToken(token);
    if (facture.status === "ANNULEE") {
      throw new BadRequestException("Cette facture a été annulée");
    }
    if (!facture.client.email) {
      throw new BadRequestException(
        "Aucune adresse email n'est associée à cette facture",
      );
    }

    const remainingAmount = this.remainingAmount(
      facture.totalHT,
      facture.payments,
    );
    if (remainingAmount <= MONEY_EPSILON) {
      throw new BadRequestException(
        "Cette facture est déjà intégralement payée",
      );
    }

    const pendingPayments = facture.payments
      .filter(
        (payment) =>
          payment.status === PaymentStatus.EN_ATTENTE &&
          Boolean(payment.stripeSessionId),
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

    for (const payment of pendingPayments) {
      try {
        const session = await this.stripe.retrieveSession(
          payment.stripeSessionId!,
        );
        if (session.payment_status === "paid") {
          try {
            await this.handleCheckoutCompleted(
              `reconcile:${session.id}`,
              session,
            );
          } catch (error) {
            this.logger.error(
              `Paiement Stripe reçu mais non synchronisé pour ${session.id}: ${(error as Error).message}`,
            );
            throw new BadRequestException(
              "Le paiement a bien été reçu par Stripe, mais sa synchronisation a échoué. Contactez Quantum Code sans effectuer un nouveau paiement.",
            );
          }
          return { paid: true };
        }
        if (session.status === "open" && session.url) {
          return { url: session.url };
        }
        await this.markPaymentFailed(payment.id);
      } catch (error) {
        if (error instanceof BadRequestException) throw error;
        this.logger.warn(
          `Session Stripe ${payment.stripeSessionId} inutilisable: ${(error as Error).message}`,
        );
        await this.markPaymentFailed(payment.id);
      }
    }

    const returnUrl = `${this.frontendUrl()}/paiement/${token}`;
    const session = await this.stripe.createCheckoutSession({
      clientEmail: facture.client.email,
      clientName: facture.client.contactName,
      amountEuros: remainingAmount,
      invoiceNumber: facture.number,
      invoiceType: facture.type,
      metadata: {
        factureId: facture.id,
        clientId: facture.clientId,
      },
      successUrl: `${returnUrl}?status=success`,
      cancelUrl: `${returnUrl}?status=cancelled`,
    });

    try {
      await this.prisma.payment.create({
        data: {
          clientId: facture.clientId,
          factureId: facture.id,
          type:
            facture.type === "ACOMPTE"
              ? PaymentType.ACOMPTE
              : PaymentType.SOLDE,
          amount: remainingAmount,
          method: PaymentMethod.CARTE,
          notes: `Paiement en ligne de ${facture.number}`,
          stripeSessionId: session.id,
          status: PaymentStatus.EN_ATTENTE,
        },
      });
    } catch (error) {
      await this.stripe
        .expireCheckoutSession(session.id)
        .catch(() => undefined);
      throw error;
    }

    if (!session.url) {
      throw new BadRequestException(
        "Stripe n’a pas retourné de lien de paiement",
      );
    }
    return { url: session.url };
  }

  async resetPaymentLink(factureId: string) {
    const facture = await this.prisma.facture.findUnique({
      where: { id: factureId },
      include: { client: true, payments: true },
    });
    if (!facture) throw new NotFoundException("Facture introuvable");
    if (facture.status === "ANNULEE") {
      throw new BadRequestException("Cette facture a été annulée");
    }
    if (
      this.remainingAmount(facture.totalHT, facture.payments) <= MONEY_EPSILON
    ) {
      return { paid: true };
    }

    const reconciled = await this.reconcilePaidPendingSessions(facture);
    if (reconciled) {
      const refreshed = await this.prisma.facture.findUnique({
        where: { id: factureId },
        include: { payments: true },
      });
      if (
        refreshed &&
        this.remainingAmount(refreshed.totalHT, refreshed.payments) <=
          MONEY_EPSILON
      ) {
        return { paid: true };
      }
    }

    await this.invalidatePendingSessions(factureId);
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + TOKEN_LIFETIME_DAYS);
    await this.prisma.facture.update({
      where: { id: factureId },
      data: { paymentToken: token, paymentTokenExpiresAt: expiresAt },
    });
    return {
      url: `${this.frontendUrl()}/paiement/${token}`,
      expiresAt,
      paid: false,
    };
  }

  async handleCheckoutCompleted(
    eventId: string,
    session: Stripe.Checkout.Session,
  ) {
    if (session.payment_status !== "paid") return { processed: false };

    const payment = await this.prisma.payment.findUnique({
      where: { stripeSessionId: session.id },
      include: {
        facture: { include: { client: true } },
      },
    });
    if (!payment?.facture) {
      throw new Error(`Paiement introuvable pour la session ${session.id}`);
    }
    const invoice = payment.facture;

    const expectedCents = Math.round(Number(payment.amount) * 100);
    if (
      session.amount_total !== expectedCents ||
      session.currency?.toLowerCase() !== "eur" ||
      session.metadata?.factureId !== payment.factureId
    ) {
      throw new Error(`Montant ou métadonnées invalides pour ${session.id}`);
    }

    const paidAt = new Date();
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;

    const result = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.payment.updateMany({
        where: { id: payment.id, status: PaymentStatus.EN_ATTENTE },
        data: {
          status: PaymentStatus.PAYE,
          paidAt,
          stripeEventId: eventId,
          stripePaymentIntentId: paymentIntentId || null,
        },
      });
      if (claimed.count === 0) return null;

      const payments = await tx.payment.findMany({
        where: { factureId: payment.factureId },
        select: { amount: true, type: true, status: true },
      });
      const paidAmount = this.paidAmount(payments);
      const isPaid = paidAmount + MONEY_EPSILON >= Number(invoice.totalHT);

      if (isPaid) {
        await tx.facture.update({
          where: { id: payment.factureId! },
          data: { status: "PAYEE", paidAt },
        });
        await tx.client.update({
          where: { id: payment.clientId },
          data: { status: "EN_COURS" },
        });
        await tx.crmTask.updateMany({
          where: {
            factureId: payment.factureId,
            type: TaskType.PAIEMENT,
            status: TaskStatus.A_FAIRE,
          },
          data: { status: TaskStatus.TERMINEE, completedAt: paidAt },
        });
      }

      await tx.crmActivity.create({
        data: {
          type: ActivityType.PAIEMENT,
          title: `Paiement carte de ${Number(payment.amount).toFixed(2)} € reçu`,
          description: `Stripe · ${invoice.number}`,
          clientId: payment.clientId,
          devisId: invoice.devisId,
          factureId: payment.factureId,
          metadata: { stripeSessionId: session.id, stripeEventId: eventId },
        },
      });

      return {
        amount: Number(payment.amount),
        paidAmount,
        remainingAmount: Math.max(0, Number(invoice.totalHT) - paidAmount),
        invoice,
      };
    });

    if (!result) return { processed: false };
    await this.sendPaymentNotifications(result).catch((error) =>
      this.logger.error(
        `Paiement enregistré mais email non envoyé: ${(error as Error).message}`,
      ),
    );
    return { processed: true };
  }

  async handleCheckoutExpired(session: Stripe.Checkout.Session) {
    await this.prisma.payment.updateMany({
      where: {
        stripeSessionId: session.id,
        status: PaymentStatus.EN_ATTENTE,
      },
      data: { status: PaymentStatus.ECHOUE },
    });
  }

  async invalidatePendingSessions(factureId: string) {
    const pending = await this.prisma.payment.findMany({
      where: {
        factureId,
        status: PaymentStatus.EN_ATTENTE,
        stripeSessionId: { not: null },
      },
      select: { id: true, stripeSessionId: true },
    });

    for (const payment of pending) {
      const session = await this.stripe.retrieveSession(
        payment.stripeSessionId!,
      );
      if (session.payment_status === "paid") {
        throw new BadRequestException(
          "Un paiement par carte vient d’être confirmé. Attendez sa synchronisation avant d’enregistrer un paiement manuel.",
        );
      }
      if (session.status === "open") {
        await this.stripe.expireCheckoutSession(payment.stripeSessionId!);
      }
      await this.markPaymentFailed(payment.id);
    }
  }

  private async findByToken(token: string) {
    const facture = await this.prisma.facture.findUnique({
      where: { paymentToken: token },
      include: {
        client: true,
        devis: {
          include: {
            items: { include: { pack: true, serviceOption: true } },
            promoCode: true,
          },
        },
        payments: true,
      },
    });
    if (
      !facture ||
      !facture.paymentTokenExpiresAt ||
      facture.paymentTokenExpiresAt <= new Date()
    ) {
      throw new NotFoundException("Lien de paiement introuvable ou expiré");
    }
    return facture;
  }

  private toPublicInvoice(
    facture: Awaited<ReturnType<typeof this.findByToken>>,
  ) {
    const paidAmount = this.paidAmount(facture.payments);
    return {
      number: facture.number,
      type: facture.type,
      status: facture.status,
      total: Number(facture.totalHT),
      paidAmount,
      remainingAmount: Math.max(0, Number(facture.totalHT) - paidAmount),
      createdAt: facture.createdAt,
      paidAt: facture.paidAt,
      expiresAt: facture.paymentTokenExpiresAt,
      client: {
        company: facture.client.company,
        contactName: facture.client.contactName,
      },
    };
  }

  private paidAmount(
    payments: Array<{
      amount: unknown;
      type: PaymentType;
      status: PaymentStatus;
    }>,
  ) {
    return payments.reduce((sum, payment) => {
      const amount = Number(payment.amount);
      if (payment.type === PaymentType.REMBOURSEMENT) return sum - amount;
      return payment.status === PaymentStatus.PAYE ? sum + amount : sum;
    }, 0);
  }

  private remainingAmount(
    total: number,
    payments: Array<{
      amount: unknown;
      type: PaymentType;
      status: PaymentStatus;
    }>,
  ) {
    return Math.max(0, Number(total) - this.paidAmount(payments));
  }

  private markPaymentFailed(id: string) {
    return this.prisma.payment.updateMany({
      where: { id, status: PaymentStatus.EN_ATTENTE },
      data: { status: PaymentStatus.ECHOUE },
    });
  }

  private async reconcilePaidPendingSessions(
    facture: {
      payments: Array<{
        id: string;
        status: PaymentStatus;
        stripeSessionId: string | null;
      }>;
    },
  ) {
    let reconciled = false;
    const pendingPayments = facture.payments.filter(
      (payment) =>
        payment.status === PaymentStatus.EN_ATTENTE &&
        Boolean(payment.stripeSessionId),
    );

    for (const payment of pendingPayments) {
      try {
        const session = await this.stripe.retrieveSession(
          payment.stripeSessionId!,
        );
        if (session.payment_status === "paid") {
          await this.handleCheckoutCompleted(
            `reconcile:${session.id}`,
            session,
          );
          reconciled = true;
        }
      } catch (error) {
        this.logger.warn(
          `Réconciliation Stripe impossible pour ${payment.stripeSessionId}: ${(error as Error).message}`,
        );
      }
    }
    return reconciled;
  }

  private async sendPaymentNotifications(result: {
    amount: number;
    paidAmount: number;
    remainingAmount: number;
    invoice: {
      id: string;
      number: string;
      totalHT: number;
      client: {
        email: string | null;
        company: string;
        contactName: string;
      };
    };
  }) {
    const data = {
      number: result.invoice.number,
      company: result.invoice.client.company,
      contactName: result.invoice.client.contactName,
      amount: result.amount,
      paidAmount: result.paidAmount,
      remainingAmount: result.remainingAmount,
    };
    if (result.invoice.client.email) {
      await this.mail.sendMail({
        to: result.invoice.client.email,
        subject: `Paiement reçu · ${result.invoice.number}`,
        html: this.mail.buildPaymentReceivedClientEmail(data),
      });
    }
    await this.mail.sendMail({
      to: this.config.get(
        "MAIL_ADMIN_TO",
        this.config.get("MAIL_FROM", "contact@quantum-code.fr"),
      ),
      subject: `Paiement Stripe reçu · ${result.invoice.number}`,
      html: this.mail.buildPaymentReceivedAdminEmail({
        ...data,
        adminUrl: `${this.frontendUrl()}/admin/sales/invoices/${result.invoice.id}`,
      }),
    });
  }

  private frontendUrl() {
    const configured = this.config.get<string>(
      "FRONTEND_URL",
      "http://localhost:3000",
    );
    return configured.split(",")[0].trim().replace(/\/$/, "");
  }
}
