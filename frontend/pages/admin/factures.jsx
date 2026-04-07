import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import AdminLayout from "../../components/AdminLayout";

const API = "/api";

const STATUS_MAP = {
  BROUILLON: { label: "Brouillon", color: "#aaa" },
  ENVOYEE: { label: "Envoyée", color: "var(--blue)" },
  PAYEE: { label: "Payée", color: "var(--green)" },
  ANNULEE: { label: "Annulée", color: "#ff6b6b" },
};

export default function FacturesPage() {
  const { apiFetch } = useAuth();

  const [factures, setFactures] = useState([]);
  const [viewing, setViewing] = useState(null);

  const load = useCallback(async () => {
    const res = await apiFetch(`${API}/factures`);
    if (res.ok) setFactures(await res.json());
  }, [apiFetch]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (id, status) => {
    await apiFetch(`${API}/factures/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
    if (viewing?.id === id) setViewing({ ...viewing, status });
  };

  const deleteFacture = async (id) => {
    await apiFetch(`${API}/factures/${id}`, { method: "DELETE" });
    load();
    setViewing(null);
  };

  const downloadPdf = async (id, number) => {
    const res = await apiFetch(`${API}/factures/${id}/pdf`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const [sending, setSending] = useState(false);
  const sendByEmail = async (id) => {
    if (!confirm("Envoyer cette facture par email au client ?")) return;
    setSending(true);
    try {
      const res = await apiFetch(`${API}/factures/${id}/send-email`, {
        method: "POST",
      });
      if (res.ok) {
        alert("Facture envoyée par email !");
        load();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || "Erreur lors de l'envoi");
      }
    } finally {
      setSending(false);
    }
  };

  // ─── Styles ───────────────────────────────
  const card = {
    background: "var(--black-2)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: 20,
  };

  const btn = (variant = "primary") => ({
    padding: "8px 18px",
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    transition: "all .15s",
    ...(variant === "primary" && { background: "var(--blue)", color: "#fff" }),
    ...(variant === "ghost" && {
      background: "transparent",
      color: "var(--grey-3)",
      border: "1px solid var(--border)",
    }),
    ...(variant === "danger" && {
      background: "rgba(255,80,80,.1)",
      color: "#ff6b6b",
      border: "1px solid rgba(255,80,80,.2)",
    }),
    ...(variant === "success" && {
      background: "rgba(93,216,160,.1)",
      color: "var(--green)",
      border: "1px solid rgba(93,216,160,.2)",
    }),
  });

  const badge = (color) => ({
    display: "inline-block",
    padding: "2px 10px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
    background: `${color}18`,
    color,
  });

  // ─── KPI Cards ────────────────────────────
  const totalFactures = factures.length;
  const totalPaid = factures
    .filter((f) => f.status === "PAYEE")
    .reduce((s, f) => s + f.totalHT, 0);
  const totalPending = factures
    .filter((f) => f.status === "ENVOYEE")
    .reduce((s, f) => s + f.totalHT, 0);
  const paidCount = factures.filter((f) => f.status === "PAYEE").length;

  const renderKPIs = () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 12,
        marginBottom: 24,
      }}
    >
      {[
        {
          label: "Total factures",
          value: totalFactures,
          color: "var(--white)",
        },
        { label: "Encaissé", value: `${totalPaid}€`, color: "var(--green)" },
        {
          label: "En attente",
          value: `${totalPending}€`,
          color: "var(--gold)",
        },
        { label: "Payées", value: paidCount, color: "var(--green)" },
      ].map((kpi, i) => (
        <div key={i} style={{ ...card, padding: 16 }}>
          <div
            style={{
              fontSize: 11,
              color: "var(--grey-3)",
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: ".04em",
            }}
          >
            {kpi.label}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: kpi.color }}>
            {kpi.value}
          </div>
        </div>
      ))}
    </div>
  );

  // ─── List View ────────────────────────────
  const renderList = () => (
    <div>
      {renderKPIs()}

      <div style={{ color: "var(--grey-3)", fontSize: 13, marginBottom: 16 }}>
        {factures.length} facture{factures.length !== 1 ? "s" : ""}
        <span style={{ fontSize: 11, marginLeft: 8, opacity: 0.6 }}>
          Les factures sont créées depuis les devis acceptés
        </span>
      </div>

      {factures.length === 0 ? (
        <div
          style={{
            ...card,
            textAlign: "center",
            padding: 60,
            color: "var(--grey-3)",
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>▥</div>
          <div style={{ fontSize: 14, marginBottom: 6 }}>Aucune facture</div>
          <div style={{ fontSize: 12, opacity: 0.6 }}>
            Acceptez un devis puis transformez-le en facture
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {factures.map((f) => {
            const st = STATUS_MAP[f.status] || STATUS_MAP.BROUILLON;
            return (
              <div
                key={f.id}
                style={{
                  ...card,
                  padding: "14px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  cursor: "pointer",
                  transition: "border-color .15s",
                }}
                onClick={() => setViewing(f)}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor = "var(--blue)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = "var(--border)")
                }
              >
                <div style={{ flex: "0 0 110px" }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--white)",
                    }}
                  >
                    {f.number}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--grey-3)" }}>
                    Devis: {f.devis?.number}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "var(--white)" }}>
                    {f.client?.company}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--grey-3)" }}>
                    {f.client?.contactName}
                  </div>
                </div>
                <div style={{ flex: "0 0 100px", textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--gold)",
                    }}
                  >
                    {f.totalHT}€
                  </div>
                </div>
                <div style={{ flex: "0 0 100px", textAlign: "right" }}>
                  <span style={badge(st.color)}>{st.label}</span>
                </div>
                <div
                  style={{
                    flex: "0 0 90px",
                    textAlign: "right",
                    fontSize: 11,
                    color: "var(--grey-3)",
                  }}
                >
                  {new Date(f.createdAt).toLocaleDateString("fr-FR")}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ─── Detail View ──────────────────────────
  const renderDetail = () => {
    if (!viewing) return null;
    const detail = factures.find((f) => f.id === viewing.id) || viewing;
    const st = STATUS_MAP[detail.status] || STATUS_MAP.BROUILLON;
    const items = detail.devis?.items || [];
    const oneTimeItems = items.filter((i) => !i.recurring);
    const recurringItems = items.filter((i) => i.recurring);

    return (
      <div>
        <button
          style={{ ...btn("ghost"), marginBottom: 20 }}
          onClick={() => setViewing(null)}
        >
          ← Retour à la liste
        </button>

        <div style={{ ...card, marginBottom: 20 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 20,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "var(--white)",
                  marginBottom: 4,
                }}
              >
                {detail.number}
              </div>
              <div style={{ fontSize: 12, color: "var(--grey-3)" }}>
                Devis: {detail.devis?.number}
              </div>
              <div
                style={{ fontSize: 13, color: "var(--grey-3)", marginTop: 4 }}
              >
                {detail.client?.company} — {detail.client?.contactName}
              </div>
              {detail.client?.email && (
                <div
                  style={{ fontSize: 12, color: "var(--grey-3)", marginTop: 2 }}
                >
                  {detail.client.email}
                </div>
              )}
            </div>
            <span style={badge(st.color)}>{st.label}</span>
          </div>

          {/* Items */}
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--grey-3)",
                marginBottom: 10,
                textTransform: "uppercase",
                letterSpacing: ".05em",
              }}
            >
              Prestations
            </div>
            <div style={{ borderTop: "1px solid var(--border)" }}>
              {oneTimeItems.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "10px 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, color: "var(--white)" }}>
                      {item.label}
                      {item.quantity > 1 ? ` × ${item.quantity}` : ""}
                    </div>
                    {item.description && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--grey-3)",
                          marginTop: 2,
                        }}
                      >
                        {item.description}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--gold)",
                    }}
                  >
                    {item.unitPrice * item.quantity}€
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "12px 0",
                borderTop: "2px solid var(--border)",
              }}
            >
              <span
                style={{ fontSize: 14, fontWeight: 700, color: "var(--white)" }}
              >
                Total HT
              </span>
              <span
                style={{ fontSize: 16, fontWeight: 700, color: "var(--gold)" }}
              >
                {detail.totalHT}€
              </span>
            </div>
          </div>

          {/* Recurring */}
          {recurringItems.length > 0 && (
            <div
              style={{
                marginBottom: 20,
                padding: 16,
                background: "var(--black-3)",
                borderRadius: 8,
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--grey-3)",
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: ".05em",
                }}
              >
                Abonnements récurrents
              </div>
              {recurringItems.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 0",
                  }}
                >
                  <span style={{ fontSize: 13, color: "var(--white)" }}>
                    {item.label}
                  </span>
                  <span style={{ fontSize: 13, color: "var(--blue)" }}>
                    {item.unitPrice}€/{item.recurringUnit}
                  </span>
                </div>
              ))}
            </div>
          )}

          {detail.paidAt && (
            <div
              style={{
                padding: 12,
                background: "rgba(93,216,160,.06)",
                borderRadius: 8,
                border: "1px solid rgba(93,216,160,.15)",
                marginBottom: 20,
              }}
            >
              <div
                style={{ fontSize: 11, color: "var(--green)", fontWeight: 600 }}
              >
                ✓ Payée le {new Date(detail.paidAt).toLocaleDateString("fr-FR")}
              </div>
            </div>
          )}

          {detail.notes && (
            <div
              style={{
                padding: 14,
                background: "var(--black-3)",
                borderRadius: 8,
                border: "1px solid var(--border)",
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "var(--grey-3)",
                  marginBottom: 4,
                }}
              >
                Notes
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--white)",
                  whiteSpace: "pre-wrap",
                }}
              >
                {detail.notes}
              </div>
            </div>
          )}

          {/* Actions */}
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {/* PDF & Email — always available */}
            <button
              style={btn("ghost")}
              onClick={() => downloadPdf(detail.id, detail.number)}
            >
              📄 Télécharger PDF
            </button>
            {detail.client?.email && (
              <button
                style={btn("primary")}
                onClick={() => sendByEmail(detail.id)}
                disabled={sending}
              >
                {sending ? "Envoi..." : "✉ Envoyer par email"}
              </button>
            )}

            {/* Status transitions */}
            {detail.status === "BROUILLON" && (
              <>
                <button
                  style={btn("primary")}
                  onClick={() => updateStatus(detail.id, "ENVOYEE")}
                >
                  Marquer comme envoyée
                </button>
                <button
                  style={btn("danger")}
                  onClick={() => updateStatus(detail.id, "ANNULEE")}
                >
                  Annuler
                </button>
              </>
            )}
            {detail.status === "ENVOYEE" && (
              <>
                <button
                  style={btn("success")}
                  onClick={() => updateStatus(detail.id, "PAYEE")}
                >
                  ✓ Marquer comme payée
                </button>
                <button
                  style={btn("danger")}
                  onClick={() => updateStatus(detail.id, "ANNULEE")}
                >
                  Annuler
                </button>
              </>
            )}
            {detail.status !== "PAYEE" && detail.status !== "ANNULEE" && (
              <button
                style={btn("danger")}
                onClick={() => deleteFacture(detail.id)}
              >
                Supprimer
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <AdminLayout title="Factures">
      {viewing ? renderDetail() : renderList()}
    </AdminLayout>
  );
}
