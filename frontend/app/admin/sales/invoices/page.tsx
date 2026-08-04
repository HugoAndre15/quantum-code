"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import {
  ActionButton,
  Badge,
  Empty,
  KpiCard,
  ListActions,
  ListRow,
  ListTable,
  PageHeader,
  TabBar,
} from "@/app/admin/components/SharedUI";

const API = "/api";

type InvoiceStatus = "BROUILLON" | "ENVOYEE" | "PAYEE" | "ANNULEE";
type PaymentStatus = "NON_PAYEE" | "ACOMPTE_RECU" | "PAYEE";

interface Invoice {
  id: string;
  number: string;
  status: InvoiceStatus;
  type: "ACOMPTE" | "SOLDE" | "COMPLETE";
  paymentStatus?: PaymentStatus;
  totalHT: number;
  paidAmount?: number;
  remainingAmount?: number;
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

  useEffect(() => {
    load();
  }, [load]);

  const filtered =
    tab === "all" ? invoices : invoices.filter((i) => i.status === tab);
  const tabsWithCounts = TABS.map((t) => ({
    ...t,
    count:
      t.key === "all"
        ? invoices.length
        : invoices.filter((i) => i.status === t.key).length,
  }));

  const totalPaye = invoices.reduce(
    (sum, invoice) => sum + (invoice.paidAmount || 0),
    0,
  );
  const totalEnAttente = invoices
    .filter((invoice) => invoice.status !== "ANNULEE")
    .reduce(
      (sum, invoice) => sum + (invoice.remainingAmount ?? invoice.totalHT),
      0,
    );

  return (
    <div>
      <PageHeader
        title="Factures"
        subtitle="Facturation clients"
        count={filtered.length}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <KpiCard
          label="Total encaissé"
          value={`${totalPaye.toFixed(0)}€`}
          color="var(--green)"
        />
        <KpiCard
          label="En attente de paiement"
          value={`${totalEnAttente.toFixed(0)}€`}
          color="var(--gold)"
        />
        <KpiCard label="Nombre de factures" value={invoices.length} />
      </div>

      <TabBar tabs={tabsWithCounts} activeTab={tab} onTabChange={setTab} />

      {loading ? (
        <div
          style={{ padding: 40, textAlign: "center", color: "var(--grey-3)" }}
        >
          Chargement...
        </div>
      ) : filtered.length === 0 ? (
        <Empty>Aucune facture</Empty>
      ) : (
        <ListTable
          columns="110px minmax(210px, 1fr) 80px 100px 120px 80px 80px 100px"
          minWidth={980}
          header={
            <>
              <span>Numéro</span>
              <span>Client</span>
              <span>Type</span>
              <span>Statut</span>
              <span>Paiement</span>
              <span>Total HT</span>
              <span>Payé</span>
              <span style={{ textAlign: "right" }}>Actions</span>
            </>
          }
        >
          {filtered.map((inv) => (
            <ListRow
              key={inv.id}
              onOpen={() => router.push(`/admin/sales/invoices/${inv.id}`)}
              openLabel={`Ouvrir la facture ${inv.number}`}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--white)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {inv.number}
              </span>
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--white)",
                  }}
                >
                  {inv.client?.company || "—"}
                </div>
                <div style={{ fontSize: 11, color: "var(--grey-3)" }}>
                  {inv.devis?.number && `Devis ${inv.devis.number}`}
                </div>
              </div>
              <span style={{ fontSize: 11, color: "var(--grey-2)" }}>
                {inv.type === "ACOMPTE"
                  ? "Acompte"
                  : inv.type === "SOLDE"
                    ? "Solde"
                    : "Complète"}
              </span>
              <Badge color={STATUS_COLORS[inv.status]}>
                {STATUS_LABELS[inv.status]}
              </Badge>
              {inv.paymentStatus ? (
                <Badge color={PAYMENT_COLORS[inv.paymentStatus]}>
                  {PAYMENT_LABELS[inv.paymentStatus]}
                </Badge>
              ) : (
                <span style={{ fontSize: 12, color: "var(--grey-3)" }}>—</span>
              )}
              <span
                style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)" }}
              >
                {inv.totalHT.toFixed(0)}€
              </span>
              <span style={{ fontSize: 13, color: "var(--green)" }}>
                {inv.paidAmount ? `${inv.paidAmount.toFixed(0)}€` : "—"}
              </span>
              <ListActions>
                <ActionButton
                  variant="primary"
                  onClick={() => router.push(`/admin/sales/invoices/${inv.id}`)}
                >
                  Ouvrir →
                </ActionButton>
              </ListActions>
            </ListRow>
          ))}
        </ListTable>
      )}
    </div>
  );
}
