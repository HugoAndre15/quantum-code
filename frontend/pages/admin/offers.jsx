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
  TabBar,
} from "../../components/admin/SharedUI";

const API = "/api";

const EMPTY_PACK = {
  name: "",
  description: "",
  price: "",
  devTime: "",
  position: "0",
  active: true,
  features: "",
  includedPages: "0",
  includedOptionIds: [],
};

const EMPTY_BASE = {
  name: "",
  basePrice: "",
  pagePrice: "",
  basePages: "",
  devTimeBase: "",
  devTimePage: "",
  description: "",
  active: true,
};
const EMPTY_OPT = {
  name: "",
  description: "",
  price: "",
  devTime: "",
  category: "general",
  recurring: false,
  recurringUnit: "",
  active: true,
};

export default function OffersPage() {
  const { user, apiFetch } = useAuth();

  const [packs, setPacks] = useState([]);
  const [options, setOptions] = useState([]);
  const [tab, setTab] = useState("packs");

  // Pack form
  const [showPackForm, setShowPackForm] = useState(false);
  const [editPack, setEditPack] = useState(null);
  const [packForm, setPackForm] = useState(EMPTY_PACK);

  // Option form
  const [showOptForm, setShowOptForm] = useState(false);
  const [editOpt, setEditOpt] = useState(null);
  const [optForm, setOptForm] = useState(EMPTY_OPT);

  // Pricing Base
  const [baseForm, setBaseForm] = useState(EMPTY_BASE);
  const [baseSaving, setBaseSaving] = useState(false);
  const [baseError, setBaseError] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchBase = useCallback(async () => {
    const res = await apiFetch(`${API}/offers/pricing-base`);
    if (res.ok) {
      const data = await res.json();
      setBaseForm({
        name: data.name || "",
        basePrice: data.basePrice != null ? String(data.basePrice) : "",
        pagePrice: data.pagePrice != null ? String(data.pagePrice) : "",
        basePages: data.basePages != null ? String(data.basePages) : "",
        devTimeBase: data.devTimeBase != null ? String(data.devTimeBase) : "",
        devTimePage: data.devTimePage != null ? String(data.devTimePage) : "",
        description: data.description || "",
        active: data.active !== false,
      });
    }
  }, [apiFetch]);

  const fetchPacks = useCallback(async () => {
    const res = await apiFetch(`${API}/offers/packs`);
    if (res.ok) setPacks(await res.json());
  }, [apiFetch]);

  const fetchOptions = useCallback(async () => {
    const res = await apiFetch(`${API}/offers/options`);
    if (res.ok) setOptions(await res.json());
  }, [apiFetch]);

  useEffect(() => {
    if (user) {
      fetchPacks();
      fetchOptions();
      fetchBase();
    }
  }, [user, fetchPacks, fetchOptions, fetchBase]);

  // ─── Base handler ─────────────────────
  async function handleBaseSubmit(e) {
    e.preventDefault();
    setBaseSaving(true);
    setBaseError("");
    const body = {
      name: baseForm.name,
      basePrice: parseFloat(baseForm.basePrice),
      pagePrice: parseFloat(baseForm.pagePrice),
      basePages: parseInt(baseForm.basePages) || 0,
      devTimeBase: baseForm.devTimeBase ? parseFloat(baseForm.devTimeBase) : 0,
      devTimePage: baseForm.devTimePage ? parseFloat(baseForm.devTimePage) : 0,
      description: baseForm.description || undefined,
      active: baseForm.active,
    };
    const res = await apiFetch(`${API}/offers/pricing-base`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setBaseError(data.message || "Erreur");
    }
    setBaseSaving(false);
  }

  // ─── Pack handlers ────────────────────
  function openCreatePack() {
    setEditPack(null);
    setPackForm(EMPTY_PACK);
    setError("");
    setShowPackForm(true);
  }

  function openEditPack(p) {
    setEditPack(p.id);
    setPackForm({
      name: p.name || "",
      description: p.description || "",
      price: p.price != null ? String(p.price) : "",
      devTime: p.devTime != null ? String(p.devTime) : "",
      position: p.position != null ? String(p.position) : "0",
      active: p.active !== false,
      features: (p.features || []).join(", "),
      includedPages: p.includedPages != null ? String(p.includedPages) : "0",
      includedOptionIds: (p.includedOptions || []).map(
        (io) => io.serviceOption?.id || io.serviceOptionId
      ),
    });
    setError("");
    setShowPackForm(true);
  }

  async function handlePackSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const body = {
      name: packForm.name,
      description: packForm.description || undefined,
      price: parseFloat(packForm.price),
      devTime: packForm.devTime ? parseFloat(packForm.devTime) : 0,
      position: parseInt(packForm.position) || 0,
      active: packForm.active,
      features: packForm.features
        ? packForm.features
            .split(",")
            .map((f) => f.trim())
            .filter(Boolean)
        : [],
      includedPages: parseInt(packForm.includedPages) || 0,
      includedOptionIds: packForm.includedOptionIds || [],
    };

    const url = editPack
      ? `${API}/offers/packs/${editPack}`
      : `${API}/offers/packs`;
    const method = editPack ? "PUT" : "POST";

    const res = await apiFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setShowPackForm(false);
      fetchPacks();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.message || "Erreur");
    }
    setSaving(false);
  }

  async function deletePack(id) {
    if (!confirm("Supprimer ce pack ?")) return;
    await apiFetch(`${API}/offers/packs/${id}`, { method: "DELETE" });
    fetchPacks();
  }

  // ─── Option handlers ─────────────────
  function openCreateOpt() {
    setEditOpt(null);
    setOptForm(EMPTY_OPT);
    setError("");
    setShowOptForm(true);
  }

  function openEditOpt(o) {
    setEditOpt(o.id);
    setOptForm({
      name: o.name || "",
      description: o.description || "",
      price: o.price != null ? String(o.price) : "",
      devTime: o.devTime != null ? String(o.devTime) : "",
      category: o.category || "general",
      recurring: o.recurring || false,
      recurringUnit: o.recurringUnit || "",
      active: o.active !== false,
    });
    setError("");
    setShowOptForm(true);
  }

  async function handleOptSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const body = {
      name: optForm.name,
      description: optForm.description || undefined,
      price: parseFloat(optForm.price),
      devTime: optForm.devTime ? parseFloat(optForm.devTime) : 0,
      category: optForm.category || "general",
      recurring: optForm.recurring,
      recurringUnit: optForm.recurring ? optForm.recurringUnit || "mois" : null,
      active: optForm.active,
    };

    const url = editOpt
      ? `${API}/offers/options/${editOpt}`
      : `${API}/offers/options`;
    const method = editOpt ? "PUT" : "POST";

    const res = await apiFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setShowOptForm(false);
      fetchOptions();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.message || "Erreur");
    }
    setSaving(false);
  }

  async function deleteOpt(id) {
    if (!confirm("Supprimer cette option ?")) return;
    await apiFetch(`${API}/offers/options/${id}`, { method: "DELETE" });
    fetchOptions();
  }

  const headerProps = {
    packs: { title: "Packs", onAdd: openCreatePack, addLabel: "Nouveau pack" },
    options: { title: "Options", onAdd: openCreateOpt, addLabel: "Nouvelle option" },
    base: { title: "Tarification de base" },
  };

  return (
    <AdminLayout title="Offres">
      {/* Header */}
      <PageHeader
        title={headerProps[tab].title}
        subtitle="Gérez les packs et options de votre catalogue."
        onAdd={headerProps[tab].onAdd}
        addLabel={headerProps[tab].addLabel}
      />

      {/* Tabs */}
      <TabBar
        tabs={[
          { key: "base", label: "Base" },
          { key: "packs", label: `Packs (${packs.length})` },
          { key: "options", label: `Options (${options.length})` },
        ]}
        activeTab={tab}
        onTabChange={setTab}
      />

      {/* Base tab */}
      {tab === "base" && (
        <Card>
          {baseError && <ErrorMsg>{baseError}</ErrorMsg>}
          <form onSubmit={handleBaseSubmit}>
            <Field label="Nom *">
              <input
                required
                style={inputStyle}
                value={baseForm.name}
                onChange={(e) => setBaseForm({ ...baseForm, name: e.target.value })}
              />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              <Field label="Prix de base (€) *">
                <input
                  required
                  type="number"
                  step="0.01"
                  style={inputStyle}
                  value={baseForm.basePrice}
                  onChange={(e) => setBaseForm({ ...baseForm, basePrice: e.target.value })}
                />
              </Field>
              <Field label="Prix par page (€) *">
                <input
                  required
                  type="number"
                  step="0.01"
                  style={inputStyle}
                  value={baseForm.pagePrice}
                  onChange={(e) => setBaseForm({ ...baseForm, pagePrice: e.target.value })}
                />
              </Field>
              <Field label="Pages incluses *">
                <input
                  required
                  type="number"
                  step="1"
                  style={inputStyle}
                  value={baseForm.basePages}
                  onChange={(e) => setBaseForm({ ...baseForm, basePages: e.target.value })}
                />
              </Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Temps de dev base (h)">
                <input
                  type="number"
                  step="0.5"
                  style={inputStyle}
                  placeholder="0"
                  value={baseForm.devTimeBase}
                  onChange={(e) => setBaseForm({ ...baseForm, devTimeBase: e.target.value })}
                />
              </Field>
              <Field label="Temps de dev par page (h)">
                <input
                  type="number"
                  step="0.5"
                  style={inputStyle}
                  placeholder="0"
                  value={baseForm.devTimePage}
                  onChange={(e) => setBaseForm({ ...baseForm, devTimePage: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Description">
              <textarea
                style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
                value={baseForm.description}
                onChange={(e) => setBaseForm({ ...baseForm, description: e.target.value })}
              />
            </Field>
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
                checked={baseForm.active}
                onChange={(e) => setBaseForm({ ...baseForm, active: e.target.checked })}
              />
              Actif
            </label>
            <FormButtons
              saving={baseSaving}
              onCancel={() => fetchBase()}
              submitLabel="Enregistrer"
            />
          </form>
        </Card>
      )}

      {/* Packs list */}
      {tab === "packs" && (
        <div style={{ display: "grid", gap: 12 }}>
          {packs.length === 0 && <Empty>Aucun pack créé pour le moment.</Empty>}
          {packs.map((p) => (
            <Card key={p.id}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: "var(--white)",
                      }}
                    >
                      {p.name}
                    </span>
                    {!p.active && (
                      <span
                        style={{
                          fontSize: 10,
                          padding: "2px 8px",
                          borderRadius: 99,
                          background: "rgba(255,80,80,.15)",
                          color: "#ff6b6b",
                        }}
                      >
                        Inactif
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 12,
                      margin: "8px 0",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: "var(--gold)",
                      }}
                    >
                      {p.price}€
                    </span>
                    {p.devTime > 0 && (
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--blue)",
                          fontWeight: 600,
                        }}
                      >
                        ⏱ {p.devTime}h
                      </span>
                    )}
                  </div>
                  {p.description && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--grey-3)",
                        marginBottom: 8,
                      }}
                    >
                      {p.description}
                    </div>
                  )}
                  {p.features && p.features.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                        marginTop: 4,
                      }}
                    >
                      {p.features.map((f, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: 11,
                            padding: "2px 8px",
                            borderRadius: "var(--r)",
                            background: "var(--black-3)",
                            color: "var(--green)",
                            border: "1px solid var(--border-2)",
                          }}
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                  {p.includedPages > 0 && (
                    <div style={{ fontSize: 12, color: "var(--blue)", marginTop: 6 }}>
                      📄 {p.includedPages} page{p.includedPages > 1 ? "s" : ""} incluse{p.includedPages > 1 ? "s" : ""}
                    </div>
                  )}
                  {p.includedOptions && p.includedOptions.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                        marginTop: 6,
                      }}
                    >
                      {p.includedOptions.map((io, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: 11,
                            padding: "2px 8px",
                            borderRadius: "var(--r)",
                            background: "rgba(139,92,246,.12)",
                            color: "#a78bfa",
                            border: "1px solid rgba(139,92,246,.25)",
                          }}
                        >
                          {io.serviceOption?.name || "Option"}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <SmallBtn color="var(--blue)" onClick={() => openEditPack(p)} title="Modifier">
                    ✎ Modifier
                  </SmallBtn>
                  <SmallBtn color="#ff6b6b" onClick={() => deletePack(p.id)} title="Supprimer">
                    🗑
                  </SmallBtn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Options list */}
      {tab === "options" && (
        <div style={{ display: "grid", gap: 12 }}>
          {options.length === 0 && (
            <Empty>Aucune option créée pour le moment.</Empty>
          )}
          {options.map((o) => (
            <Card key={o.id}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--white)",
                      }}
                    >
                      {o.name}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        padding: "2px 8px",
                        borderRadius: 99,
                        background: "var(--black-3)",
                        color: "var(--grey-3)",
                        border: "1px solid var(--border-2)",
                      }}
                    >
                      {o.category}
                    </span>
                    {!o.active && (
                      <span
                        style={{
                          fontSize: 10,
                          padding: "2px 8px",
                          borderRadius: 99,
                          background: "rgba(255,80,80,.15)",
                          color: "#ff6b6b",
                        }}
                      >
                        Inactif
                      </span>
                    )}
                  </div>
                  {o.description && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--grey-3)",
                        marginTop: 4,
                      }}
                    >
                      {o.description}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: "var(--gold)",
                    }}
                  >
                    {o.price}€{o.recurring ? `/${o.recurringUnit}` : ""}
                  </span>
                  {o.devTime > 0 && (
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--blue)",
                        fontWeight: 600,
                      }}
                    >
                      ⏱ {o.devTime}h
                    </span>
                  )}
                  <SmallBtn color="var(--blue)" onClick={() => openEditOpt(o)} title="Modifier">
                    ✎ Modifier
                  </SmallBtn>
                  <SmallBtn color="#ff6b6b" onClick={() => deleteOpt(o.id)} title="Supprimer">
                    🗑
                  </SmallBtn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      {/* Pack modal */}
      {showPackForm && (
        <Modal onClose={() => setShowPackForm(false)}>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--white)",
              marginBottom: 24,
            }}
          >
            {editPack ? "Modifier le pack" : "Nouveau pack"}
          </h2>
          {error && <ErrorMsg>{error}</ErrorMsg>}
          <form onSubmit={handlePackSubmit}>
            <Field label="Nom *">
              <input
                required
                style={inputStyle}
                value={packForm.name}
                onChange={(e) =>
                  setPackForm({ ...packForm, name: e.target.value })
                }
              />
            </Field>
            <Field label="Description">
              <textarea
                style={{ ...inputStyle, minHeight: 50, resize: "vertical" }}
                value={packForm.description}
                onChange={(e) =>
                  setPackForm({ ...packForm, description: e.target.value })
                }
              />
            </Field>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 16,
              }}
            >
              <Field label="Prix (€) *">
                <input
                  required
                  type="number"
                  step="0.01"
                  style={inputStyle}
                  value={packForm.price}
                  onChange={(e) =>
                    setPackForm({ ...packForm, price: e.target.value })
                  }
                />
              </Field>
              <Field label="Temps de dev (h)">
                <input
                  type="number"
                  step="0.5"
                  style={inputStyle}
                  placeholder="0"
                  value={packForm.devTime}
                  onChange={(e) =>
                    setPackForm({ ...packForm, devTime: e.target.value })
                  }
                />
              </Field>
              <Field label="Position">
                <input
                  type="number"
                  style={inputStyle}
                  value={packForm.position}
                  onChange={(e) =>
                    setPackForm({ ...packForm, position: e.target.value })
                  }
                />
              </Field>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              <Field label="Pages incluses">
                <input
                  type="number"
                  step="1"
                  min="0"
                  style={inputStyle}
                  value={packForm.includedPages}
                  onChange={(e) =>
                    setPackForm({ ...packForm, includedPages: e.target.value })
                  }
                />
              </Field>
            </div>
            <Field label="Features (séparées par des virgules)">
              <input
                style={inputStyle}
                placeholder="Site vitrine, SEO, Responsive..."
                value={packForm.features}
                onChange={(e) =>
                  setPackForm({ ...packForm, features: e.target.value })
                }
              />
            </Field>
            {options.length > 0 && (
              <div style={{ margin: "16px 0" }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--white)",
                    marginBottom: 8,
                  }}
                >
                  Options incluses
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 6,
                  }}
                >
                  {options.map((opt) => (
                    <label
                      key={opt.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 12,
                        color: "var(--grey-3)",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={packForm.includedOptionIds.includes(opt.id)}
                        onChange={(e) => {
                          const ids = e.target.checked
                            ? [...packForm.includedOptionIds, opt.id]
                            : packForm.includedOptionIds.filter((id) => id !== opt.id);
                          setPackForm({ ...packForm, includedOptionIds: ids });
                        }}
                      />
                      {opt.name} ({opt.price}€)
                    </label>
                  ))}
                </div>
              </div>
            )}
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
                checked={packForm.active}
                onChange={(e) =>
                  setPackForm({ ...packForm, active: e.target.checked })
                }
              />
              Actif
            </label>
            <FormButtons
              saving={saving}
              onCancel={() => setShowPackForm(false)}
              submitLabel={editPack ? "Mettre à jour" : "Créer le pack"}
            />
          </form>
        </Modal>
      )}

      {/* Option modal */}
      {showOptForm && (
        <Modal onClose={() => setShowOptForm(false)}>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--white)",
              marginBottom: 24,
            }}
          >
            {editOpt ? "Modifier l'option" : "Nouvelle option"}
          </h2>
          {error && <ErrorMsg>{error}</ErrorMsg>}
          <form onSubmit={handleOptSubmit}>
            <Field label="Nom *">
              <input
                required
                style={inputStyle}
                value={optForm.name}
                onChange={(e) =>
                  setOptForm({ ...optForm, name: e.target.value })
                }
              />
            </Field>
            <Field label="Description">
              <textarea
                style={{ ...inputStyle, minHeight: 50, resize: "vertical" }}
                value={optForm.description}
                onChange={(e) =>
                  setOptForm({ ...optForm, description: e.target.value })
                }
              />
            </Field>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 16,
              }}
            >
              <Field label="Prix (€) *">
                <input
                  required
                  type="number"
                  step="0.01"
                  style={inputStyle}
                  value={optForm.price}
                  onChange={(e) =>
                    setOptForm({ ...optForm, price: e.target.value })
                  }
                />
              </Field>
              <Field label="Temps de dev (h)">
                <input
                  type="number"
                  step="0.5"
                  style={inputStyle}
                  placeholder="0"
                  value={optForm.devTime}
                  onChange={(e) =>
                    setOptForm({ ...optForm, devTime: e.target.value })
                  }
                />
              </Field>
              <Field label="Catégorie">
                <input
                  style={inputStyle}
                  placeholder="general, design, seo..."
                  value={optForm.category}
                  onChange={(e) =>
                    setOptForm({ ...optForm, category: e.target.value })
                  }
                />
              </Field>
            </div>
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
                checked={optForm.recurring}
                onChange={(e) =>
                  setOptForm({
                    ...optForm,
                    recurring: e.target.checked,
                    recurringUnit: e.target.checked
                      ? optForm.recurringUnit || "mois"
                      : "",
                  })
                }
              />
              Récurrent
            </label>
            {optForm.recurring && (
              <Field label="Unité récurrente">
                <select
                  style={inputStyle}
                  value={optForm.recurringUnit}
                  onChange={(e) =>
                    setOptForm({ ...optForm, recurringUnit: e.target.value })
                  }
                >
                  <option value="mois">Par mois</option>
                  <option value="an">Par an</option>
                </select>
              </Field>
            )}
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
                checked={optForm.active}
                onChange={(e) =>
                  setOptForm({ ...optForm, active: e.target.checked })
                }
              />
              Actif
            </label>
            <FormButtons
              saving={saving}
              onCancel={() => setShowOptForm(false)}
              submitLabel={editOpt ? "Mettre à jour" : "Créer l'option"}
            />
          </form>
        </Modal>
      )}
    </AdminLayout>
  );
}

// Shared components imported from ../../components/admin/SharedUI
