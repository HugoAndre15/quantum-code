"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { KpiCard, Badge } from "@/app/admin/components/SharedUI";

const API = "/api";

const STATUS_COLORS: Record<string, string> = {
  BROUILLON: "#aaa",
  ENVOYE: "var(--blue)",
  ACCEPTE: "var(--green)",
  REFUSE: "#ff6b6b",
  ENVOYEE: "var(--blue)",
  PAYEE: "var(--green)",
  ANNULEE: "#ff6b6b",
};

const DEVIS_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon", ENVOYE: "Envoyé", ACCEPTE: "Accepté", REFUSE: "Refusé",
};
const FACTURE_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon", ENVOYEE: "Envoyée", PAYEE: "Payée", ANNULEE: "Annulée",
};

interface Stats {
  clients: { total: number };
  devis: {
    total: number;
    totalRevenue: number;
    byStatus: Record<string, { count: number; total: number }>;
    recent: Array<{ id: string; number: string; totalHT: number; status: string; client?: { company: string } }>;
  };
  factures: {
    total: number;
    totalPaid: number;
    byStatus: Record<string, { count: number; total: number }>;
    recent: Array<{ id: string; number: string; totalHT: number; status: string; client?: { company: string } }>;
  };
}

export default function DashboardPage() {
  const { apiFetch } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await apiFetch(`${API}/dashboard/stats`);
    if (res.ok) setStats(await res.json());
    setLoading(false);
  }, [apiFetch]);

  useEffect(() => { load(); }, [load]);

  const card: React.CSSProperties = {
    background: "var(--black-2)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: 20,
  };

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "var(--grey-3)" }}>Chargement...</div>;
  if (!stats) return <div style={{ padding: 60, textAlign: "center", color: "var(--grey-3)" }}>Erreur de chargement</div>;

  const { clients, devis, factures } = stats;
  const devisEnAttente = devis.byStatus?.ENVOYE?.count || 0;
  const devisAcceptes = devis.byStatus?.ACCEPTE?.count || 0;
  const facturesEnvoyees = factures.byStatus?.ENVOYEE?.count || 0;
  const facturesEnAttenteTotal = factures.byStatus?.ENVOYEE?.total || 0;
  const tauxConversion = devis.total > 0 ? Math.round((devisAcceptes / devis.total) * 100) : 0;

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--white)", margin: 0 }}>Dashboard</h1>
        <p style={{ fontSize: 13, color: "var(--grey-3)", marginTop: 4 }}>Vue d&apos;ensemble de l&apos;activité</p>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 28 }}>
        <KpiCard label="Clients" value={clients.total} />
        <KpiCard label="Devis" value={devis.total} color="var(--blue)" sub={`${devisEnAttente} en attente`} />
        <KpiCard label="Factures" value={factures.total} color="var(--gold)" sub={`${facturesEnvoyees} en attente`} />
        <KpiCard label="Encaissé" value={`${factures.totalPaid.toFixed(0)}€`} color="var(--green)" />
        <KpiCard label="En attente" value={`${facturesEnAttenteTotal.toFixed(0)}€`} color="var(--gold)" />
        <KpiCard
          label="Taux conversion"
          value={`${tauxConversion}%`}
          color={tauxConversion >= 50 ? "var(--green)" : "var(--gold)"}
          sub={`${devisAcceptes}/${devis.total} devis`}
        />
      </div>

      {/* Status breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
        {/* Devis */}
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--white)", marginBottom: 16 }}>Devis par statut</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Object.entries(DEVIS_LABELS).map(([key, label]) => {
              const data = devis.byStatus?.[key];
              const count = data?.count || 0;
              const total = data?.total || 0;
              const pct = devis.total > 0 ? Math.round((count / devis.total) * 100) : 0;
              return (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Badge color={STATUS_COLORS[key]}>{label}</Badge>
                      <span style={{ fontSize: 12, color: "var(--grey-3)" }}>{count}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--gold)" }}>{total.toFixed(0)}€</span>
                  </div>
                  <div style={{ height: 4, background: "var(--black-3)", borderRadius: 2 }}>
                    <div style={{ height: 4, borderRadius: 2, background: STATUS_COLORS[key], width: `${pct}%`, transition: "width .3s" }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "var(--grey-3)" }}>Total devis</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--gold)" }}>{devis.totalRevenue.toFixed(0)}€</span>
          </div>
        </div>

        {/* Factures */}
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--white)", marginBottom: 16 }}>Factures par statut</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Object.entries(FACTURE_LABELS).map(([key, label]) => {
              const data = factures.byStatus?.[key];
              const count = data?.count || 0;
              const total = data?.total || 0;
              const pct = factures.total > 0 ? Math.round((count / factures.total) * 100) : 0;
              return (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Badge color={STATUS_COLORS[key]}>{label}</Badge>
                      <span style={{ fontSize: 12, color: "var(--grey-3)" }}>{count}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--gold)" }}>{total.toFixed(0)}€</span>
                  </div>
                  <div style={{ height: 4, background: "var(--black-3)", borderRadius: 2 }}>
                    <div style={{ height: 4, borderRadius: 2, background: STATUS_COLORS[key], width: `${pct}%`, transition: "width .3s" }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "var(--grey-3)" }}>Total encaissé</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--green)" }}>{factures.totalPaid.toFixed(0)}€</span>
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Recent devis */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--white)" }}>Derniers devis</div>
            <button onClick={() => router.push("/admin/sales/quotes")} style={{ fontSize: 11, color: "var(--blue)", background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontFamily: "var(--font-sans)" }}>
              Voir tout →
            </button>
          </div>
          {devis.recent.length === 0 ? (
            <div style={{ textAlign: "center", padding: 20, color: "var(--grey-3)", fontSize: 12 }}>Aucun devis</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {devis.recent.map((d) => (
                <div key={d.id} onClick={() => router.push("/admin/sales/quotes")} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 6, background: "var(--black-3)", cursor: "pointer" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--white)", flex: "0 0 110px" }}>{d.number}</span>
                  <span style={{ fontSize: 12, color: "var(--grey-3)", flex: 1 }}>{d.client?.company}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)" }}>{d.totalHT}€</span>
                  <Badge color={STATUS_COLORS[d.status]}>{DEVIS_LABELS[d.status]}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent factures */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--white)" }}>Dernières factures</div>
            <button onClick={() => router.push("/admin/sales/invoices")} style={{ fontSize: 11, color: "var(--blue)", background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontFamily: "var(--font-sans)" }}>
              Voir tout →
            </button>
          </div>
          {factures.recent.length === 0 ? (
            <div style={{ textAlign: "center", padding: 20, color: "var(--grey-3)", fontSize: 12 }}>Aucune facture</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {factures.recent.map((f) => (
                <div key={f.id} onClick={() => router.push("/admin/sales/invoices")} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 6, background: "var(--black-3)", cursor: "pointer" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--white)", flex: "0 0 110px" }}>{f.number}</span>
                  <span style={{ fontSize: 12, color: "var(--grey-3)", flex: 1 }}>{f.client?.company}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)" }}>{f.totalHT}€</span>
                  <Badge color={STATUS_COLORS[f.status]}>{FACTURE_LABELS[f.status]}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
