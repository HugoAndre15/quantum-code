import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import AdminLayout from "../../components/AdminLayout";
import {
  inputStyle,
  Field,
  Card,
  SmallBtn,
  Empty,
  Modal,
  ErrorMsg,
  FormButtons,
  PageHeader,
  Badge,
  TabBar,
  StatBadge,
} from "../../components/admin/SharedUI";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

const TYPE_MAP = {
  PERCENTAGE: { label: "Pourcentage", color: "var(--blue)" },
  FIXED_VALUE: { label: "Valeur fixe", color: "var(--gold)" },
};

const EMPTY_FORM = {
  code: "",
  name: "",
  description: "",
  discountType: "PERCENTAGE",
  discountValue: "",
  minAmount: "",
  maxUses: "",
  startDate: "",
  endDate: "",
  active: true,
};

function getStatus(promo) {
  if (!promo.active) return { label: "Désactivé", color: "#ff6b6b" };
  const now = new Date();
  if (promo.startDate && now < new Date(promo.startDate))
    return { label: "Programmé", color: "var(--gold)" };
  if (promo.endDate && now > new Date(promo.endDate))
    return { label: "Expiré", color: "#aaa" };
  if (promo.maxUses && promo.currentUses >= promo.maxUses)
    return { label: "Épuisé", color: "#aaa" };
  return { label: "Actif", color: "var(--green)" };
}

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR");
}

