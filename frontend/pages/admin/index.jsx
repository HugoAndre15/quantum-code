import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../context/AuthContext";
import AdminLayout from "../../components/AdminLayout";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export default function DashboardPage() {
  const { apiFetch } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await apiFetch(`${API}/dashboard/stats`);
    if (res.ok) setStats(await res.json());
    setLoading(false);
  }, [apiFetch]);

  useEffect(() => { load(); }, [load]);

  const card = {
    background: "var(--black-2)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: 20,
  };

  const kpiCard = (label, value, color = "var(--white)", sub = null) => (
    <div style={{ ...card, padding: 18 }}>
      <div style={{ fontSize: 11, color: "var(--grey-3)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".04em" }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--grey-3)", marginTop: 4 }}>{sub}</div>}
    </div>
  );

  const badge = (color) => ({
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 20,
    fontSize: 10,
    fontWeight: 600,
    background: `${color}18`,
    color,
  });

  if (loading) {
    return (
      <AdminLayout title="Dashboard">
        <div style={{ textAlign: "center", padding: 60, color: "var(--grey-3)" }}>Chargement...</div>
      </AdminLayout>
    );
  }

  if (!stats) {
    return (
      <AdminLayout title="Dashboard">
        <div style={{ textAlign: "center", padding: 60, color: "var(--grey-3)" }}>Erreur de chargement</div>
      </AdminLayout>
    );
  }

  const { clients, devis, factures } = stats;

  const devisEnAttente = (devis.byStatus?.ENVOYE?.count || 0);
  const devisAcceptes = (devis.byStatus?.ACCEPTE?.count || 0);
  const devisRefuses = (devis.byStatus?.REFUSE?.count || 0);
  const devisBrouillon = (devis.byStatus?.BROUILLON?.count || 0);

  const facturesBrouillon = (factures.byStatus?.BROUILLON?.count || 0);
  const facturesEnvoyees = (factures.byStatus?.ENVOYEE?.count || 0);
  const facturesPayees = (factures.byStatus?.PAYEE?.count || 0);
  const facturesAnnulees = (factures.byStatus?.ANNULEE?.count || 0);
  const facturesEnAttenteTotal = (factures.byStatus?.ENVOYEE?.total || 0);

  const tauxConversion = devis.total > 0
    ? Math.round((devisAcceptes / devis.total) * 100)
    : 0;

  const STATUS_COLORS = {
    BROUILLON: "#aaa",
    ENVOYE: "var(--blue)",
    ACCEPTE: "var(--green)",
    REFUSE: "#ff6b6b",
    ENVOYEE: "var(--blue)",
    PAYEE: "var(--green)",
    ANNULEE: "#ff6b6b",
  };

  const DEVIS_STATUS_LABELS = { BROUILLON: "Brouillon", ENVOYE: "Envoyé", ACCEPTE: "Accepté", REFUSE: "Refusé" };
  const FACTURE_STATUS_LABELS = { BROUILLON: "Brouillon", ENVOYEE: "Envoyée", PAYEE: "Payée", ANNULEE: "Annulée" };

  return (
    <AdminLayout title="Dashboard">
      {/* ─── KPI Row ─────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 28 }}>
        {kpiCard("Clients", clients.total, "var(--white)")}
        {kpiCard("Devis", devis.total, "var(--blue)", `${devisEnAttente} en attente`)}
        {kpiCard("Factures", factures.total, "var(--gold)", `${facturesEnvoyees} en attente`)}
        {kpiCard("Encaissé", `${factures.totalPaid.toFixed(0)}€`, "var(--green)")}
        {kpiCard("En attente", `${facturesEnAttenteTotal.toFixed(0)}€`, "var(--gold)")}
        {kpiCard("Taux conversion", `${tauxConversion}%`, tauxConversion >= 50 ? "var(--green)" : "var(--gold)", `${devisAcceptes}/${devis.total} devis`)}
      </div>

      {/* ─── Two columns ────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
        {/* Devis breakdown */}
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--white)", marginBottom: 16 }}>Devis par statut</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Object.entries(DEVIS_STATUS_LABELS).map(([key, label]) => {
              const data = devis.byStatus?.[key];
              const count = data?.count || 0;
              const total = data?.total || 0;
              const pct = devis.total > 0 ? Math.round((count / devis.total) * 100) : 0;
              return (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={badge(STATUS_COLORS[key])}>{label}</span>
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

        {/* Factures breakdown */}
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--white)", marginBottom: 16 }}>Factures par statut</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Object.entries(FACTURE_STATUS_LABELS).map(([key, label]) => {
              const data = factures.byStatus?.[key];
              const count = data?.count || 0;
              const total = data?.total || 0;
              const pct = factures.total > 0 ? Math.round((count / factures.total) * 100) : 0;
              return (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={badge(STATUS_COLORS[key])}>{label}</span>
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

      {/* ─── Recent activity ────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Recent devis */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--white)" }}>Derniers devis</div>
            <button
              onClick={() => router.push("/admin/devis")}
              style={{ fontSize: 11, color: "var(--blue)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
            >
              Voir tout →
            </button>
          </div>
          {devis.recent.length === 0 ? (
            <div style={{ textAlign: "center", padding: 20, color: "var(--grey-3)", fontSize: 12 }}>Aucun devis</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {devis.recent.map((d) => (
                <div
                  key={d.id}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 6, background: "var(--black-3)", cursor: "pointer" }}
                  onClick={() => router.push("/admin/devis")}
                >
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--white)", flex: "0 0 100px" }}>{d.number}</span>
                  <span style={{ fontSize: 12, color: "var(--grey-3)", flex: 1 }}>{d.client?.company}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)" }}>{d.totalHT}€</span>
                  <span style={badge(STATUS_COLORS[d.status])}>{DEVIS_STATUS_LABELS[d.status]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent factures */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--white)" }}>Dernières factures</div>
            <button
              onClick={() => router.push("/admin/factures")}
              style={{ fontSize: 11, color: "var(--blue)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
            >
              Voir tout →
            </button>
          </div>
          {factures.recent.length === 0 ? (
            <div style={{ textAlign: "center", padding: 20, color: "var(--grey-3)", fontSize: 12 }}>Aucune facture</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {factures.recent.map((f) => (
                <div
                  key={f.id}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 6, background: "var(--black-3)", cursor: "pointer" }}
                  onClick={() => router.push("/admin/factures")}
                >
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--white)", flex: "0 0 100px" }}>{f.number}</span>
                  <span style={{ fontSize: 12, color: "var(--grey-3)", flex: 1 }}>{f.client?.company}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)" }}>{f.totalHT}€</span>
                  <span style={badge(STATUS_COLORS[f.status])}>{FACTURE_STATUS_LABELS[f.status]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
