"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { PageHeader, Badge, Empty, TabBar, KpiCard } from "@/app/admin/components/SharedUI";

const API = "/api";

type InvoiceStatus = "BROUILLON" | "ENVOYEE" | "PAYEE" | "ANNULEE";
type PaymentStatus = "NON_PAYEE" | "ACOMPTE_RECU" | "PAYEE";

interface Invoice {
  id: string;
  number: string;
  status: InvoiceStatus;
  paymentStatus?: PaymentStatus;
  totalHT: number;
  paidAmount?: number;
  paidAt?: string;
  createdAt: string;
  client?: { id: string; company: string; contactName: string };
  devis?: { number: string };
}

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  BROUILLON: "#aaa",
  ENVOYEE: "var(--blue)",
  PAYEE: "var(--green)",
  ANNULEE: "#ff6b6b",
};
const STATUS_LABELS: Record<InvoiceStatus, string> = {
  BROUILLON: "Brouillon",
  ENVOYEE: "Envoyée",
  PAYEE: "Payée",
  ANNULEE: "Annulée",
};

const PAYMENT_COLORS: Record<PaymentStatus, string> = {
  NON_PAYEE: "#ff6b6b",
  ACOMPTE_RECU: "var(--gold)",
  PAYEE: "var(--green)",
};
const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  NON_PAYEE: "Non payée",
  ACOMPTE_RECU: "Acompte reçu",
  PAYEE: "Soldée",
};

const TABS = [
  { key: "all", label: "Toutes" },
  { key: "BROUILLON", label: "Brouillons" },
  { key: "ENVOYEE", label: "Envoyées" },
  { key: "PAYEE", label: "Payées" },
  { key: "ANNULEE", label: "Annulées" },
];

export default function InvoicesPage() {
  const { apiFetch } = useAuth();
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

  const load = useCallback(async () => {
    const res = await apiFetch(`${API}/factures`);
    if (res.ok) setInvoices(await res.json());
    setLoading(false);
  }, [apiFetch]);

  useEffect(() => { load(); }, [load]);

  const filtered = tab === "all" ? invoices : invoices.filter((i) => i.status === tab);
  const tabsWithCounts = TABS.map((t) => ({ ...t, count: t.key === "all" ? invoices.length : invoices.filter((i) => i.status === t.key).length }));

  const totalPaye = invoices.filter((i) => i.status === "PAYEE").reduce((s, i) => s + i.totalHT, 0);
  const totalEnAttente = invoices.filter((i) => i.status === "ENVOYEE").reduce((s, i) => s + i.totalHT, 0);

  return (
    <div>
      <PageHeader title="Factures" subtitle="Facturation clients" count={filtered.length} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
        <KpiCard label="Total encaissé" value={`${totalPaye.toFixed(0)}€`} color="var(--green)" />
        <KpiCard label="En attente de paiement" value={`${totalEnAttente.toFixed(0)}€`} color="var(--gold)" />
        <KpiCard label="Nombre de factures" value={invoices.length} />
      </div>

      <TabBar tabs={tabsWithCounts} activeTab={tab} onTabChange={setTab} />

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--grey-3)" }}>Chargement...</div>
      ) : filtered.length === 0 ? (
        <Empty>Aucune facture</Empty>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 100px 120px 80px 80px 80px", gap: 12, padding: "6px 16px", fontSize: 11, color: "var(--grey-3)", fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase" }}>
            <span>Numéro</span><span>Client</span><span>Statut</span><span>Paiement</span><span>Total HT</span><span>Payé</span><span style={{ textAlign: "right" }}>Actions</span>
          </div>
          {filtered.map((inv) => (
            <div key={inv.id} style={{ display: "grid", gridTemplateColumns: "110px 1fr 100px 120px 80px 80px 80px", gap: 12, padding: "12px 16px", background: "var(--black-2)", border: "1px solid var(--border)", borderRadius: 8, alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--white)", fontFamily: "var(--font-mono)" }}>{inv.number}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--white)" }}>{inv.client?.company || "—"}</div>
                <div style={{ fontSize: 11, color: "var(--grey-3)" }}>{inv.devis?.number && `Devis ${inv.devis.number}`}</div>
              </div>
              <Badge color={STATUS_COLORS[inv.status]}>{STATUS_LABELS[inv.status]}</Badge>
              {inv.paymentStatus ? (
                <Badge color={PAYMENT_COLORS[inv.paymentStatus]}>{PAYMENT_LABELS[inv.paymentStatus]}</Badge>
              ) : <span style={{ fontSize: 12, color: "var(--grey-3)" }}>—</span>}
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)" }}>{inv.totalHT.toFixed(0)}€</span>
              <span style={{ fontSize: 13, color: "var(--green)" }}>{inv.paidAmount ? `${inv.paidAmount.toFixed(0)}€` : "—"}</span>
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <button onClick={() => router.push(`/admin/sales/invoices/${inv.id}`)} style={{ fontSize: 11, padding: "4px 10px", background: "var(--black-3)", border: "1px solid var(--border-2)", borderRadius: "var(--r)", color: "var(--grey-2)", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                  Voir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
