import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useAuth } from "../../../context/AuthContext";
import AdminLayout from "../../../components/AdminLayout";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

const STATUS_MAP = {
  A_CONTACTER: { label: "À contacter", color: "#aaa" },
  CONTACTE: { label: "Contacté", color: "var(--blue)" },
  DEVIS: { label: "Devis", color: "var(--gold)" },
  FACTURE: { label: "Facture", color: "#c084fc" },
  EN_COURS: { label: "En cours", color: "var(--green)" },
  TERMINE: { label: "Terminé", color: "#22c55e" },
  REFUSE: { label: "Refusé", color: "#ff6b6b" },
};

const DEVIS_STATUS = {
  BROUILLON: { label: "Brouillon", color: "#aaa" },
  ENVOYE: { label: "Envoyé", color: "var(--blue)" },
  ACCEPTE: { label: "Accepté", color: "var(--green)" },
  REFUSE: { label: "Refusé", color: "#ff6b6b" },
};

const FACTURE_STATUS = {
  BROUILLON: { label: "Brouillon", color: "#aaa" },
  ENVOYEE: { label: "Envoyée", color: "var(--blue)" },
  PAYEE: { label: "Payée", color: "var(--green)" },
  ANNULEE: { label: "Annulée", color: "#ff6b6b" },
};

export default function ClientDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { apiFetch } = useAuth();

  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await apiFetch(`${API}/clients/${id}`);
      if (res.ok) setClient(await res.json());
      else router.push("/admin/clients");
    } finally {
      setLoading(false);
    }
  }, [id, apiFetch, router]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !client) {
    return (
      <AdminLayout title="Client">
        <div style={{ color: "var(--grey-3)", fontSize: 14, padding: 40, textAlign: "center" }}>
          Chargement...
        </div>
      </AdminLayout>
    );
  }

  const st = STATUS_MAP[client.status] || STATUS_MAP.A_CONTACTER;

  const card = {
    background: "var(--black-2)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: 20,
  };

  const badge = (color) => ({
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 99,
    fontSize: 11,
    fontWeight: 600,
    background: `${color}22`,
    color,
  });

  return (
    <AdminLayout title={client.company}>
      {/* Back + Header */}
      <div style={{ marginBottom: 24 }}>
        <Link
          href="/admin/clients"
          style={{
            fontSize: 13,
            color: "var(--grey-3)",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 16,
          }}
        >
          ← Retour aux clients
        </Link>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--white)", margin: "0 0 4px" }}>
              {client.company}
            </h1>
            <div style={{ fontSize: 14, color: "var(--grey-3)" }}>
              {client.trade && `${client.trade} — `}{client.contactName}
            </div>
          </div>
          <span style={badge(st.color)}>{st.label}</span>
        </div>
      </div>

      {/* Infos client */}
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--grey-3)",
          marginBottom: 14,
          textTransform: "uppercase",
          letterSpacing: ".05em",
        }}>
          Informations
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <InfoItem label="Email" value={client.email} />
          <InfoItem label="Téléphone" value={client.phone} />
          <InfoItem label="Adresse" value={client.address} />
          <InfoItem label="Site web" value={client.website} />
          <InfoItem
            label="Date de contact"
            value={client.contactDate ? new Date(client.contactDate).toLocaleDateString("fr-FR") : null}
          />
          <InfoItem
            label="Présence en ligne"
            value={client.onlinePresence?.length > 0 ? client.onlinePresence.join(", ") : null}
          />
        </div>

        {client.notes && (
          <div style={{
            marginTop: 16,
            padding: 14,
            background: "var(--black-3)",
            borderRadius: 8,
            border: "1px solid var(--border)",
          }}>
            <div style={{ fontSize: 11, color: "var(--grey-3)", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em" }}>
              Notes
            </div>
            <div style={{ fontSize: 13, color: "var(--white)", whiteSpace: "pre-wrap" }}>
              {client.notes}
            </div>
          </div>
        )}
      </div>

      {/* Devis liés */}
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--white)",
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <span style={{ fontSize: 16 }}>▤</span> Devis
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: 99,
            background: "rgba(45,111,255,.12)",
            color: "var(--blue)",
          }}>
            {client.devis?.length || 0}
          </span>
        </div>

        {(!client.devis || client.devis.length === 0) ? (
          <div style={{ fontSize: 12, color: "var(--grey-3)", padding: "12px 0" }}>
            Aucun devis pour ce client
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {client.devis.map((d) => {
              const ds = DEVIS_STATUS[d.status] || DEVIS_STATUS.BROUILLON;
              return (
                <Link
                  key={d.id}
                  href={`/admin/devis/${d.id}`}
                  style={{ textDecoration: "none" }}
                >
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 14px",
                    background: "var(--black-3)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    cursor: "pointer",
                    transition: "border-color .15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--blue)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--white)" }}>{d.number}</div>
                      <div style={{ fontSize: 11, color: "var(--grey-3)" }}>
                        {new Date(d.createdAt).toLocaleDateString("fr-FR")}
                        {d.items?.length > 0 && ` — ${d.items.length} ligne${d.items.length > 1 ? "s" : ""}`}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--gold)" }}>
                        {d.totalHT}€
                      </span>
                      <span style={badge(ds.color)}>{ds.label}</span>
                      <span style={{ fontSize: 12, color: "var(--blue)" }}>→</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Factures liées */}
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--white)",
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <span style={{ fontSize: 16 }}>💳</span> Factures
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: 99,
            background: "rgba(93,216,160,.12)",
            color: "var(--green)",
          }}>
            {client.factures?.length || 0}
          </span>
        </div>

        {(!client.factures || client.factures.length === 0) ? (
          <div style={{ fontSize: 12, color: "var(--grey-3)", padding: "12px 0" }}>
            Aucune facture pour ce client
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {client.factures.map((f) => {
              const fs = FACTURE_STATUS[f.status] || FACTURE_STATUS.BROUILLON;
              return (
                <Link
                  key={f.id}
                  href={`/admin/factures/${f.id}`}
                  style={{ textDecoration: "none" }}
                >
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 14px",
                    background: "var(--black-3)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    cursor: "pointer",
                    transition: "border-color .15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--green)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--white)" }}>{f.number}</div>
                      <div style={{ fontSize: 11, color: "var(--grey-3)" }}>
                        {new Date(f.createdAt).toLocaleDateString("fr-FR")}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--gold)" }}>
                        {f.totalHT}€
                      </span>
                      <span style={badge(fs.color)}>{fs.label}</span>
                      <span style={{ fontSize: 12, color: "var(--green)" }}>→</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10 }}>
        <Link
          href={`/admin/clients`}
          onClick={(e) => {
            e.preventDefault();
            router.push({ pathname: "/admin/clients", query: { edit: client.id } });
          }}
          style={{
            fontSize: 12,
            fontWeight: 600,
            padding: "8px 18px",
            background: "var(--blue)",
            border: "none",
            borderRadius: 6,
            color: "#fff",
            cursor: "pointer",
            textDecoration: "none",
          }}
        >
          ✏ Modifier le client
        </Link>
      </div>
    </AdminLayout>
  );
}

function InfoItem({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, color: "var(--grey-3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: value ? "var(--white)" : "var(--grey-3)" }}>
        {value || "—"}
      </div>
    </div>
  );
}
