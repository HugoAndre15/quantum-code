"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CommercialPanel from "@/app/admin/components/CommercialPanel";
import {
  Card,
  ErrorMsg,
  Field,
  PageHeader,
  inputStyle,
} from "@/app/admin/components/SharedUI";
import { useAuth } from "@/app/context/AuthContext";

const API = "/api";
type InvoiceStatus = "BROUILLON" | "ENVOYEE" | "PAYEE" | "ANNULEE";

interface InvoicePayment {
  id: string;
  amount: number;
  method: "VIREMENT" | "CARTE" | "CHEQUE" | "ESPECES" | "AUTRE";
  status: "EN_ATTENTE" | "PAYE" | "ECHOUE" | "REMBOURSE";
  paidAt?: string;
  createdAt: string;
  stripeSessionId?: string;
}

interface Invoice {
  id: string;
  number: string;
  status: InvoiceStatus;
  totalHT: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: "NON_PAYEE" | "ACOMPTE_RECU" | "PAYEE";
  type: "ACOMPTE" | "SOLDE" | "COMPLETE";
  percentage?: number;
  paidAt?: string;
  notes?: string;
  payments: InvoicePayment[];
  client: { id: string; company: string; contactName: string; email?: string };
  devis: {
    id: string;
    number: string;
    items: Array<{
      id: string;
      label: string;
      quantity: number;
      unitPrice: number;
    }>;
  };
}

const LABELS: Record<InvoiceStatus, string> = {
  BROUILLON: "Brouillon",
  ENVOYEE: "Envoyée",
  PAYEE: "Payée",
  ANNULEE: "Annulée",
};

const METHOD_LABELS: Record<InvoicePayment["method"], string> = {
  VIREMENT: "Virement",
  CARTE: "Carte Stripe",
  CHEQUE: "Chèque",
  ESPECES: "Espèces",
  AUTRE: "Autre",
};

