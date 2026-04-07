import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import AdminLayout from "../components/AdminLayout";

const API = "/api";

const STATUS_MAP = {
  A_CONTACTER: { label: "À contacter", color: "#aaa" },
  CONTACTE: { label: "Contacté", color: "var(--blue)" },
  DEVIS: { label: "Devis", color: "var(--gold)" },
  FACTURE: { label: "Facture", color: "#c084fc" },
  EN_COURS: { label: "En cours", color: "var(--green)" },
  TERMINE: { label: "Terminé", color: "#22c55e" },
  REFUSE: { label: "Refusé", color: "#ff6b6b" },
};

export default function AdminPage() {
  const { user, apiFetch } = useAuth();
  const [stats, setStats] = useState(null);
  const [packs, setPacks] = useState([]);
  const [recentClients, setRecentClients] = useState([]);

  useEffect(() => {
    if (user) {
      apiFetch(`${API}/clients/stats`).then(
        (r) => r.ok && r.json().then(setStats),
      );
      apiFetch(`${API}/offers/packs`).then(
        (r) => r.ok && r.json().then(setPacks),
      );
      apiFetch(`${API}/clients`).then(
        (r) => r.ok && r.json().then((d) => setRecentClients(d.slice(0, 5))),
      );
    }
  }, [user, apiFetch]);

  const totalBudget = recentClients.reduce(
    (sum, c) => sum + (c.budget || 0),
    0,
  );

  return (
    <AdminLayout title="Tableau de bord">
      {/* Welcome */}
      <p style={{ fontSize: 14, color: "var(--grey-3)", marginBottom: 28 }}>
        Bienvenue, {user?.name} — espace d&apos;administration Quantum Code.
      </p>

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          marginBottom: 28,
        }}
      >
        <KPI
          label="Total clients"
          value={stats?.total ?? "—"}
          color="var(--blue)"
        />
        <KPI
          label="Budget total"
          value={totalBudget ? `${totalBudget.toLocaleString("fr-FR")}€` : "—"}
          color="var(--gold)"
        />
        <KPI
          label="Packs actifs"
          value={packs.filter((p) => p.active).length}
          color="var(--green)"
        />
        <KPI
          label="Membre depuis"
          value={
            user?.createdAt
              ? new Date(user.createdAt).toLocaleDateString("fr-FR")
              : "—"
          }
          color="var(--grey-3)"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Status breakdown */}
        <div
          style={{
            background: "var(--black-2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-m)",
            padding: "20px 24px",
          }}
        >
          <h3
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--white)",
              marginBottom: 16,
            }}
          >
            Répartition par status
          </h3>
          {stats?.byStatus && Object.keys(stats.byStatus).length > 0 ? (
            <div style={{ display: "grid", gap: 8 }}>
              {Object.entries(stats.byStatus).map(([status, count]) => (
                <div
                  key={status}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: STATUS_MAP[status]?.color || "#aaa",
                      }}
                    />
                    <span style={{ fontSize: 12, color: "var(--grey-3)" }}>
                      {STATUS_MAP[status]?.label || status}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--white)",
                    }}
                  >
                    {count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--grey-3)" }}>
              Aucun client
            </div>
          )}
        </div>

        {/* Recent clients */}
        <div
          style={{
            background: "var(--black-2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-m)",
            padding: "20px 24px",
          }}
        >
          <h3
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--white)",
              marginBottom: 16,
            }}
          >
            Derniers clients
          </h3>
          {recentClients.length > 0 ? (
            <div style={{ display: "grid", gap: 8 }}>
              {recentClients.map((c) => (
                <div
                  key={c.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--white)",
                      }}
                    >
                      {c.company}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--grey-3)" }}>
                      {c.contactName}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: 99,
                      background: `${STATUS_MAP[c.status]?.color || "#aaa"}22`,
                      color: STATUS_MAP[c.status]?.color || "#aaa",
                    }}
                  >
                    {STATUS_MAP[c.status]?.label || c.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--grey-3)" }}>
              Aucun client
            </div>
          )}
        </div>
      </div>

      {/* Packs overview */}
      {packs.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--white)",
              marginBottom: 12,
            }}
          >
            Packs disponibles
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
            }}
          >
            {packs
              .filter((p) => p.active)
              .map((p) => (
                <div
                  key={p.id}
                  style={{
                    background: "var(--black-2)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r-m)",
                    padding: "16px 20px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--white)",
                    }}
                  >
                    {p.name}
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: "var(--gold)",
                      margin: "4px 0",
                    }}
                  >
                    {p.price}€
                  </div>
                  <div style={{ fontSize: 11, color: "var(--grey-3)" }}>
                    {(p.features || []).length} features
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function KPI({ label, value, color }) {
  return (
    <div
      style={{
        background: "var(--black-2)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-m)",
        padding: "18px 20px",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: ".06em",
          color: "var(--grey-3)",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}
