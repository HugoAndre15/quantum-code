import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../context/AuthContext";
import AdminLayout from "../../components/AdminLayout";
import {
  inputStyle as sharedInputStyle,
  Field,
  Modal,
  ErrorMsg,
  SmallBtn,
  PageHeader,
  Badge,
  StatBadge,
  FilterBtn,
  InfoItem,
} from "../../components/admin/SharedUI";

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

const ONLINE_PRESENCE_OPTIONS = [
  "Site web (ancien)",
  "Facebook",
  "Instagram",
  "Google Business",
  "Réseaux sociaux",
  "Aucune",
];

const STEPS = [
  { label: "Entreprise", icon: "1" },
  { label: "Coordonnées", icon: "2" },
  { label: "Infos", icon: "3" },
  { label: "Récapitulatif", icon: "4" },
];

const EMPTY_FORM = {
  company: "",
  trade: "",
  contactName: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  status: "A_CONTACTER",
  notes: "",
  contactDate: new Date().toISOString().slice(0, 10),
  onlinePresence: [],
};

export default function ClientsPage() {
  const { user, apiFetch } = useAuth();
  const router = useRouter();

  const [clients, setClients] = useState([]);
  const [stats, setStats] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [viewingClient, setViewingClient] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Address autocomplete
  const [addrQuery, setAddrQuery] = useState("");
  const [addrSuggestions, setAddrSuggestions] = useState([]);
  const [showAddrDrop, setShowAddrDrop] = useState(false);
  const addrTimeout = useRef(null);

  const fetchClients = useCallback(async () => {
    const url = filterStatus
      ? `${API}/clients?status=${filterStatus}`
      : `${API}/clients`;
    const res = await apiFetch(url);
    if (res.ok) setClients(await res.json());
  }, [filterStatus, apiFetch]);

  const fetchMeta = useCallback(async () => {
    const sRes = await apiFetch(`${API}/clients/stats`);
    if (sRes.ok) setStats(await sRes.json());
  }, [apiFetch]);

  useEffect(() => {
    if (user) {
      fetchClients();
      fetchMeta();
    }
  }, [user, fetchClients, fetchMeta]);

  /* ---------- Address autocomplete ---------- */
  function handleAddrInput(value) {
    setAddrQuery(value);
    setForm((f) => ({ ...f, address: value }));
    clearTimeout(addrTimeout.current);
    if (value.length < 3) {
      setAddrSuggestions([]);
      return;
    }
    addrTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(value)}&limit=5`,
        );
        const data = await res.json();
        setAddrSuggestions(
          (data.features || []).map((f) => f.properties.label),
        );
        setShowAddrDrop(true);
      } catch {
        setAddrSuggestions([]);
      }
    }, 300);
  }

  function selectAddr(label) {
    setForm((f) => ({ ...f, address: label }));
    setAddrQuery(label);
    setShowAddrDrop(false);
  }

  /* ---------- Online presence toggle ---------- */
  function togglePresence(val) {
    setForm((prev) => ({
      ...prev,
      onlinePresence: prev.onlinePresence.includes(val)
        ? prev.onlinePresence.filter((v) => v !== val)
        : [...prev.onlinePresence, val],
    }));
  }

  /* ---------- Form open / close ---------- */
  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setAddrQuery("");
    setStep(0);
    setError("");
    setShowForm(true);
  }

  function openEdit(client) {
    setEditing(client.id);
    const addr = client.address || "";
    setForm({
      company: client.company || "",
      trade: client.trade || "",
      contactName: client.contactName || "",
      address: addr,
      phone: client.phone || "",
      email: client.email || "",
      website: client.website || "",
      status: client.status || "A_CONTACTER",
      notes: client.notes || "",
      contactDate: client.contactDate ? client.contactDate.slice(0, 10) : "",
      onlinePresence: Array.isArray(client.onlinePresence)
        ? client.onlinePresence
        : [],
    });
    setAddrQuery(addr);
    setStep(0);
    setError("");
    setShowForm(true);
  }

  /* ---------- Submit ---------- */
  async function handleSubmit() {
    setSaving(true);
    setError("");

    const body = {
      ...form,
      contactDate: form.contactDate || undefined,
    };

    const url = editing ? `${API}/clients/${editing}` : `${API}/clients`;
    const method = editing ? "PUT" : "POST";

    const res = await apiFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setShowForm(false);
      fetchClients();
      fetchMeta();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.message || "Erreur lors de la sauvegarde");
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm("Supprimer ce client ?")) return;
    await apiFetch(`${API}/clients/${id}`, { method: "DELETE" });
    fetchClients();
    fetchMeta();
  }

  async function viewClient(id) {
    setLoadingDetail(true);
    try {
      const res = await apiFetch(`${API}/clients/${id}`);
      if (res.ok) {
        setViewingClient(await res.json());
      }
    } finally {
      setLoadingDetail(false);
    }
  }

  /* ---------- Step validation ---------- */
  function canNext() {
    if (step === 0) return form.company && form.trade && form.contactName;
    return true;
  }

  function nextStep() {
    if (step < STEPS.length - 1) setStep(step + 1);
  }
  function prevStep() {
    if (step > 0) setStep(step - 1);
  }

  /* ---------- Styles ---------- */
  const inputStyle = sharedInputStyle;

  return (
    <AdminLayout title="Clients">
      {/* Stats row */}
      {stats && (
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 24,
            flexWrap: "wrap",
          }}
        >
          <StatBadge label="Total" value={stats.total} color="var(--white)" />
          {stats.byStatus &&
            Object.entries(stats.byStatus).map(([status, count]) => (
              <StatBadge
                key={status}
                label={STATUS_MAP[status]?.label || status}
                value={count}
                color={STATUS_MAP[status]?.color || "#aaa"}
              />
            ))}
        </div>
      )}

      {/* Filter + add button */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <FilterBtn active={!filterStatus} onClick={() => setFilterStatus("")}>
            Tous
          </FilterBtn>
          {Object.entries(STATUS_MAP).map(([key, { label }]) => (
            <FilterBtn
              key={key}
              active={filterStatus === key}
              onClick={() => setFilterStatus(key)}
            >
              {label}
            </FilterBtn>
          ))}
        </div>
        <button
          onClick={openCreate}
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#fff",
            background: "var(--blue)",
            border: "none",
            borderRadius: "var(--r)",
            padding: "8px 18px",
            cursor: "pointer",
          }}
        >
          + Nouveau client
        </button>
      </div>

      {/* Table */}
      <div
        style={{
          overflowX: "auto",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-m)",
        }}
      >
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
        >
          <thead>
            <tr
              style={{
                background: "var(--black-2)",
                color: "var(--grey-3)",
                textAlign: "left",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: ".05em",
              }}
            >
              <th style={{ padding: "12px 16px" }}>Société</th>
              <th style={{ padding: "12px 16px" }}>Contact</th>
              <th style={{ padding: "12px 16px" }}>Métier</th>
              <th style={{ padding: "12px 16px" }}>Tél</th>
              <th style={{ padding: "12px 16px" }}>Status</th>
              <th style={{ padding: "12px 16px" }}>Date</th>
              <th style={{ padding: "12px 16px" }}></th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding: 32,
                    textAlign: "center",
                    color: "var(--grey-3)",
                  }}
                >
                  Aucun client
                </td>
              </tr>
            )}
            {clients.map((c) => (
              <tr
                key={c.id}
                style={{
                  borderTop: "1px solid var(--border)",
                  color: "var(--white)",
                }}
              >
                <td style={{ padding: "10px 16px", fontWeight: 600 }}>
                  {c.company}
                </td>
                <td style={{ padding: "10px 16px" }}>{c.contactName}</td>
                <td style={{ padding: "10px 16px", color: "var(--grey-3)" }}>
                  {c.trade}
                </td>
                <td style={{ padding: "10px 16px", color: "var(--grey-3)" }}>
                  {c.phone || "—"}
                </td>
                <td style={{ padding: "10px 16px" }}>
                  <Badge color={STATUS_MAP[c.status]?.color || "#aaa"}>
                    {STATUS_MAP[c.status]?.label || c.status}
                  </Badge>
                </td>
                <td style={{ padding: "10px 16px", color: "var(--grey-3)" }}>
                  {c.contactDate
                    ? new Date(c.contactDate).toLocaleDateString("fr-FR")
                    : "—"}
                </td>
                <td style={{ padding: "10px 16px" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <SmallBtn
                      color="var(--green)"
                      onClick={() => router.push(`/admin/clients/${c.id}`)}
                      title="Voir la fiche"
                    >
                      👁 Voir
                    </SmallBtn>
                    <SmallBtn
                      color="var(--blue)"
                      onClick={() => openEdit(c)}
                      title="Modifier"
                    >
                      ✎ Modifier
                    </SmallBtn>
                    <SmallBtn
                      color="#ff6b6b"
                      onClick={() => handleDelete(c.id)}
                      title="Supprimer"
                    >
                      🗑
                    </SmallBtn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ===== Multi-step Modal Form ===== */}
      {showForm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
        >
          <div
            style={{
              background: "var(--black-2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-m)",
              padding: 32,
              width: "100%",
              maxWidth: 640,
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "var(--white)",
                marginBottom: 20,
              }}
            >
              {editing ? "Modifier le client" : "Nouveau client"}
            </h2>

            {/* Stepper */}
            <div style={{ display: "flex", gap: 0, marginBottom: 28 }}>
              {STEPS.map((s, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    position: "relative",
                  }}
                >
                  <div
                    onClick={() => i < step && setStep(i)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: i < step ? "pointer" : "default",
                      background:
                        i === step
                          ? "var(--blue)"
                          : i < step
                            ? "var(--green)"
                            : "var(--black-3)",
                      color: i <= step ? "#fff" : "var(--grey-3)",
                      border: `2px solid ${i === step ? "var(--blue)" : i < step ? "var(--green)" : "var(--border-2)"}`,
                    }}
                  >
                    {i < step ? "✓" : s.icon}
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      color: i === step ? "var(--white)" : "var(--grey-3)",
                      marginTop: 4,
                      fontWeight: i === step ? 600 : 400,
                    }}
                  >
                    {s.label}
                  </span>
                  {i < STEPS.length - 1 && (
                    <div
                      style={{
                        position: "absolute",
                        top: 14,
                        left: "calc(50% + 18px)",
                        width: "calc(100% - 36px)",
                        height: 2,
                        background:
                          i < step ? "var(--green)" : "var(--border-2)",
                      }}
                    />
                  )}
                </div>
              ))}
            </div>

            {error && (
              <div
                style={{
                  fontSize: 12,
                  color: "#ff6b6b",
                  marginBottom: 16,
                  padding: "8px 12px",
                  background: "rgba(255,80,80,.1)",
                  borderRadius: "var(--r)",
                }}
              >
                {error}
              </div>
            )}

            {/* Step 0: Entreprise */}
            {step === 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                <Field label="Société *">
                  <input
                    required
                    style={inputStyle}
                    value={form.company}
                    onChange={(e) =>
                      setForm({ ...form, company: e.target.value })
                    }
                  />
                </Field>
                <Field label="Métier *">
                  <input
                    required
                    style={inputStyle}
                    value={form.trade}
                    onChange={(e) =>
                      setForm({ ...form, trade: e.target.value })
                    }
                  />
                </Field>
                <Field label="Nom contact *">
                  <input
                    required
                    style={inputStyle}
                    value={form.contactName}
                    onChange={(e) =>
                      setForm({ ...form, contactName: e.target.value })
                    }
                  />
                </Field>
                <Field label="Site web">
                  <input
                    style={inputStyle}
                    value={form.website}
                    onChange={(e) =>
                      setForm({ ...form, website: e.target.value })
                    }
                  />
                </Field>
              </div>
            )}

            {/* Step 1: Coordonnées */}
            {step === 1 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                <Field label="Email">
                  <input
                    type="email"
                    style={inputStyle}
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </Field>
                <Field label="Téléphone">
                  <input
                    style={inputStyle}
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                  />
                </Field>
                <div style={{ gridColumn: "1 / -1", position: "relative" }}>
                  <Field label="Adresse">
                    <input
                      style={inputStyle}
                      value={addrQuery}
                      placeholder="Tapez une adresse..."
                      onChange={(e) => handleAddrInput(e.target.value)}
                      onFocus={() =>
                        addrSuggestions.length > 0 && setShowAddrDrop(true)
                      }
                      onBlur={() =>
                        setTimeout(() => setShowAddrDrop(false), 200)
                      }
                    />
                  </Field>
                  {showAddrDrop && addrSuggestions.length > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        zIndex: 10,
                        background: "var(--black-3)",
                        border: "1px solid var(--border-2)",
                        borderRadius: "0 0 var(--r) var(--r)",
                        maxHeight: 180,
                        overflowY: "auto",
                      }}
                    >
                      {addrSuggestions.map((s, i) => (
                        <div
                          key={i}
                          onMouseDown={() => selectAddr(s)}
                          style={{
                            padding: "8px 12px",
                            fontSize: 12,
                            color: "var(--white)",
                            cursor: "pointer",
                            borderTop: i ? "1px solid var(--border)" : "none",
                          }}
                          onMouseEnter={(e) =>
                            (e.target.style.background = "var(--black-2)")
                          }
                          onMouseLeave={(e) =>
                            (e.target.style.background = "transparent")
                          }
                        >
                          {s}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Infos complémentaires */}
            {step === 2 && (
              <div style={{ display: "grid", gap: 16 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                  }}
                >
                  <Field label="Status">
                    <select
                      style={inputStyle}
                      value={form.status}
                      onChange={(e) =>
                        setForm({ ...form, status: e.target.value })
                      }
                    >
                      {Object.entries(STATUS_MAP).map(([k, { label }]) => (
                        <option key={k} value={k}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Date de contact">
                    <input
                      type="date"
                      style={inputStyle}
                      value={form.contactDate}
                      onChange={(e) =>
                        setForm({ ...form, contactDate: e.target.value })
                      }
                    />
                  </Field>
                </div>

                {/* Online presence multi-select */}
                <Field label="Présence en ligne">
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      marginTop: 4,
                    }}
                  >
                    {ONLINE_PRESENCE_OPTIONS.map((opt) => {
                      const active = form.onlinePresence.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => togglePresence(opt)}
                          style={{
                            fontSize: 12,
                            padding: "5px 12px",
                            borderRadius: "var(--r)",
                            cursor: "pointer",
                            border: `1px solid ${active ? "var(--blue)" : "var(--border-2)"}`,
                            background: active
                              ? "rgba(45,111,255,.12)"
                              : "transparent",
                            color: active ? "var(--blue)" : "var(--grey-3)",
                            fontWeight: active ? 600 : 400,
                          }}
                        >
                          {active ? "✓ " : ""}
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </Field>

                <Field label="Notes">
                  <textarea
                    style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                  />
                </Field>
              </div>
            )}

            {/* Step 3: Récapitulatif */}
            {step === 3 && (
              <div style={{ display: "grid", gap: 12 }}>
                <RecapRow label="Société" value={form.company} />
                <RecapRow label="Métier" value={form.trade} />
                <RecapRow label="Contact" value={form.contactName} />
                <RecapRow label="Email" value={form.email} />
                <RecapRow label="Téléphone" value={form.phone} />
                <RecapRow label="Adresse" value={form.address} />
                <RecapRow label="Site web" value={form.website} />
                <RecapRow
                  label="Status"
                  value={STATUS_MAP[form.status]?.label || form.status}
                  color={STATUS_MAP[form.status]?.color}
                />
                <RecapRow
                  label="Présence en ligne"
                  value={
                    form.onlinePresence.length > 0
                      ? form.onlinePresence.join(", ")
                      : "—"
                  }
                />
                <RecapRow label="Notes" value={form.notes || "—"} />
              </div>
            )}

            {/* Navigation */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 28,
              }}
            >
              <button
                type="button"
                onClick={() => (step === 0 ? setShowForm(false) : prevStep())}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "8px 18px",
                  background: "var(--black-3)",
                  border: "1px solid var(--border-2)",
                  borderRadius: "var(--r)",
                  color: "var(--grey-3)",
                  cursor: "pointer",
                }}
              >
                {step === 0 ? "Annuler" : "← Précédent"}
              </button>

              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={!canNext()}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "8px 22px",
                    background: "var(--blue)",
                    border: "none",
                    borderRadius: "var(--r)",
                    color: "#fff",
                    cursor: "pointer",
                    opacity: canNext() ? 1 : 0.4,
                  }}
                >
                  Suivant →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "8px 22px",
                    background: "var(--green)",
                    border: "none",
                    borderRadius: "var(--r)",
                    color: "#fff",
                    cursor: "pointer",
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  {saving
                    ? "..."
                    : editing
                      ? "Mettre à jour"
                      : "✓ Créer le client"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== Client Detail Modal ===== */}
      {viewingClient && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={(e) => e.target === e.currentTarget && setViewingClient(null)}
        >
          <div
            style={{
              background: "var(--black-2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-m)",
              padding: 32,
              width: "100%",
              maxWidth: 720,
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--white)", margin: 0 }}>
                  {viewingClient.company}
                </h2>
                <div style={{ fontSize: 13, color: "var(--grey-3)", marginTop: 4 }}>
                  {viewingClient.trade} — {viewingClient.contactName}
                </div>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: 99,
                  background: `${STATUS_MAP[viewingClient.status]?.color || "#aaa"}22`,
                  color: STATUS_MAP[viewingClient.status]?.color || "#aaa",
                }}
              >
                {STATUS_MAP[viewingClient.status]?.label || viewingClient.status}
              </span>
            </div>

            {/* Infos client */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 24,
              padding: 16,
              background: "var(--black-3)",
              borderRadius: 8,
              border: "1px solid var(--border)",
            }}>
              <InfoItem label="Email" value={viewingClient.email} />
              <InfoItem label="Téléphone" value={viewingClient.phone} />
              <InfoItem label="Adresse" value={viewingClient.address} />
              <InfoItem label="Site web" value={viewingClient.website} />
              <InfoItem label="Date de contact" value={viewingClient.contactDate ? new Date(viewingClient.contactDate).toLocaleDateString("fr-FR") : null} />
              <InfoItem
                label="Présence en ligne"
                value={viewingClient.onlinePresence?.length > 0 ? viewingClient.onlinePresence.join(", ") : null}
              />
            </div>

            {viewingClient.notes && (
              <div style={{
                padding: 14,
                background: "var(--black-3)",
                borderRadius: 8,
                border: "1px solid var(--border)",
                marginBottom: 24,
              }}>
                <div style={{ fontSize: 11, color: "var(--grey-3)", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em" }}>
                  Notes
                </div>
                <div style={{ fontSize: 13, color: "var(--white)", whiteSpace: "pre-wrap" }}>
                  {viewingClient.notes}
                </div>
              </div>
            )}

            {/* Devis liés */}
            <div style={{ marginBottom: 24 }}>
              <div style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--white)",
                marginBottom: 10,
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
                  {viewingClient.devis?.length || 0}
                </span>
              </div>
              {(!viewingClient.devis || viewingClient.devis.length === 0) ? (
                <div style={{ fontSize: 12, color: "var(--grey-3)", padding: "12px 0" }}>
                  Aucun devis pour ce client
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {viewingClient.devis.map((d) => {
                    const st = { BROUILLON: { label: "Brouillon", color: "#aaa" }, ENVOYE: { label: "Envoyé", color: "var(--blue)" }, ACCEPTE: { label: "Accepté", color: "var(--green)" }, REFUSE: { label: "Refusé", color: "#ff6b6b" } };
                    const ds = st[d.status] || st.BROUILLON;
                    return (
                      <div key={d.id} style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 14px",
                        background: "var(--black-3)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                      }}>
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
                          <span style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: 99,
                            background: `${ds.color}18`,
                            color: ds.color,
                          }}>
                            {ds.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Factures liées */}
            <div style={{ marginBottom: 24 }}>
              <div style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--white)",
                marginBottom: 10,
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
                  {viewingClient.factures?.length || 0}
                </span>
              </div>
              {(!viewingClient.factures || viewingClient.factures.length === 0) ? (
                <div style={{ fontSize: 12, color: "var(--grey-3)", padding: "12px 0" }}>
                  Aucune facture pour ce client
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {viewingClient.factures.map((f) => {
                    const fs = { BROUILLON: { label: "Brouillon", color: "#aaa" }, ENVOYEE: { label: "Envoyée", color: "var(--blue)" }, PAYEE: { label: "Payée", color: "var(--green)" }, ANNULEE: { label: "Annulée", color: "#ff6b6b" } };
                    const fst = fs[f.status] || fs.BROUILLON;
                    return (
                      <div key={f.id} style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 14px",
                        background: "var(--black-3)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                      }}>
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
                          <span style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: 99,
                            background: `${fst.color}18`,
                            color: fst.color,
                          }}>
                            {fst.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => {
                  setViewingClient(null);
                  openEdit(viewingClient);
                }}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "8px 18px",
                  background: "var(--blue)",
                  border: "none",
                  borderRadius: "var(--r)",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                ✏ Modifier
              </button>
              <button
                onClick={() => setViewingClient(null)}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "8px 18px",
                  background: "var(--black-3)",
                  border: "1px solid var(--border-2)",
                  borderRadius: "var(--r)",
                  color: "var(--grey-3)",
                  cursor: "pointer",
                }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

/* ---------- Utility components ---------- */

// Field, StatBadge, FilterBtn, InfoItem are imported from SharedUI

function RecapRow({ label, value, color }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "6px 0",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <span style={{ fontSize: 12, color: "var(--grey-3)" }}>{label}</span>
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: color || "var(--white)",
          textAlign: "right",
          maxWidth: "60%",
          wordBreak: "break-word",
        }}
      >
        {value || "—"}
      </span>
    </div>
  );
}

// StatBadge, FilterBtn, InfoItem imported from SharedUI
