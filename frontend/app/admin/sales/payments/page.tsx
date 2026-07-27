"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { PageHeader, Badge, Empty, KpiCard, Modal, Field, ErrorMsg, FormButtons, inputStyle } from "@/app/admin/components/SharedUI";

const API = "/api";

type PaymentType = "ACOMPTE" | "SOLDE" | "REMBOURSEMENT";
type PaymentMethod = "VIREMENT" | "CARTE" | "CHEQUE" | "ESPECES" | "AUTRE";

interface Payment {
  id: string;
  amount: number;
  type: PaymentType;
  method: PaymentMethod;
  paidAt: string;
  notes?: string;
  invoice?: { id: string; number: string; totalHT: number };
  client?: { company: string };
  createdAt: string;
}

const TYPE_COLORS: Record<PaymentType, string> = {
  ACOMPTE: "var(--gold)",
  SOLDE: "var(--green)",
  REMBOURSEMENT: "#ff6b6b",
};
const TYPE_LABELS: Record<PaymentType, string> = {
  ACOMPTE: "Acompte",
  SOLDE: "Solde",
  REMBOURSEMENT: "Remboursement",
};
const METHOD_LABELS: Record<PaymentMethod, string> = {
  VIREMENT: "Virement",
  CARTE: "Carte",
  CHEQUE: "Chèque",
  ESPECES: "Espèces",
  AUTRE: "Autre",
};

export default function PaymentsPage() {
  const { apiFetch } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<{ id: string; number: string; totalHT: number; client?: { company: string } }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ invoiceId: "", amount: "", type: "ACOMPTE" as PaymentType, method: "VIREMENT" as PaymentMethod, paidAt: new Date().toISOString().split("T")[0], notes: "" });

  const load = useCallback(async () => {
    const [payRes, invRes] = await Promise.all([
      apiFetch(`${API}/sales/payments`),
      apiFetch(`${API}/factures`),
    ]);
    if (payRes.ok) setPayments(await payRes.json());
    if (invRes.ok) setInvoices(await invRes.json());
    setLoading(false);
  }, [apiFetch]);

  useEffect(() => { load(); }, [load]);

  const totalEncaisse = payments.filter((p) => p.type !== "REMBOURSEMENT").reduce((s, p) => s + p.amount, 0);
  const totalAcomptes = payments.filter((p) => p.type === "ACOMPTE").reduce((s, p) => s + p.amount, 0);
  const totalSoldes = payments.filter((p) => p.type === "SOLDE").reduce((s, p) => s + p.amount, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = { ...form, amount: Number(form.amount) };
      const res = await apiFetch(`${API}/sales/payments`, { method: "POST", body: JSON.stringify(payload) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || "Erreur"); }
      await load();
      setShowModal(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="Paiements" subtitle="Suivi des encaissements (acomptes & soldes)" count={payments.length} onAdd={() => { setError(""); setShowModal(true); }} addLabel="Enregistrer paiement" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
        <KpiCard label="Total encaissé" value={`${totalEncaisse.toFixed(0)}€`} color="var(--green)" />
        <KpiCard label="Acomptes reçus" value={`${totalAcomptes.toFixed(0)}€`} color="var(--gold)" />
        <KpiCard label="Soldes reçus" value={`${totalSoldes.toFixed(0)}€`} color="var(--green)" />
        <KpiCard label="Transactions" value={payments.length} />
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--grey-3)" }}>Chargement...</div>
      ) : payments.length === 0 ? (
        <Empty>Aucun paiement enregistré</Empty>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "grid", gridTemplateColumns: "130px 1fr 100px 100px 80px 120px", gap: 12, padding: "6px 16px", fontSize: 11, color: "var(--grey-3)", fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase" }}>
            <span>Date</span><span>Client / Facture</span><span>Type</span><span>Méthode</span><span>Montant</span><span>Notes</span>
          </div>
          {payments.map((p) => (
            <div key={p.id} style={{ display: "grid", gridTemplateColumns: "130px 1fr 100px 100px 80px 120px", gap: 12, padding: "12px 16px", background: "var(--black-2)", border: "1px solid var(--border)", borderRadius: 8, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--grey-2)" }}>{new Date(p.paidAt).toLocaleDateString("fr-FR")}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--white)" }}>{p.client?.company || p.invoice?.number || "—"}</div>
                {p.invoice && <div style={{ fontSize: 11, color: "var(--grey-3)" }}>Facture {p.invoice.number}</div>}
              </div>
              <Badge color={TYPE_COLORS[p.type]}>{TYPE_LABELS[p.type]}</Badge>
              <span style={{ fontSize: 12, color: "var(--grey-2)" }}>{METHOD_LABELS[p.method]}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: p.type === "REMBOURSEMENT" ? "#ff6b6b" : "var(--green)" }}>
                {p.type === "REMBOURSEMENT" ? "-" : "+"}{p.amount.toFixed(0)}€
              </span>
              <span style={{ fontSize: 11, color: "var(--grey-3)" }}>{p.notes || "—"}</span>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--white)", marginBottom: 20 }}>Enregistrer un paiement</h3>
          {error && <ErrorMsg>{error}</ErrorMsg>}
          <form onSubmit={handleSubmit}>
            <Field label="Facture concernée *">
              <select required style={inputStyle} value={form.invoiceId} onChange={(e) => setForm({ ...form, invoiceId: e.target.value })}>
                <option value="">-- Choisir une facture --</option>
                {invoices.map((inv) => <option key={inv.id} value={inv.id}>{inv.number} – {inv.client?.company} ({inv.totalHT}€)</option>)}
              </select>
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Type *">
                <select style={inputStyle} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as PaymentType })}>
                  {(Object.keys(TYPE_LABELS) as PaymentType[]).map((k) => <option key={k} value={k}>{TYPE_LABELS[k]}</option>)}
                </select>
              </Field>
              <Field label="Méthode *">
                <select style={inputStyle} value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value as PaymentMethod })}>
                  {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map((k) => <option key={k} value={k}>{METHOD_LABELS[k]}</option>)}
                </select>
              </Field>
              <Field label="Montant (€) *">
                <input required type="number" min={0} step={0.01} style={inputStyle} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </Field>
              <Field label="Date de réception *">
                <input required type="date" style={inputStyle} value={form.paidAt} onChange={(e) => setForm({ ...form, paidAt: e.target.value })} />
              </Field>
            </div>
            <Field label="Notes">
              <input style={inputStyle} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Référence virement, note..." />
            </Field>
            <FormButtons saving={saving} onCancel={() => setShowModal(false)} submitLabel="Enregistrer le paiement" />
          </form>
        </Modal>
      )}
    </div>
  );
}
