"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { PageHeader, Badge, Empty, TabBar } from "@/app/admin/components/SharedUI";

const API = "/api";

type QuoteStatus = "BROUILLON" | "ENVOYE" | "ACCEPTE" | "REFUSE";

interface Quote {
  id: string;
  number: string;
  status: QuoteStatus;
  totalHT: number;
  discountAmount: number;
  validUntil?: string;
  createdAt: string;
  client?: { id: string; company: string; contactName: string };
}

const STATUS_COLORS: Record<QuoteStatus, string> = {
  BROUILLON: "#aaa",
  ENVOYE: "var(--blue)",
  ACCEPTE: "var(--green)",
  REFUSE: "#ff6b6b",
};

const STATUS_LABELS: Record<QuoteStatus, string> = {
  BROUILLON: "Brouillon",
  ENVOYE: "Envoyé",
  ACCEPTE: "Accepté",
  REFUSE: "Refusé",
};

const TABS = [
  { key: "all", label: "Tous" },
  { key: "BROUILLON", label: "Brouillons" },
  { key: "ENVOYE", label: "Envoyés" },
  { key: "ACCEPTE", label: "Acceptés" },
  { key: "REFUSE", label: "Refusés" },
];

export default function QuotesPage() {
  const { apiFetch } = useAuth();
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

  const load = useCallback(async () => {
    const res = await apiFetch(`${API}/devis`);
    if (res.ok) setQuotes(await res.json());
    setLoading(false);
  }, [apiFetch]);

  useEffect(() => { load(); }, [load]);

  const filtered = tab === "all" ? quotes : quotes.filter((q) => q.status === tab);
  const tabsWithCounts = TABS.map((t) => ({ ...t, count: t.key === "all" ? quotes.length : quotes.filter((q) => q.status === t.key).length }));

  const totalEnAttente = quotes.filter((q) => q.status === "ENVOYE").reduce((s, q) => s + q.totalHT, 0);
  const totalAccepte = quotes.filter((q) => q.status === "ACCEPTE").reduce((s, q) => s + q.totalHT, 0);

  return (
    <div>
      <PageHeader title="Devis" subtitle="Propositions commerciales" count={filtered.length} onAdd={() => router.push("/admin/sales/quotes/new")} addLabel="Nouveau devis" />

      {/* Summary bar */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        {[
          { label: "En attente de réponse", value: `${totalEnAttente.toFixed(0)}€`, color: "var(--blue)" },
          { label: "Acceptés (à facturer)", value: `${totalAccepte.toFixed(0)}€`, color: "var(--green)" },
        ].map((kpi) => (
          <div key={kpi.label} style={{ background: "var(--black-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 20px", flex: 1 }}>
            <div style={{ fontSize: 11, color: "var(--grey-3)", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".04em" }}>{kpi.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <TabBar tabs={tabsWithCounts} activeTab={tab} onTabChange={setTab} />

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--grey-3)" }}>Chargement...</div>
      ) : filtered.length === 0 ? (
        <Empty>Aucun devis</Empty>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 100px 80px 120px 100px", gap: 12, padding: "6px 16px", fontSize: 11, color: "var(--grey-3)", fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase" }}>
            <span>Numéro</span><span>Client</span><span>Statut</span><span>Total HT</span><span>Validité</span><span style={{ textAlign: "right" }}>Actions</span>
          </div>
          {filtered.map((q) => (
            <div key={q.id} style={{ display: "grid", gridTemplateColumns: "110px 1fr 100px 80px 120px 100px", gap: 12, padding: "12px 16px", background: "var(--black-2)", border: "1px solid var(--border)", borderRadius: 8, alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--white)", fontFamily: "var(--font-mono)" }}>{q.number}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--white)" }}>{q.client?.company || "—"}</div>
                <div style={{ fontSize: 11, color: "var(--grey-3)" }}>{q.client?.contactName}</div>
              </div>
              <Badge color={STATUS_COLORS[q.status]}>{STATUS_LABELS[q.status]}</Badge>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)" }}>{q.totalHT.toFixed(0)}€</span>
              <span style={{ fontSize: 12, color: "var(--grey-3)" }}>
                {q.validUntil ? new Date(q.validUntil).toLocaleDateString("fr-FR") : "—"}
              </span>
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <button onClick={() => router.push(`/admin/sales/quotes/${q.id}`)} style={{ fontSize: 11, padding: "4px 10px", background: "var(--black-3)", border: "1px solid var(--border-2)", borderRadius: "var(--r)", color: "var(--grey-2)", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
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
