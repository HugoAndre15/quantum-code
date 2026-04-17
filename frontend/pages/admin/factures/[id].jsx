import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useAuth } from "../../../context/AuthContext";
import AdminLayout from "../../../components/AdminLayout";

const API = "/api";

const STATUS_MAP = {
  BROUILLON: { label: "Brouillon", color: "#aaa" },
  ENVOYEE: { label: "Envoyée", color: "var(--blue)" },
  PAYEE: { label: "Payée", color: "var(--green)" },
  ANNULEE: { label: "Annulée", color: "#ff6b6b" },
};

export default function FactureDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { apiFetch } = useAuth();

  const [facture, setFacture] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await apiFetch(`${API}/factures/${id}`);
      if (res.ok) {
        const data = await res.json();
        setFacture(data);
      } else {
        router.push("/admin/factures");
      }
    } finally {
      setLoading(false);
    }
  }, [id, apiFetch, router]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (status) => {
    await apiFetch(`${API}/factures/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const deleteFacture = async () => {
    if (!confirm("Supprimer cette facture ?")) return;
    await apiFetch(`${API}/factures/${id}`, { method: "DELETE" });
    router.push("/admin/factures");
  };

  const downloadPdf = async () => {
    const res = await apiFetch(`${API}/factures/${id}/pdf`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${facture.number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const sendByEmail = async () => {
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

  const startEditNotes = () => {
    setNotesValue(facture.notes || "");
    setEditingNotes(true);
  };

  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      const res = await apiFetch(`${API}/factures/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesValue }),
      });
      if (res.ok) {
        setEditingNotes(false);
        load();
      }
    } finally {
      setSavingNotes(false);
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
    ...(variant === "gold" && {
      background: "rgba(245,190,80,.1)",
      color: "var(--gold)",
      border: "1px solid rgba(245,190,80,.2)",
    }),
  });

  const badge = (color) => ({
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 99,
    fontSize: 11,
    fontWeight: 600,
    background: `${color}22`,
    color,
  });

  const labelStyle = {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    color: "var(--grey-3)",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: ".04em",
  };

  const inputStyle = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 6,
    border: "1px solid var(--border)",
    background: "var(--black-3)",
    color: "var(--white)",
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
  };

  if (loading || !facture) {
    return (
      <AdminLayout title="Facture">
        <div
          style={{
            color: "var(--grey-3)",
            fontSize: 14,
            padding: 40,
            textAlign: "center",
          }}
        >
          Chargement...
        </div>
      </AdminLayout>
    );
  }

  const st = STATUS_MAP[facture.status] || STATUS_MAP.BROUILLON;
  const isLocked = facture.status === "PAYEE" || facture.status === "ANNULEE";
  const items = facture.devis?.items || [];
  const oneTimeItems = items.filter((i) => !i.recurring);
  const recurringItems = items.filter((i) => i.recurring);

  return (
    <AdminLayout title={facture.number}>
      {/* Back + Header */}
      <div style={{ marginBottom: 24 }}>
        <Link
          href="/admin/factures"
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
          ← Retour aux factures
        </Link>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: "var(--white)",
                margin: "0 0 4px",
              }}
            >
              {facture.number}
            </h1>
            <div style={{ fontSize: 14, color: "var(--grey-3)" }}>
              <Link
                href={`/admin/clients/${facture.client?.id}`}
                style={{ color: "var(--blue)", textDecoration: "none" }}
              >
                {facture.client?.company}
              </Link>
              {" — "}
              {facture.client?.contactName}
            </div>
            {facture.client?.email && (
              <div
                style={{ fontSize: 12, color: "var(--grey-3)", marginTop: 2 }}
              >
                {facture.client.email}
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {isLocked && (
              <span
                style={{
                  fontSize: 11,
                  color: "var(--grey-3)",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                🔒 Verrouillée
              </span>
            )}
            <span style={badge(st.color)}>{st.label}</span>
          </div>
        </div>
      </div>

      {/* Infos */}
      <div style={{ ...card, marginBottom: 20 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <div>
            <div style={labelStyle}>Total HT</div>
            <div
              style={{ fontSize: 22, fontWeight: 800, color: "var(--gold)" }}
            >
              {facture.totalHT}€
            </div>
          </div>
          <div>
            <div style={labelStyle}>Devis associé</div>
            <Link
              href={`/admin/devis/${facture.devis?.id}`}
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--blue)",
                textDecoration: "none",
              }}
            >
              {facture.devis?.number} →
            </Link>
          </div>
          <div>
            <div style={labelStyle}>Créée le</div>
            <div
              style={{ fontSize: 14, fontWeight: 600, color: "var(--white)" }}
            >
              {new Date(facture.createdAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
          </div>
        </div>

        {facture.paidAt && (
          <div
            style={{
              padding: 12,
              background: "rgba(93,216,160,.06)",
              borderRadius: 8,
              border: "1px solid rgba(93,216,160,.15)",
            }}
          >
            <div
              style={{ fontSize: 12, color: "var(--green)", fontWeight: 600 }}
            >
              ✓ Payée le{" "}
              {new Date(facture.paidAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
          </div>
        )}
      </div>

      {/* Items */}
      <div style={{ ...card, marginBottom: 20 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--grey-3)",
            marginBottom: 14,
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
                {item.devTime > 0 && (
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--blue)",
                      marginTop: 2,
                    }}
                  >
                    ⏱ {item.devTime * item.quantity}h
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
            {facture.totalHT}€
          </span>
        </div>

        {/* Recurring */}
        {recurringItems.length > 0 && (
          <div
            style={{
              marginTop: 16,
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
      </div>

      {/* Notes */}
      <div style={{ ...card, marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <div style={labelStyle}>Notes</div>
          {!isLocked && !editingNotes && (
            <button
              style={{ ...btn("gold"), padding: "4px 12px", fontSize: 11 }}
              onClick={startEditNotes}
            >
              ✏ Modifier
            </button>
          )}
        </div>

        {editingNotes ? (
          <div>
            <textarea
              rows={4}
              style={{ ...inputStyle, resize: "vertical", marginBottom: 10 }}
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              placeholder="Ajouter des notes..."
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                style={btn("ghost")}
                onClick={() => setEditingNotes(false)}
              >
                Annuler
              </button>
              <button
                style={btn("primary")}
                onClick={saveNotes}
                disabled={savingNotes}
              >
                {savingNotes ? "..." : "💾 Sauvegarder"}
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              fontSize: 13,
              color: facture.notes ? "var(--white)" : "var(--grey-3)",
              whiteSpace: "pre-wrap",
            }}
          >
            {facture.notes || "Aucune note"}
          </div>
        )}
      </div>

      {/* Actions */}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <button style={btn("ghost")} onClick={downloadPdf}>
          📄 Télécharger PDF
        </button>

        {facture.client?.email && (
          <button
            style={btn("primary")}
            onClick={sendByEmail}
            disabled={sending}
          >
            {sending ? "Envoi..." : "✉ Envoyer par email"}
          </button>
        )}

        {facture.status === "BROUILLON" && (
          <>
            <button
              style={btn("primary")}
              onClick={() => updateStatus("ENVOYEE")}
            >
              Marquer comme envoyée
            </button>
            <button
              style={btn("danger")}
              onClick={() => updateStatus("ANNULEE")}
            >
              Annuler
            </button>
            <button style={btn("danger")} onClick={deleteFacture}>
              Supprimer
            </button>
          </>
        )}

        {facture.status === "ENVOYEE" && (
          <>
            <button
              style={btn("success")}
              onClick={() => updateStatus("PAYEE")}
            >
              ✓ Marquer comme payée
            </button>
            <button
              style={btn("danger")}
              onClick={() => updateStatus("ANNULEE")}
            >
              Annuler
            </button>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
