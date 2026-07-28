"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { Card, ErrorMsg, Field, PageHeader, inputStyle } from "@/app/admin/components/SharedUI";
import CommercialPanel from "@/app/admin/components/CommercialPanel";

const API = "/api";
type InvoiceStatus = "BROUILLON" | "ENVOYEE" | "PAYEE" | "ANNULEE";

interface Invoice {
  id: string;
  number: string;
  status: InvoiceStatus;
  totalHT: number;
  type: "ACOMPTE" | "SOLDE" | "COMPLETE";
  percentage?: number;
  paidAt?: string;
  notes?: string;
  client: { id: string; company: string; contactName: string; email?: string };
  devis: { id: string; number: string; items: Array<{ id: string; label: string; quantity: number; unitPrice: number }> };
}

const LABELS: Record<InvoiceStatus, string> = {
  BROUILLON: "Brouillon",
  ENVOYEE: "Envoyée",
  PAYEE: "Payée",
  ANNULEE: "Annulée",
};

export default function InvoiceDetailsPage({ params }: { params: { id: string } }) {
  const { apiFetch } = useAuth();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [status, setStatus] = useState<InvoiceStatus>("BROUILLON");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
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

  useEffect(() => { load(); }, [load]);

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
    const response = await apiFetch(`${API}/factures/${params.id}/send-email`, { method: "POST" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.message || "Envoi impossible.");
      return;
    }
    setMessage("Facture envoyée par email.");
    await load();
  }

  async function remove() {
    if (!confirm("Supprimer définitivement cette facture ?")) return;
    const response = await apiFetch(`${API}/factures/${params.id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.message || "Suppression impossible.");
      return;
    }
    router.push("/admin/sales/invoices");
  }

  if (!invoice && !error) return <div style={{ padding: 40, color: "var(--grey-3)" }}>Chargement...</div>;

  return (
    <div>
      <PageHeader title={invoice?.number || "Facture"} subtitle={invoice ? `${invoice.type === "ACOMPTE" ? "Acompte" : invoice.type === "SOLDE" ? "Solde" : "Facture complète"} · ${invoice.client.company} · ${invoice.totalHT.toFixed(0)} € HT` : "Détail"} />
      {error && <ErrorMsg>{error}</ErrorMsg>}
      {message && <div style={{ color: "var(--green)", fontSize: 12, marginBottom: 14 }}>{message}</div>}
      {invoice && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <a href={`${API}/factures/${invoice.id}/pdf`} target="_blank" style={buttonStyle}>Télécharger le PDF</a>
            <button onClick={sendEmail} style={buttonStyle}>Envoyer par email</button>
            <button onClick={() => router.push(`/admin/sales/quotes/${invoice.devis.id}`)} style={buttonStyle}>Voir {invoice.devis.number}</button>
          </div>
          <Card>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 14 }}>
              <Field label="Statut">
                <select style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value as InvoiceStatus)}>
                  {(Object.keys(LABELS) as InvoiceStatus[]).map((value) => <option key={value} value={value}>{LABELS[value]}</option>)}
                </select>
              </Field>
              <Field label="Notes">
                <input style={inputStyle} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </Field>
            </div>
            <button disabled={saving} onClick={save} style={{ ...buttonStyle, background: "var(--blue)", borderColor: "var(--blue)", color: "#fff" }}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
          </Card>
          <div style={{ marginTop: 16 }}>
            <Card>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--white)", marginBottom: 12 }}>Prestations</div>
              {invoice.devis.items.map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--border)", color: "var(--grey-2)", fontSize: 12 }}>
                  <span>{item.label} × {item.quantity}</span>
                  <span>{(item.quantity * item.unitPrice).toFixed(0)} €</span>
                </div>
              ))}
            </Card>
          </div>
          <CommercialPanel context={{ clientId: invoice.client.id, devisId: invoice.devis.id, factureId: invoice.id }} />
          <button onClick={remove} style={{ ...buttonStyle, marginTop: 18, color: "#ff6b6b", borderColor: "rgba(255,107,107,.35)" }}>Supprimer la facture</button>
        </>
      )}
    </div>
  );
}

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
