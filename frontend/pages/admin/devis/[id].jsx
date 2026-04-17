import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useAuth } from "../../../context/AuthContext";
import AdminLayout from "../../../components/AdminLayout";

const API = "/api";

const STATUS_MAP = {
  BROUILLON: { label: "Brouillon", color: "#aaa" },
  ENVOYE: { label: "Envoyé", color: "var(--blue)" },
  ACCEPTE: { label: "Accepté", color: "var(--green)" },
  REFUSE: { label: "Refusé", color: "#ff6b6b" },
};

export default function DevisDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { apiFetch } = useAuth();

  const [devis, setDevis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  // Edit state
  const [editItems, setEditItems] = useState([]);
  const [editNotes, setEditNotes] = useState("");
  const [editValidUntil, setEditValidUntil] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await apiFetch(`${API}/devis/${id}`);
      if (res.ok) {
        const data = await res.json();
        setDevis(data);
      } else {
        router.push("/admin/devis");
      }
    } finally {
      setLoading(false);
    }
  }, [id, apiFetch, router]);

  useEffect(() => {
    load();
  }, [load]);

  const startEditing = () => {
    setEditItems(
      (devis.items || []).map((item) => ({
        label: item.label,
        description: item.description || "",
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        devTime: item.devTime || 0,
        recurring: item.recurring || false,
        recurringUnit: item.recurringUnit || "",
        packId: item.packId || undefined,
        serviceOptionId: item.serviceOptionId || undefined,
      }))
    );
    setEditNotes(devis.notes || "");
    setEditValidUntil(
      devis.validUntil ? devis.validUntil.substring(0, 10) : ""
    );
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
  };

  const saveEditing = async () => {
    setSaving(true);
    try {
      const res = await apiFetch(`${API}/devis/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: editNotes,
          validUntil: editValidUntil || undefined,
          items: editItems,
        }),
      });
      if (res.ok) {
        setEditing(false);
        load();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || "Erreur lors de la sauvegarde");
      }
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (status) => {
    await apiFetch(`${API}/devis/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const transformToFacture = async () => {
    const res = await apiFetch(`${API}/devis/${id}/facture`, {
      method: "POST",
    });
    if (res.ok) {
      const facture = await res.json();
      router.push(`/admin/factures/${facture.id}`);
    }
  };

  const deleteDevis = async () => {
    if (!confirm("Supprimer ce devis ?")) return;
    await apiFetch(`${API}/devis/${id}`, { method: "DELETE" });
    router.push("/admin/devis");
  };

  const downloadPdf = async () => {
    const res = await apiFetch(`${API}/devis/${id}/pdf`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${devis.number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const sendByEmail = async () => {
    if (!confirm("Envoyer ce devis par email au client ?")) return;
    setSending(true);
    try {
      const res = await apiFetch(`${API}/devis/${id}/send-email`, {
        method: "POST",
      });
      if (res.ok) {
        alert("Devis envoyé par email !");
        load();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || "Erreur lors de l'envoi");
      }
    } finally {
      setSending(false);
    }
  };

  // Edit item helpers
  const updateItem = (index, field, value) => {
    setEditItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const removeItem = (index) => {
    setEditItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addItem = () => {
    setEditItems((prev) => [
      ...prev,
      {
        label: "",
        description: "",
        unitPrice: 0,
        quantity: 1,
        devTime: 0,
        recurring: false,
        recurringUnit: "",
      },
    ]);
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

  const labelStyle = {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    color: "var(--grey-3)",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: ".04em",
  };

  if (loading || !devis) {
    return (
      <AdminLayout title="Devis">
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

  const st = STATUS_MAP[devis.status] || STATUS_MAP.BROUILLON;
  const isBrouillon = devis.status === "BROUILLON";
  const isLocked = !isBrouillon;
  const oneTimeItems = (devis.items || []).filter((i) => !i.recurring);
  const recurringItems = (devis.items || []).filter((i) => i.recurring);

  return (
    <AdminLayout title={devis.number}>
      {/* Back + Header */}
      <div style={{ marginBottom: 24 }}>
        <Link
          href="/admin/devis"
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
          ← Retour aux devis
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
              {devis.number}
            </h1>
            <div style={{ fontSize: 14, color: "var(--grey-3)" }}>
              <Link
                href={`/admin/clients/${devis.client?.id}`}
                style={{ color: "var(--blue)", textDecoration: "none" }}
              >
                {devis.client?.company}
              </Link>
              {" — "}
              {devis.client?.contactName}
            </div>
            {devis.client?.email && (
              <div
                style={{ fontSize: 12, color: "var(--grey-3)", marginTop: 2 }}
              >
                {devis.client.email}
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
                🔒 Verrouillé
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
              {devis.totalHT}€
            </div>
          </div>
          <div>
            <div style={labelStyle}>Temps de développement</div>
            <div
              style={{ fontSize: 22, fontWeight: 800, color: "var(--white)" }}
            >
              {devis.devTime || 0}h
            </div>
          </div>
          <div>
            <div style={labelStyle}>Validité</div>
            <div
              style={{ fontSize: 14, fontWeight: 600, color: "var(--white)" }}
            >
              {devis.validUntil
                ? new Date(devis.validUntil).toLocaleDateString("fr-FR")
                : "Non définie"}
            </div>
          </div>
        </div>

        <div style={{ fontSize: 11, color: "var(--grey-3)" }}>
          Créé le{" "}
          {new Date(devis.createdAt).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </div>
      </div>

      {/* ─── Editing Mode ─────────────── */}
      {editing ? (
        <div style={{ ...card, marginBottom: 20 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "var(--white)",
              }}
            >
              ✏ Modification des lignes
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={btn("ghost")} onClick={cancelEditing}>
                Annuler
              </button>
              <button
                style={btn("primary")}
                onClick={saveEditing}
                disabled={saving}
              >
                {saving ? "Sauvegarde..." : "💾 Sauvegarder"}
              </button>
            </div>
          </div>

          {/* Notes + validUntil */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
              marginBottom: 20,
            }}
          >
            <div>
              <label style={labelStyle}>Notes</label>
              <textarea
                rows={2}
                style={{ ...inputStyle, resize: "vertical" }}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Validité</label>
              <input
                type="date"
                style={inputStyle}
                value={editValidUntil}
                onChange={(e) => setEditValidUntil(e.target.value)}
              />
            </div>
          </div>

          {/* Items list */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              marginBottom: 16,
            }}
          >
            {editItems.map((item, i) => (
              <div
                key={i}
                style={{
                  padding: 16,
                  background: "var(--black-3)",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--grey-3)",
                    }}
                  >
                    Ligne {i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    style={{
                      fontSize: 11,
                      padding: "3px 10px",
                      borderRadius: 4,
                      border: "1px solid rgba(255,80,80,.2)",
                      background: "transparent",
                      color: "#ff6b6b",
                      cursor: "pointer",
                    }}
                  >
                    ✕ Supprimer
                  </button>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                    marginBottom: 10,
                  }}
                >
                  <div>
                    <label style={labelStyle}>Libellé *</label>
                    <input
                      style={inputStyle}
                      value={item.label}
                      onChange={(e) => updateItem(i, "label", e.target.value)}
                      placeholder="Nom de la prestation"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Description</label>
                    <input
                      style={inputStyle}
                      value={item.description}
                      onChange={(e) =>
                        updateItem(i, "description", e.target.value)
                      }
                      placeholder="Description optionnelle"
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 10,
                  }}
                >
                  <div>
                    <label style={labelStyle}>Prix unitaire (€)</label>
                    <input
                      type="number"
                      style={inputStyle}
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateItem(i, "unitPrice", parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Quantité</label>
                    <input
                      type="number"
                      min={1}
                      style={inputStyle}
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(i, "quantity", parseInt(e.target.value) || 1)
                      }
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Temps dev (h)</label>
                    <input
                      type="number"
                      style={inputStyle}
                      value={item.devTime}
                      onChange={(e) =>
                        updateItem(i, "devTime", parseInt(e.target.value) || 0)
                      }
                    />
                  </div>
                </div>

                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 12 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--white)" }}>
                    <input
                      type="checkbox"
                      checked={item.recurring}
                      onChange={(e) => updateItem(i, "recurring", e.target.checked)}
                      style={{ accentColor: "var(--blue)" }}
                    />
                    Récurrent
                  </label>
                  {item.recurring && (
                    <select
                      style={{ ...inputStyle, width: "auto", minWidth: 100 }}
                      value={item.recurringUnit}
                      onChange={(e) => updateItem(i, "recurringUnit", e.target.value)}
                    >
                      <option value="">—</option>
                      <option value="mois">/ mois</option>
                      <option value="an">/ an</option>
                    </select>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            style={{
              ...btn("ghost"),
              width: "100%",
              textAlign: "center",
              padding: "12px 0",
              borderStyle: "dashed",
            }}
            onClick={addItem}
          >
            + Ajouter une ligne
          </button>
        </div>
      ) : (
        /* ─── Read-only Items ──────────── */
        <div style={{ ...card, marginBottom: 20 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--grey-3)",
                textTransform: "uppercase",
                letterSpacing: ".05em",
              }}
            >
              Prestations
            </div>
            {isBrouillon && (
              <button style={btn("gold")} onClick={startEditing}>
                ✏ Modifier les lignes
              </button>
            )}
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
              {devis.totalHT}€
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
      )}

      {/* Notes */}
      {devis.notes && !editing && (
        <div style={{ ...card, marginBottom: 20 }}>
          <div
            style={{
              fontSize: 11,
              color: "var(--grey-3)",
              marginBottom: 4,
              textTransform: "uppercase",
              letterSpacing: ".05em",
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
            {devis.notes}
          </div>
        </div>
      )}

      {/* Linked facture */}
      {devis.facture && (
        <div
          style={{
            ...card,
            marginBottom: 20,
            borderColor: "rgba(93,216,160,.2)",
            background: "rgba(93,216,160,.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--green)",
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                ✓ Facture liée
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--white)",
                }}
              >
                {devis.facture.number}
              </div>
            </div>
            <Link
              href={`/admin/factures/${devis.facture.id}`}
              style={{
                ...btn("success"),
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              Voir la facture →
            </Link>
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
        <button style={btn("ghost")} onClick={downloadPdf}>
          📄 Télécharger PDF
        </button>

        {devis.client?.email && (
          <button
            style={btn("primary")}
            onClick={sendByEmail}
            disabled={sending}
          >
            {sending ? "Envoi..." : "✉ Envoyer par email"}
          </button>
        )}

        {devis.status === "BROUILLON" && (
          <>
            <button
              style={btn("primary")}
              onClick={() => updateStatus("ENVOYE")}
            >
              Marquer comme envoyé
            </button>
            <button style={btn("danger")} onClick={deleteDevis}>
              Supprimer
            </button>
          </>
        )}

        {devis.status === "ENVOYE" && (
          <>
            <button
              style={btn("success")}
              onClick={() => updateStatus("ACCEPTE")}
            >
              ✓ Accepté
            </button>
            <button
              style={btn("danger")}
              onClick={() => updateStatus("REFUSE")}
            >
              ✗ Refusé
            </button>
          </>
        )}

        {devis.status === "ACCEPTE" && !devis.facture && (
          <button style={btn("success")} onClick={transformToFacture}>
            Transformer en facture →
          </button>
        )}
      </div>
    </AdminLayout>
  );
}
