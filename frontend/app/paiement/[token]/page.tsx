"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import styles from "./payment.module.css";

type Invoice = {
  number: string;
  type: "ACOMPTE" | "SOLDE" | "COMPLETE";
  status: "BROUILLON" | "ENVOYEE" | "PAYEE" | "ANNULEE";
  total: number;
  paidAmount: number;
  remainingAmount: number;
  createdAt: string;
  paidAt?: string | null;
  expiresAt: string;
  client: { company: string; contactName: string };
};

const API = "/api";

export default function PaymentPage({ params }: { params: { token: string } }) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState("");
  const [returnStatus, setReturnStatus] = useState<
    "success" | "cancelled" | ""
  >("");

  const load = useCallback(async () => {
    const response = await fetch(`${API}/factures/payment/${params.token}`, {
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.message || "Ce lien de paiement est invalide ou a expiré.");
      setLoading(false);
      return null;
    }
    setInvoice(data);
    setLoading(false);
    return data as Invoice;
  }, [params.token]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const status = query.get("status");
    if (status === "success" || status === "cancelled") setReturnStatus(status);
    load();
  }, [load]);

  useEffect(() => {
    if (returnStatus !== "success" || invoice?.status === "PAYEE") return;
    let attempts = 0;
    const interval = window.setInterval(async () => {
      attempts += 1;
      const fresh = await load();
      if (fresh?.status === "PAYEE" || attempts >= 10) {
        window.clearInterval(interval);
      }
    }, 1500);
    return () => window.clearInterval(interval);
  }, [invoice?.status, load, returnStatus]);

  async function startCheckout() {
    setRedirecting(true);
    setError("");
    const response = await fetch(
      `${API}/factures/payment/${params.token}/checkout`,
      { method: "POST" },
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.url) {
      setError(data.message || "Le paiement ne peut pas être démarré.");
      setRedirecting(false);
      await load();
      return;
    }
    window.location.assign(data.url);
  }

  const paid = invoice?.status === "PAYEE" || invoice?.remainingAmount === 0;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link
            href="/"
            className={styles.brand}
            aria-label="Accueil Quantum Code"
          >
            <span className={styles.mark}>Q</span>
            <span>
              Quantum <strong>Code</strong>
            </span>
          </Link>
          <span className={styles.secure}>Paiement sécurisé par Stripe</span>
        </header>

        {loading ? (
          <section className={styles.state}>Chargement de la facture…</section>
        ) : error && !invoice ? (
          <section className={styles.state}>
            <span className={styles.eyebrow}>Lien indisponible</span>
            <h1>Impossible d’ouvrir cette facture.</h1>
            <p>{error}</p>
            <a
              href="mailto:contact@quantum-code.fr"
              className={styles.secondaryButton}
            >
              Contacter Quantum Code
            </a>
          </section>
        ) : invoice ? (
          <div className={styles.content}>
            <section className={styles.intro}>
              <span className={styles.eyebrow}>
                {paid ? "Paiement confirmé" : "Facture à régler"}
              </span>
              <h1>
                {paid
                  ? "Merci, tout est réglé."
                  : "Finalisons cette étape simplement."}
              </h1>
              <p>
                {paid
                  ? `Le paiement de la facture ${invoice.number} pour ${invoice.client.company} a bien été enregistré.`
                  : `${invoice.client.contactName}, retrouvez ici le montant restant pour ${invoice.client.company}. Vous serez redirigé vers Stripe pour saisir votre carte en toute sécurité.`}
              </p>
              {returnStatus === "success" && !paid && (
                <div className={styles.notice}>
                  Paiement reçu par Stripe. La confirmation est en cours de
                  synchronisation…
                </div>
              )}
              {returnStatus === "cancelled" && !paid && (
                <div className={styles.noticeNeutral}>
                  Le paiement a été interrompu. Aucun débit n’a été enregistré
                  et vous pouvez reprendre quand vous le souhaitez.
                </div>
              )}
              {error && <div className={styles.error}>{error}</div>}
            </section>

            <aside className={styles.card}>
              <div className={styles.cardTop}>
                <span>{invoiceType(invoice.type)}</span>
                <strong>{invoice.number}</strong>
              </div>
              <div className={styles.rows}>
                <div>
                  <span>Montant de la facture</span>
                  <strong>{money(invoice.total)}</strong>
                </div>
                {invoice.paidAmount > 0 && (
                  <div>
                    <span>Déjà réglé</span>
                    <strong className={styles.paid}>
                      {money(invoice.paidAmount)}
                    </strong>
                  </div>
                )}
                <div className={styles.total}>
                  <span>{paid ? "Montant réglé" : "Reste à payer"}</span>
                  <strong>
                    {money(paid ? invoice.paidAmount : invoice.remainingAmount)}
                  </strong>
                </div>
              </div>
              <p className={styles.tax}>
                Prix final · TVA non applicable, art. 293 B du CGI
              </p>
              {!paid && invoice.status !== "ANNULEE" && (
                <button
                  onClick={startCheckout}
                  disabled={redirecting}
                  className={styles.payButton}
                >
                  {redirecting
                    ? "Redirection vers Stripe…"
                    : `Payer ${money(invoice.remainingAmount)}`}
                </button>
              )}
              <a
                href={`${API}/factures/payment/${params.token}/pdf`}
                target="_blank"
                rel="noreferrer"
                className={styles.pdfLink}
              >
                Télécharger la facture PDF
              </a>
              <p className={styles.reassurance}>
                Quantum Code ne reçoit ni ne conserve vos coordonnées bancaires.
              </p>
            </aside>
          </div>
        ) : null}

        <footer className={styles.footer}>
          <span>Quantum Code · Hugo André</span>
          <a href="mailto:contact@quantum-code.fr">contact@quantum-code.fr</a>
        </footer>
      </div>
    </main>
  );
}

function money(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function invoiceType(type: Invoice["type"]) {
  if (type === "ACOMPTE") return "Facture d’acompte";
  if (type === "SOLDE") return "Facture de solde";
  return "Facture";
}