export default function InvoiceDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const { apiFetch } = useAuth();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [status, setStatus] = useState<InvoiceStatus>("BROUILLON");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const response = await apiFetch(`${API}/factures/${params.id}`);
    if (!response.ok) {
      setError("Facture introuvable.");
      return;
    }
    const data: Invoice = await response.json();
    setInvoice(data);
    setStatus(data.status);
    setNotes(data.notes || "");
  }, [apiFetch, params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");
    const response = await apiFetch(`${API}/factures/${params.id}`, {
      method: "PUT",
      body: JSON.stringify({ status, notes: notes || undefined }),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setError(data.message || "Enregistrement impossible.");
      return;
    }
    setMessage("Facture enregistrée.");
    await load();
  }

  async function sendEmail() {
    setWorking(true);
    setError("");
    const response = await apiFetch(`${API}/factures/${params.id}/send-email`, {
      method: "POST",
    });
    const data = await response.json().catch(() => ({}));
    setWorking(false);
    if (!response.ok) {
      setError(data.message || "Envoi impossible.");
      return;
    }
    setMessage("Facture et lien de paiement envoyés au client.");
    await load();
  }

  async function copyPaymentLink() {
    setWorking(true);
    setError("");
    const response = await apiFetch(
      `${API}/factures/${params.id}/payment-link`,
      { method: "POST" },
    );
    const data = await response.json().catch(() => ({}));
    setWorking(false);
    if (!response.ok || !data.url) {
      setError(data.message || "Création du lien impossible.");
      return;
    }
    await navigator.clipboard.writeText(data.url);
    setMessage("Lien de paiement copié.");
  }

  async function resetPaymentLink() {
    if (
      !confirm(
        "Réinitialiser le paiement ? Stripe sera vérifié avant toute action. Si aucun paiement n’a été reçu, la session en attente sera invalidée et un nouveau lien sera créé.",
      )
    )
      return;
    setWorking(true);
    setError("");
    setMessage("");
    const response = await apiFetch(
      `${API}/factures/${params.id}/payment-link/reset`,
      { method: "POST" },
    );
    const data = await response.json().catch(() => ({}));
    setWorking(false);
    if (!response.ok) {
      setError(data.message || "Réinitialisation impossible.");
      return;
    }
    if (data.paid) {
      setMessage("Le paiement Stripe a été retrouvé et synchronisé.");
    } else if (data.url) {
      await navigator.clipboard.writeText(data.url);
      setMessage("Nouveau lien de paiement créé et copié.");
    }
    await load();
  }

  async function remove() {
    if (!confirm("Supprimer définitivement cette facture ?")) return;
    const response = await apiFetch(`${API}/factures/${params.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.message || "Suppression impossible.");
      return;
    }
    router.push("/admin/sales/invoices");
  }

  if (!invoice && !error)
    return (
      <div style={{ padding: 40, color: "var(--grey-3)" }}>Chargement...</div>
    );

  return (
    <div>
      <PageHeader
        title={invoice?.number || "Facture"}
        subtitle={
          invoice
            ? `${invoice.type === "ACOMPTE" ? "Acompte" : invoice.type === "SOLDE" ? "Solde" : "Facture complète"} · ${invoice.client.company}`
            : "Détail"
        }
      />
      {error && <ErrorMsg>{error}</ErrorMsg>}
      {message && (
        <div style={{ color: "var(--green)", fontSize: 12, marginBottom: 14 }}>
          {message}
        </div>
      )}
      {invoice && (
        <>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 16,
            }}
          >
            <a
              href={`${API}/factures/${invoice.id}/pdf`}
              target="_blank"
              style={buttonStyle}
            >
              Télécharger le PDF
            </a>
            <button disabled={working} onClick={sendEmail} style={buttonStyle}>
              Envoyer facture + paiement
            </button>
            <button
              disabled={working}
              onClick={copyPaymentLink}
              style={buttonStyle}
            >
              Copier le lien de paiement
            </button>
            {invoice.remainingAmount > 0 && invoice.status !== "ANNULEE" && (
              <button
                disabled={working}
                onClick={resetPaymentLink}
                style={buttonStyle}
              >
                Réinitialiser le paiement
              </button>
            )}
            <button
              onClick={() =>
                router.push(`/admin/sales/quotes/${invoice.devis.id}`)
              }
              style={buttonStyle}
            >
              Voir {invoice.devis.number}
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <Metric label="Montant" value={money(invoice.totalHT)} />
            <Metric
              label="Payé"
              value={money(invoice.paidAmount)}
              color="var(--green)"
            />
            <Metric
              label="Reste à payer"
              value={money(invoice.remainingAmount)}
              color={
                invoice.remainingAmount > 0 ? "var(--gold)" : "var(--green)"
              }
            />
          </div>

          <Card>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 2fr",
                gap: 14,
              }}
            >
              <Field label="Statut">
                <select
                  style={inputStyle}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
                >
                  {(Object.keys(LABELS) as InvoiceStatus[]).map((value) => (
                    <option key={value} value={value}>
                      {LABELS[value]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Notes">
                <input
                  style={inputStyle}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Field>
            </div>
            <button
              disabled={saving}
              onClick={save}
              style={{
                ...buttonStyle,
                background: "var(--blue)",
                borderColor: "var(--blue)",
                color: "#fff",
              }}
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </Card>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 16,
              marginTop: 16,
            }}
          >
            <Card>
              <SectionTitle>Prestations</SectionTitle>
              {invoice.devis.items.map((item) => (
                <div key={item.id} style={rowStyle}>
                  <span>
                    {item.label} × {item.quantity}
                  </span>
                  <span>{money(item.quantity * item.unitPrice)}</span>
                </div>
              ))}
            </Card>
            <Card>
              <SectionTitle>Transactions</SectionTitle>
              {invoice.payments.length === 0 ? (
                <div style={{ color: "var(--grey-3)", fontSize: 12 }}>
                  Aucun paiement enregistré.
                </div>
              ) : (
                invoice.payments.map((payment) => (
                  <div key={payment.id} style={rowStyle}>
                    <div>
                      <div>{METHOD_LABELS[payment.method]}</div>
                      <div
                        style={{
                          marginTop: 3,
                          color: "var(--grey-3)",
                          fontSize: 10,
                        }}
                      >
                        {payment.status === "EN_ATTENTE"
                          ? "En attente"
                          : payment.status === "PAYE"
                            ? "Payé"
                            : payment.status === "REMBOURSE"
                              ? "Remboursé"
                              : "Échoué"}
                        {payment.paidAt
                          ? ` · ${new Date(payment.paidAt).toLocaleDateString("fr-FR")}`
                          : ""}
                      </div>
                    </div>
                    <span
                      style={{
                        color:
                          payment.status === "PAYE"
                            ? "var(--green)"
                            : "var(--grey-2)",
                      }}
                    >
                      {money(payment.amount)}
                    </span>
                  </div>
                ))
              )}
            </Card>
          </div>

          <CommercialPanel
            context={{
              clientId: invoice.client.id,
              devisId: invoice.devis.id,
              factureId: invoice.id,
            }}
          />
          <button
            onClick={remove}
            style={{
              ...buttonStyle,
              marginTop: 18,
              color: "#ff6b6b",
              borderColor: "rgba(255,107,107,.35)",
            }}
          >
            Supprimer la facture
          </button>
        </>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  color = "var(--white)",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div
      style={{
        padding: 16,
        border: "1px solid var(--border)",
        borderRadius: 8,
        background: "var(--black-2)",
      }}
    >
      <div
        style={{
          marginBottom: 7,
          color: "var(--grey-3)",
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: ".07em",
        }}
      >
        {label}
      </div>
      <div style={{ color, fontSize: 22, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 13,
        fontWeight: 700,
        color: "var(--white)",
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}

function money(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(amount);
}

const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 14,
  padding: "9px 0",
  borderBottom: "1px solid var(--border)",
  color: "var(--grey-2)",
  fontSize: 12,
};

const buttonStyle: React.CSSProperties = {
  display: "inline-flex",
  padding: "8px 12px",
  background: "var(--black-3)",
  border: "1px solid var(--border-2)",
  color: "var(--grey-2)",
  borderRadius: 6,
  cursor: "pointer",
  textDecoration: "none",
  fontFamily: "var(--font-sans)",
  fontSize: 12,
};
