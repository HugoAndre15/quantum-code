import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import AdminLayout from "../../components/AdminLayout";
import {
  Card,
  SmallBtn,
  Empty,
  Badge,
  PageHeader,
  TabBar,
  StatBadge,
} from "../../components/admin/SharedUI";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

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

  const [statusFilter, setStatusFilter] = useState("ALL");

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

  // Stats
  const stats = {
    total: factures.length,
    brouillon: factures.filter((f) => f.status === "BROUILLON").length,
    envoyee: factures.filter((f) => f.status === "ENVOYEE").length,
    payee: factures.filter((f) => f.status === "PAYEE").length,
    annulee: factures.filter((f) => f.status === "ANNULEE").length,
    totalPaid: factures
      .filter((f) => f.status === "PAYEE")
      .reduce((s, f) => s + f.totalHT, 0),
    totalPending: factures
      .filter((f) => f.status === "ENVOYEE")
      .reduce((s, f) => s + f.totalHT, 0),
  };

  const STATUS_TABS = [
    { key: "ALL", label: "Toutes" },
    { key: "BROUILLON", label: "Brouillons" },
    { key: "ENVOYEE", label: "Envoyées" },
    { key: "PAYEE", label: "Payées" },
    { key: "ANNULEE", label: "Annulées" },
  ];

  const filteredFactures =
    statusFilter === "ALL"
      ? factures
      : factures.filter((f) => f.status === statusFilter);

  // ─── List View ────────────────────────────
  const renderList = () => (
    <div>
      {/* Stats */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <StatBadge label="Total" value={stats.total} color="var(--white)" />
        <StatBadge label="Encaissé" value={`${stats.totalPaid}€`} color="var(--green)" />
        <StatBadge label="En attente" value={`${stats.totalPending}€`} color="var(--gold)" />
        <StatBadge label="Payées" value={stats.payee} color="var(--green)" />
        <StatBadge label="Annulées" value={stats.annulee} color="#ff6b6b" />
      </div>

      <PageHeader
        title="Factures"
        subtitle="Les factures sont créées depuis les devis acceptés"
        count={filteredFactures.length}
      />

      <TabBar
        tabs={STATUS_TABS}
        activeTab={statusFilter}
        onTabChange={setStatusFilter}
      />

      {filteredFactures.length === 0 ? (
        <Empty>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>▥</div>
          <div style={{ fontSize: 14, marginBottom: 6 }}>Aucune facture</div>
          <div style={{ fontSize: 12, opacity: 0.6 }}>
            {statusFilter === "ALL"
              ? "Acceptez un devis puis transformez-le en facture"
              : "Aucune facture avec ce statut"}
          </div>
        </Empty>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filteredFactures.map((f) => {
            const st = STATUS_MAP[f.status] || STATUS_MAP.BROUILLON;
            return (
              <Card key={f.id} hoverable>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  {/* Number */}
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
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--grey-3)",
                        marginTop: 2,
                      }}
                    >
                      Devis: {f.devis?.number}
                    </div>
                  </div>

                  {/* Client */}
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ fontSize: 13, color: "var(--white)" }}>
                      {f.client?.company}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--grey-3)" }}>
                      {f.client?.contactName}
                    </div>
                  </div>

                  {/* Amount */}
                  <div style={{ flex: "0 0 90px", textAlign: "right" }}>
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

                  {/* Date */}
                  <div
                    style={{
                      flex: "0 0 80px",
                      textAlign: "right",
                      fontSize: 11,
                      color: "var(--grey-3)",
                    }}
                  >
                    {new Date(f.createdAt).toLocaleDateString("fr-FR")}
                  </div>

                  {/* Status badge */}
                  <div style={{ flex: "0 0 90px", textAlign: "center" }}>
                    <Badge color={st.color}>{st.label}</Badge>
                  </div>

                  {/* Action buttons */}
                  <div
                    style={{
                      flex: "0 0 auto",
                      display: "flex",
                      gap: 6,
                      alignItems: "center",
                    }}
                  >
                    <SmallBtn
                      color="var(--blue)"
                      onClick={() => setViewing(f)}
                      title="Voir le détail"
                    >
                      👁 Voir
                    </SmallBtn>
                    <SmallBtn
                      color="var(--gold)"
                      onClick={() => downloadPdf(f.id, f.number)}
                      title="Télécharger le PDF"
                    >
                      📄 PDF
                    </SmallBtn>
                    {f.status === "BROUILLON" && (
                      <SmallBtn
                        color="var(--blue)"
                        onClick={() => updateStatus(f.id, "ENVOYEE")}
                        title="Marquer comme envoyée"
                      >
                        ✉ Envoyer
                      </SmallBtn>
                    )}
                    {f.status === "ENVOYEE" && (
                      <SmallBtn
                        color="var(--green)"
                        onClick={() => updateStatus(f.id, "PAYEE")}
                        title="Marquer comme payée"
                      >
                        ✓ Payée
                      </SmallBtn>
                    )}
                    {f.status !== "PAYEE" && f.status !== "ANNULEE" && (
                      <SmallBtn
                        color="#ff6b6b"
                        onClick={() => {
                          if (confirm("Annuler cette facture ?"))
                            updateStatus(f.id, "ANNULEE");
                        }}
                        title="Annuler"
                      >
                        ✗
                      </SmallBtn>
                    )}
                    {f.status !== "PAYEE" && f.status !== "ANNULEE" && (
                      <SmallBtn
                        color="#ff6b6b"
                        onClick={() => {
                          if (confirm("Supprimer cette facture ?"))
                            deleteFacture(f.id);
                        }}
                        title="Supprimer"
                      >
                        🗑
                      </SmallBtn>
                    )}
                  </div>
                </div>
                {/* Paid date */}
                {f.paidAt && (
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 11,
                      color: "var(--green)",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    ✓ Payée le{" "}
                    {new Date(f.paidAt).toLocaleDateString("fr-FR")}
                  </div>
                )}
              </Card>
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
            <Badge color={st.color}>{st.label}</Badge>
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
