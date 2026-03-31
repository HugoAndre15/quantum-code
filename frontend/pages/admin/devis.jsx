import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import AdminLayout from "../../components/AdminLayout";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

const STATUS_MAP = {
  BROUILLON: { label: "Brouillon", color: "#aaa" },
  ENVOYE: { label: "Envoyé", color: "var(--blue)" },
  ACCEPTE: { label: "Accepté", color: "var(--green)" },
  REFUSE: { label: "Refusé", color: "#ff6b6b" },
};

const STEPS = [
  { label: "Client", icon: "1" },
  { label: "Pack / Base", icon: "2" },
  { label: "Options", icon: "3" },
  { label: "Récapitulatif", icon: "4" },
];

export default function DevisPage() {
  const { apiFetch } = useAuth();

  const [devisList, setDevisList] = useState([]);
  const [clients, setClients] = useState([]);
  const [packs, setPacks] = useState([]);
  const [options, setOptions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState(0);
  const [viewing, setViewing] = useState(null);

  // Form state
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedPackId, setSelectedPackId] = useState("");
  const [selectedOptionIds, setSelectedOptionIds] = useState([]);
  const [extraPages, setExtraPages] = useState(0);
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [clientSearch, setClientSearch] = useState("");

  const load = useCallback(async () => {
    const [dRes, cRes, pRes, oRes] = await Promise.all([
      apiFetch(`${API}/devis`),
      apiFetch(`${API}/clients`),
      apiFetch(`${API}/offers/packs`),
      apiFetch(`${API}/offers/options`),
    ]);
    if (dRes.ok) setDevisList(await dRes.json());
    if (cRes.ok) setClients(await cRes.json());
    if (pRes.ok) setPacks((await pRes.json()).filter((pk) => pk.active));
    if (oRes.ok) setOptions((await oRes.json()).filter((opt) => opt.active));
  }, [apiFetch]);

  useEffect(() => {
    load();
  }, [load]);

  // Computed
  const oneTimeOptions = options.filter((o) => !o.recurring);
  const recurringOptions = options.filter((o) => o.recurring);
  const selectedPack = packs.find((p) => p.id === selectedPackId);
  const selectedOpts = options.filter((o) => selectedOptionIds.includes(o.id));
  const pageSuppOption = options.find((o) => o.name === "Page supplémentaire");

  const computeTotal = () => {
    let total = selectedPack ? selectedPack.price : 0;
    for (const opt of selectedOpts) {
      if (!opt.recurring) {
        if (opt.name === "Page supplémentaire") {
          total += opt.price * extraPages;
        } else {
          total += opt.price;
        }
      }
    }
    return total;
  };

  const computeDevTime = () => {
    let hours = selectedPack ? selectedPack.devTime || 0 : 0;
    for (const opt of selectedOpts) {
      if (opt.name === "Page supplémentaire") {
        hours += (opt.devTime || 0) * extraPages;
      } else {
        hours += opt.devTime || 0;
      }
    }
    return hours;
  };

  const computeRecurring = () => {
    const monthly = selectedOpts
      .filter((o) => o.recurring && o.recurringUnit === "mois")
      .reduce((s, o) => s + o.price, 0);
    const yearly = selectedOpts
      .filter((o) => o.recurring && o.recurringUnit === "an")
      .reduce((s, o) => s + o.price, 0);
    return { monthly, yearly };
  };

  const resetForm = () => {
    setSelectedClientId("");
    setSelectedPackId("");
    setSelectedOptionIds([]);
    setExtraPages(0);
    setNotes("");
    setValidUntil("");
    setClientSearch("");
    setStep(0);
  };

  const handleSubmit = async () => {
    const items = [];

    if (selectedPack) {
      items.push({
        label: `Pack ${selectedPack.name}`,
        description: selectedPack.description,
        unitPrice: selectedPack.price,
        devTime: selectedPack.devTime || 0,
        packId: selectedPack.id,
        quantity: 1,
      });
    }

    for (const opt of selectedOpts) {
      if (opt.name === "Page supplémentaire" && extraPages > 0) {
        items.push({
          label: opt.name,
          description: opt.description,
          unitPrice: opt.price,
          devTime: opt.devTime || 0,
          serviceOptionId: opt.id,
          quantity: extraPages,
          recurring: false,
        });
      } else if (opt.recurring) {
        items.push({
          label: opt.name,
          description: `${opt.price}€/${opt.recurringUnit}`,
          unitPrice: opt.price,
          devTime: 0,
          serviceOptionId: opt.id,
          quantity: 1,
          recurring: true,
          recurringUnit: opt.recurringUnit,
        });
      } else if (opt.name !== "Page supplémentaire") {
        items.push({
          label: opt.name,
          description: opt.description,
          unitPrice: opt.price,
          devTime: opt.devTime || 0,
          serviceOptionId: opt.id,
          quantity: 1,
          recurring: false,
        });
      }
    }

    await apiFetch(`${API}/devis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: selectedClientId,
        notes,
        validUntil: validUntil || undefined,
        items,
      }),
    });

    resetForm();
    setShowForm(false);
    load();
  };

  const updateStatus = async (id, status) => {
    await apiFetch(`${API}/devis/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
    if (viewing?.id === id) setViewing({ ...viewing, status });
  };

  const transformToFacture = async (id) => {
    await apiFetch(`${API}/devis/${id}/facture`, { method: "POST" });
    load();
    setViewing(null);
  };

  const deleteDevis = async (id) => {
    await apiFetch(`${API}/devis/${id}`, { method: "DELETE" });
    load();
    setViewing(null);
  };

  const downloadPdf = async (id, number) => {
    const res = await apiFetch(`${API}/devis/${id}/pdf`);
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

  const toggleOption = (id) => {
    setSelectedOptionIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const filteredClients = clients.filter(
    (c) =>
      !clientSearch ||
      c.company.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.contactName.toLowerCase().includes(clientSearch.toLowerCase()),
  );

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

  const inputStyle = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 6,
    border: "1px solid var(--border)",
    background: "var(--black-3)",
    color: "var(--white)",
    fontSize: 13,
    outline: "none",
  };

  const badge = (color) => ({
    display: "inline-block",
    padding: "2px 10px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
    background: `${color}18`,
    color,
  });

  // ─── List View ────────────────────────────
  const renderList = () => (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div style={{ color: "var(--grey-3)", fontSize: 13 }}>
          {devisList.length} devis
        </div>
        <button
          style={btn("primary")}
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          + Nouveau devis
        </button>
      </div>

      {devisList.length === 0 ? (
        <div
          style={{
            ...card,
            textAlign: "center",
            padding: 60,
            color: "var(--grey-3)",
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>▤</div>
          <div style={{ fontSize: 14, marginBottom: 6 }}>Aucun devis</div>
          <div style={{ fontSize: 12, opacity: 0.6 }}>
            Créez votre premier devis avec le bouton ci-dessus
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {devisList.map((d) => {
            const st = STATUS_MAP[d.status] || STATUS_MAP.BROUILLON;
            return (
              <div
                key={d.id}
                style={{
                  ...card,
                  padding: "14px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  cursor: "pointer",
                  transition: "border-color .15s",
                }}
                onClick={() => setViewing(d)}
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
                    {d.number}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "var(--white)" }}>
                    {d.client?.company}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--grey-3)" }}>
                    {d.client?.contactName}
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
                    {d.totalHT}€
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
                  {new Date(d.createdAt).toLocaleDateString("fr-FR")}
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
    const st = STATUS_MAP[viewing.status] || STATUS_MAP.BROUILLON;
    const detail = devisList.find((d) => d.id === viewing.id) || viewing;
    const oneTimeItems = (detail.items || []).filter((i) => !i.recurring);
    const recurringItems = (detail.items || []).filter((i) => i.recurring);

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
              <div style={{ fontSize: 13, color: "var(--grey-3)" }}>
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
                  onClick={() => updateStatus(detail.id, "ENVOYE")}
                >
                  Marquer comme envoyé
                </button>
                <button
                  style={btn("danger")}
                  onClick={() => deleteDevis(detail.id)}
                >
                  Supprimer
                </button>
              </>
            )}
            {detail.status === "ENVOYE" && (
              <>
                <button
                  style={btn("success")}
                  onClick={() => updateStatus(detail.id, "ACCEPTE")}
                >
                  ✓ Accepté
                </button>
                <button
                  style={btn("danger")}
                  onClick={() => updateStatus(detail.id, "REFUSE")}
                >
                  ✗ Refusé
                </button>
              </>
            )}
            {detail.status === "ACCEPTE" && !detail.facture && (
              <button
                style={btn("success")}
                onClick={() => transformToFacture(detail.id)}
              >
                Transformer en facture →
              </button>
            )}
            {detail.facture && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--green)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                ✓ Facture {detail.facture.number} créée
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ─── Form Wizard ──────────────────────────
  const renderForm = () => (
    <div>
      <button
        style={{ ...btn("ghost"), marginBottom: 20 }}
        onClick={() => {
          setShowForm(false);
          resetForm();
        }}
      >
        ← Annuler
      </button>

      {/* Step indicator */}
      <div style={{ display: "flex", gap: 4, marginBottom: 28 }}>
        {STEPS.map((s, i) => (
          <div
            key={i}
            style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                background: i <= step ? "var(--blue)" : "var(--black-3)",
                color: i <= step ? "#fff" : "var(--grey-3)",
                border: `2px solid ${i <= step ? "var(--blue)" : "var(--border)"}`,
                transition: "all .2s",
              }}
            >
              {i < step ? "✓" : s.icon}
            </div>
            <span
              style={{
                fontSize: 12,
                color: i <= step ? "var(--white)" : "var(--grey-3)",
                fontWeight: i === step ? 600 : 400,
              }}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  background: i < step ? "var(--blue)" : "var(--border)",
                  borderRadius: 1,
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 0: Client */}
      {step === 0 && (
        <div style={card}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "var(--white)",
              marginBottom: 4,
            }}
          >
            Choisir un client
          </div>
          <div
            style={{ fontSize: 12, color: "var(--grey-3)", marginBottom: 16 }}
          >
            Sélectionnez le client pour ce devis
          </div>

          <input
            style={{ ...inputStyle, marginBottom: 12 }}
            placeholder="Rechercher un client..."
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
          />

          <div
            style={{
              maxHeight: 300,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {filteredClients.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedClientId(c.id)}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: `2px solid ${selectedClientId === c.id ? "var(--blue)" : "var(--border)"}`,
                  background:
                    selectedClientId === c.id
                      ? "rgba(45,111,255,.06)"
                      : "var(--black-3)",
                  cursor: "pointer",
                  transition: "all .15s",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--white)",
                  }}
                >
                  {c.company}
                </div>
                <div style={{ fontSize: 11, color: "var(--grey-3)" }}>
                  {c.contactName}
                  {c.email ? ` — ${c.email}` : ""}
                </div>
              </div>
            ))}
            {filteredClients.length === 0 && (
              <div
                style={{
                  padding: 20,
                  textAlign: "center",
                  color: "var(--grey-3)",
                  fontSize: 13,
                }}
              >
                Aucun client trouvé
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 1: Pack */}
      {step === 1 && (
        <div style={card}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "var(--white)",
              marginBottom: 4,
            }}
          >
            Choisir un pack
          </div>
          <div
            style={{ fontSize: 12, color: "var(--grey-3)", marginBottom: 20 }}
          >
            Sélectionnez une offre de base ou un pack complet
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            {packs.map((p) => {
              const isSelected = selectedPackId === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPackId(isSelected ? "" : p.id)}
                  style={{
                    padding: 18,
                    borderRadius: 10,
                    border: `2px solid ${isSelected ? "var(--blue)" : "var(--border)"}`,
                    background: isSelected
                      ? "rgba(45,111,255,.06)"
                      : "var(--black-3)",
                    cursor: "pointer",
                    transition: "all .15s",
                    position: "relative",
                  }}
                >
                  {isSelected && (
                    <div
                      style={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: "var(--blue)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        color: "#fff",
                        fontWeight: 700,
                      }}
                    >
                      ✓
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: ".06em",
                      color: "var(--grey-3)",
                      marginBottom: 6,
                    }}
                  >
                    {p.type === "ADMIN_INTEGRE" ? "Admin intégré" : "Classique"}
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: "var(--white)",
                      marginBottom: 4,
                    }}
                  >
                    {p.name}
                  </div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: "var(--gold)",
                      marginBottom: 8,
                    }}
                  >
                    {p.price}€
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--grey-3)",
                      lineHeight: 1.5,
                    }}
                  >
                    {p.description}
                  </div>
                  {p.features?.length > 0 && (
                    <div
                      style={{
                        marginTop: 10,
                        display: "flex",
                        flexDirection: "column",
                        gap: 3,
                      }}
                    >
                      {p.features.map((f, i) => (
                        <div
                          key={i}
                          style={{ fontSize: 11, color: "var(--grey-3)" }}
                        >
                          • {f}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2: Options */}
      {step === 2 && (
        <div style={card}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "var(--white)",
              marginBottom: 4,
            }}
          >
            Ajouter des options
          </div>
          <div
            style={{ fontSize: 12, color: "var(--grey-3)", marginBottom: 20 }}
          >
            Personnalisez le devis avec des options supplémentaires
          </div>

          {/* One-time options */}
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
              Options ponctuelles
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: 8,
              }}
            >
              {oneTimeOptions.map((opt) => {
                const isSelected = selectedOptionIds.includes(opt.id);
                const isPageSupp = opt.name === "Page supplémentaire";
                return (
                  <div
                    key={opt.id}
                    onClick={() => {
                      toggleOption(opt.id);
                      if (isPageSupp && !isSelected) setExtraPages(1);
                      if (isPageSupp && isSelected) setExtraPages(0);
                    }}
                    style={{
                      padding: 14,
                      borderRadius: 8,
                      border: `2px solid ${isSelected ? "var(--blue)" : "var(--border)"}`,
                      background: isSelected
                        ? "rgba(45,111,255,.06)"
                        : "var(--black-3)",
                      cursor: "pointer",
                      transition: "all .15s",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--white)",
                        }}
                      >
                        {opt.name}
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "var(--gold)",
                        }}
                      >
                        {opt.price}€
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--grey-3)" }}>
                      {opt.description}
                    </div>
                    {isPageSupp && isSelected && (
                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span style={{ fontSize: 11, color: "var(--grey-3)" }}>
                          Nombre :
                        </span>
                        <button
                          style={{
                            ...btn("ghost"),
                            padding: "2px 8px",
                            fontSize: 12,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setExtraPages(Math.max(1, extraPages - 1));
                          }}
                        >
                          −
                        </button>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "var(--white)",
                            minWidth: 20,
                            textAlign: "center",
                          }}
                        >
                          {extraPages}
                        </span>
                        <button
                          style={{
                            ...btn("ghost"),
                            padding: "2px 8px",
                            fontSize: 12,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setExtraPages(extraPages + 1);
                          }}
                        >
                          +
                        </button>
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--gold)",
                            marginLeft: "auto",
                          }}
                        >
                          = {opt.price * extraPages}€
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recurring options */}
          <div>
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
              Abonnements
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: 8,
              }}
            >
              {recurringOptions.map((opt) => {
                const isSelected = selectedOptionIds.includes(opt.id);
                return (
                  <div
                    key={opt.id}
                    onClick={() => toggleOption(opt.id)}
                    style={{
                      padding: 14,
                      borderRadius: 8,
                      border: `2px solid ${isSelected ? "var(--green)" : "var(--border)"}`,
                      background: isSelected
                        ? "rgba(93,216,160,.06)"
                        : "var(--black-3)",
                      cursor: "pointer",
                      transition: "all .15s",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--white)",
                        }}
                      >
                        {opt.name}
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "var(--green)",
                        }}
                      >
                        {opt.price}€/{opt.recurringUnit}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--grey-3)" }}>
                      {opt.description}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Recap */}
      {step === 3 && (
        <div style={card}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "var(--white)",
              marginBottom: 16,
            }}
          >
            Récapitulatif du devis
          </div>

          {/* Client info */}
          {(() => {
            const cl = clients.find((c) => c.id === selectedClientId);
            return cl ? (
              <div
                style={{
                  marginBottom: 20,
                  padding: 14,
                  background: "var(--black-3)",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--grey-3)",
                    marginBottom: 6,
                  }}
                >
                  Client
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--white)",
                  }}
                >
                  {cl.company}
                </div>
                <div style={{ fontSize: 12, color: "var(--grey-3)" }}>
                  {cl.contactName}
                  {cl.email ? ` — ${cl.email}` : ""}
                </div>
              </div>
            ) : null;
          })()}

          {/* Pack */}
          {selectedPack && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--white)",
                  }}
                >
                  Pack {selectedPack.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--grey-3)" }}>
                  {selectedPack.description}
                </div>
              </div>
              <div
                style={{ fontSize: 14, fontWeight: 700, color: "var(--gold)" }}
              >
                {selectedPack.price}€
              </div>
            </div>
          )}

          {/* One-time options */}
          {selectedOpts
            .filter((o) => !o.recurring)
            .map((opt) => (
              <div
                key={opt.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div style={{ fontSize: 13, color: "var(--white)" }}>
                  {opt.name}
                  {opt.name === "Page supplémentaire" && extraPages > 1
                    ? ` × ${extraPages}`
                    : ""}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--gold)",
                  }}
                >
                  {opt.name === "Page supplémentaire"
                    ? opt.price * extraPages
                    : opt.price}
                  €
                </div>
              </div>
            ))}

          {/* Total */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "14px 0",
              borderTop: "2px solid var(--border)",
              marginTop: 4,
            }}
          >
            <span
              style={{ fontSize: 15, fontWeight: 700, color: "var(--white)" }}
            >
              Total HT
            </span>
            <span
              style={{ fontSize: 18, fontWeight: 800, color: "var(--gold)" }}
            >
              {computeTotal()}€
            </span>
          </div>

          {/* Dev time (internal, shown to admin) */}
          <div
            style={{
              padding: 12,
              background: "rgba(45,111,255,.06)",
              borderRadius: 8,
              border: "1px solid rgba(45,111,255,.15)",
              marginTop: 12,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "var(--blue)",
                fontWeight: 600,
                marginBottom: 2,
              }}
            >
              ⏱ Temps de développement estimé (interne)
            </div>
            <div
              style={{ fontSize: 16, fontWeight: 700, color: "var(--white)" }}
            >
              {computeDevTime()}h
            </div>
          </div>

          {/* Recurring summary */}
          {(() => {
            const rec = computeRecurring();
            if (rec.monthly === 0 && rec.yearly === 0) return null;
            return (
              <div
                style={{
                  padding: 12,
                  background: "rgba(93,216,160,.06)",
                  borderRadius: 8,
                  border: "1px solid rgba(93,216,160,.15)",
                  marginTop: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--green)",
                    fontWeight: 600,
                    marginBottom: 6,
                  }}
                >
                  Abonnements récurrents
                </div>
                {selectedOpts
                  .filter((o) => o.recurring)
                  .map((opt) => (
                    <div
                      key={opt.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "4px 0",
                      }}
                    >
                      <span style={{ fontSize: 13, color: "var(--white)" }}>
                        {opt.name}
                      </span>
                      <span style={{ fontSize: 13, color: "var(--green)" }}>
                        {opt.price}€/{opt.recurringUnit}
                      </span>
                    </div>
                  ))}
              </div>
            );
          })()}

          {/* Notes & validity */}
          <div
            style={{
              marginTop: 20,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div>
              <label
                style={{
                  fontSize: 12,
                  color: "var(--grey-3)",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Notes
              </label>
              <textarea
                style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes internes ou conditions..."
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: 12,
                  color: "var(--grey-3)",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Valide jusqu&apos;au
              </label>
              <input
                type="date"
                style={{ ...inputStyle, maxWidth: 200 }}
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 20,
        }}
      >
        <button
          style={btn("ghost")}
          disabled={step === 0}
          onClick={() => setStep(step - 1)}
        >
          ← Précédent
        </button>
        {step < STEPS.length - 1 ? (
          <button
            style={btn("primary")}
            disabled={
              (step === 0 && !selectedClientId) ||
              (step === 1 && !selectedPackId)
            }
            onClick={() => setStep(step + 1)}
          >
            Suivant →
          </button>
        ) : (
          <button style={btn("success")} onClick={handleSubmit}>
            ✓ Créer le devis
          </button>
        )}
      </div>
    </div>
  );

  return (
    <AdminLayout title="Devis">
      {viewing ? renderDetail() : showForm ? renderForm() : renderList()}
    </AdminLayout>
  );
}