export default function PromoCodesPage() {
  const { user, apiFetch } = useAuth();

  const [promos, setPromos] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");

  const fetchPromos = useCallback(async () => {
    const res = await apiFetch(`${API}/promo-codes`);
    if (res.ok) setPromos(await res.json());
  }, [apiFetch]);

  useEffect(() => {
    if (user) fetchPromos();
  }, [user, fetchPromos]);

  /* ─── Filters ─────────────────────────── */
  const filteredPromos = promos.filter((p) => {
    if (tab === "all") return true;
    const s = getStatus(p);
    if (tab === "active") return s.label === "Actif";
    if (tab === "scheduled") return s.label === "Programmé";
    if (tab === "expired") return s.label === "Expiré" || s.label === "Épuisé";
    if (tab === "disabled") return s.label === "Désactivé";
    return true;
  });

  /* ─── Stats ───────────────────────────── */
  const activeCount = promos.filter((p) => getStatus(p).label === "Actif").length;
  const scheduledCount = promos.filter((p) => getStatus(p).label === "Programmé").length;
  const totalUses = promos.reduce((s, p) => s + p.currentUses, 0);

  /* ─── Form handlers ───────────────────── */
  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowForm(true);
  }

  function openEdit(promo) {
    setEditId(promo.id);
    setForm({
      code: promo.code || "",
      name: promo.name || "",
      description: promo.description || "",
      discountType: promo.discountType || "PERCENTAGE",
      discountValue:
        promo.discountValue != null ? String(promo.discountValue) : "",
      minAmount: promo.minAmount != null ? String(promo.minAmount) : "",
      maxUses: promo.maxUses != null ? String(promo.maxUses) : "",
      startDate: promo.startDate ? promo.startDate.slice(0, 10) : "",
      endDate: promo.endDate ? promo.endDate.slice(0, 10) : "",
      active: promo.active !== false,
    });
    setError("");
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const body = {
      code: form.code,
      name: form.name,
      description: form.description || undefined,
      discountType: form.discountType,
      discountValue: parseFloat(form.discountValue),
      minAmount: form.minAmount ? parseFloat(form.minAmount) : null,
      maxUses: form.maxUses ? parseInt(form.maxUses) : null,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      active: form.active,
    };

    const url = editId ? `${API}/promo-codes/${editId}` : `${API}/promo-codes`;
    const method = editId ? "PUT" : "POST";

    const res = await apiFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setShowForm(false);
      fetchPromos();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.message || "Erreur");
    }
    setSaving(false);
  }

  async function deletePromo(id) {
    if (!confirm("Supprimer ce code promo ?")) return;
    await apiFetch(`${API}/promo-codes/${id}`, { method: "DELETE" });
    fetchPromos();
  }

  async function toggleActive(promo) {
    await apiFetch(`${API}/promo-codes/${promo.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !promo.active }),
    });
    fetchPromos();
  }

  /* ─── Generate random code ────────────── */
  function generateCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 8; i++)
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    setForm((f) => ({ ...f, code: result }));
  }

  return (
    <AdminLayout title="Codes Promo">
      {/* Stats */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <StatBadge label="Total" value={promos.length} color="var(--white)" />
        <StatBadge label="Actifs" value={activeCount} color="var(--green)" />
        <StatBadge
          label="Programmés"
          value={scheduledCount}
          color="var(--gold)"
        />
        <StatBadge
          label="Utilisations"
          value={totalUses}
          color="var(--blue)"
        />
      </div>

      {/* Header */}
      <PageHeader
        title="Codes Promo"
        subtitle="Gérez vos codes de réduction : pourcentage, valeur fixe, offres
        saisonnières."
        onAdd={openCreate}
        addLabel="Nouveau code"
      />

      {/* Tabs */}
      <TabBar
        tabs={[
          { key: "all", label: `Tous (${promos.length})` },
          { key: "active", label: `Actifs (${activeCount})` },
          { key: "scheduled", label: "Programmés" },
          { key: "expired", label: "Expirés" },
          { key: "disabled", label: "Désactivés" },
        ]}
        activeTab={tab}
        onTabChange={setTab}
      />

      {/* List */}
      <div style={{ display: "grid", gap: 12 }}>
        {filteredPromos.length === 0 && (
          <Empty>Aucun code promo trouvé.</Empty>
        )}
        {filteredPromos.map((p) => {
          const status = getStatus(p);
          const typeInfo = TYPE_MAP[p.discountType] || TYPE_MAP.PERCENTAGE;
          return (
            <Card key={p.id}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ flex: 1 }}>
                  {/* Top row: code + badges */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: "var(--white)",
                        fontFamily: "monospace",
                        letterSpacing: ".08em",
                        background: "var(--black-3)",
                        padding: "2px 10px",
                        borderRadius: "var(--r)",
                        border: "1px solid var(--border-2)",
                      }}
                    >
                      {p.code}
                    </span>
                    <Badge color={status.color}>{status.label}</Badge>
                    <Badge color={typeInfo.color}>{typeInfo.label}</Badge>
                  </div>

                  {/* Name + description */}
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--white)",
                      marginBottom: 2,
                    }}
                  >
                    {p.name}
                  </div>
                  {p.description && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--grey-3)",
                        marginBottom: 6,
                      }}
                    >
                      {p.description}
                    </div>
                  )}

                  {/* Details row */}
                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      flexWrap: "wrap",
                      marginTop: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: "var(--gold)",
                      }}
                    >
                      {p.discountType === "PERCENTAGE"
                        ? `${p.discountValue}%`
                        : `${p.discountValue}€`}
                    </span>
                    {p.minAmount != null && (
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--grey-3)",
                          alignSelf: "center",
                        }}
                      >
                        Min. {p.minAmount}€
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--grey-3)",
                        alignSelf: "center",
                      }}
                    >
                      {p.currentUses}
                      {p.maxUses ? `/${p.maxUses}` : ""} utilisation
                      {p.currentUses !== 1 ? "s" : ""}
                    </span>
                    {(p.startDate || p.endDate) && (
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--grey-3)",
                          alignSelf: "center",
                        }}
                      >
                        📅 {formatDate(p.startDate)} → {formatDate(p.endDate)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    flexShrink: 0,
                    marginLeft: 16,
                  }}
                >
                  <SmallBtn
                    color={p.active ? "var(--gold)" : "var(--green)"}
                    onClick={() => toggleActive(p)}
                    title={p.active ? "Désactiver" : "Activer"}
                  >
                    {p.active ? "⏸" : "▶"}
                  </SmallBtn>
                  <SmallBtn color="var(--blue)" onClick={() => openEdit(p)} title="Modifier">
                    ✎ Modifier
                  </SmallBtn>
                  <SmallBtn color="#ff6b6b" onClick={() => deletePromo(p.id)} title="Supprimer">
                    🗑
                  </SmallBtn>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* ─── Modal Form ───────────────────── */}
      {showForm && (
        <Modal onClose={() => setShowForm(false)} maxWidth={580}>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--white)",
              marginBottom: 24,
            }}
          >
            {editId ? "Modifier le code promo" : "Nouveau code promo"}
          </h2>
          {error && <ErrorMsg>{error}</ErrorMsg>}

          <form onSubmit={handleSubmit}>
            {/* Code + Generate */}
            <Field label="Code *">
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  required
                  style={{ ...inputStyle, flex: 1, textTransform: "uppercase", fontFamily: "monospace" }}
                  value={form.code}
                  onChange={(e) =>
                    setForm({ ...form, code: e.target.value.toUpperCase() })
                  }
                  placeholder="EX: NOEL2025"
                />
                <button
                  type="button"
                  onClick={generateCode}
                  style={{
                    fontSize: 11,
                    padding: "6px 12px",
                    background: "var(--black-3)",
                    border: "1px solid var(--border-2)",
                    borderRadius: "var(--r)",
                    color: "var(--blue)",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  🎲 Générer
                </button>
              </div>
            </Field>

            <Field label="Nom *">
              <input
                required
                style={inputStyle}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Promo de Noël, Soldes d'été..."
              />
            </Field>

            <Field label="Description">
              <textarea
                style={{ ...inputStyle, minHeight: 50, resize: "vertical" }}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Description interne du code promo..."
              />
            </Field>

            {/* Type + Value */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              <Field label="Type de réduction *">
                <select
                  style={inputStyle}
                  value={form.discountType}
                  onChange={(e) =>
                    setForm({ ...form, discountType: e.target.value })
                  }
                >
                  <option value="PERCENTAGE">Pourcentage (%)</option>
                  <option value="FIXED_VALUE">Valeur fixe (€)</option>
                </select>
              </Field>
              <Field
                label={
                  form.discountType === "PERCENTAGE"
                    ? "Réduction (%) *"
                    : "Réduction (€) *"
                }
              >
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  style={inputStyle}
                  value={form.discountValue}
                  onChange={(e) =>
                    setForm({ ...form, discountValue: e.target.value })
                  }
                  placeholder={
                    form.discountType === "PERCENTAGE" ? "Ex: 15" : "Ex: 50"
                  }
                />
              </Field>
            </div>

            {/* Min amount + Max uses */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              <Field label="Montant minimum (€)">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  style={inputStyle}
                  value={form.minAmount}
                  onChange={(e) =>
                    setForm({ ...form, minAmount: e.target.value })
                  }
                  placeholder="Optionnel"
                />
              </Field>
              <Field label="Limite d'utilisations">
                <input
                  type="number"
                  min="0"
                  style={inputStyle}
                  value={form.maxUses}
                  onChange={(e) =>
                    setForm({ ...form, maxUses: e.target.value })
                  }
                  placeholder="Illimité"
                />
              </Field>
            </div>

            {/* Period dates */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              <Field label="Date de début">
                <input
                  type="date"
                  style={inputStyle}
                  value={form.startDate}
                  onChange={(e) =>
                    setForm({ ...form, startDate: e.target.value })
                  }
                />
              </Field>
              <Field label="Date de fin">
                <input
                  type="date"
                  style={inputStyle}
                  value={form.endDate}
                  onChange={(e) =>
                    setForm({ ...form, endDate: e.target.value })
                  }
                />
              </Field>
            </div>

            {/* Active toggle */}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                color: "var(--grey-3)",
                margin: "12px 0",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) =>
                  setForm({ ...form, active: e.target.checked })
                }
              />
              Actif
            </label>

            <FormButtons
              saving={saving}
              onCancel={() => setShowForm(false)}
              submitLabel={editId ? "Mettre à jour" : "Créer le code"}
            />
          </form>
        </Modal>
      )}
    </AdminLayout>
  );
}
