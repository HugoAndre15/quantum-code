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

const API = "/api";

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
  const [totalPages, setTotalPages] = useState(0);
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [base, setBase] = useState(null);
  const [surMesure, setSurMesure] = useState(false);

  const load = useCallback(async () => {
    const [dRes, cRes, pRes, oRes, bRes] = await Promise.all([
      apiFetch(`${API}/devis`),
      apiFetch(`${API}/clients`),
      apiFetch(`${API}/offers/packs`),
      apiFetch(`${API}/offers/options`),
      apiFetch(`${API}/offers/pricing-base`),
    ]);
    if (dRes.ok) setDevisList(await dRes.json());
    if (cRes.ok) setClients(await cRes.json());
    if (pRes.ok) setPacks((await pRes.json()).filter((pk) => pk.active));
    if (oRes.ok) setOptions((await oRes.json()).filter((opt) => opt.active));
    if (bRes.ok) setBase(await bRes.json());
  }, [apiFetch]);

  useEffect(() => {
    load();
  }, [load]);

  // Computed
  const filteredOptions = options.filter(
    (o) => !o.name.toLowerCase().includes("page suppl"),
  );
  const oneTimeOptions = filteredOptions.filter((o) => !o.recurring);
  const recurringOptions = filteredOptions.filter((o) => o.recurring);
  const selectedPack = packs.find((p) => p.id === selectedPackId);
  const selectedOpts = options.filter((o) => selectedOptionIds.includes(o.id));
  const packIncludedOptionIds = selectedPack
    ? (selectedPack.includedOptions || []).map((io) => io.serviceOption.id)
    : [];
  const minPages = selectedPack
    ? selectedPack.includedPages || 0
    : base?.basePages || 0;
  const extraPagesCount = Math.max(0, totalPages - minPages);

  const computeTotal = () => {
    let total = selectedPack ? selectedPack.price : base?.basePrice || 0;
    total += extraPagesCount * (base?.pagePrice || 0);
    for (const opt of selectedOpts) {
      if (!opt.recurring) {
        total += opt.price;
      }
    }
    return total;
  };

  const computeDevTime = () => {
    let hours = selectedPack
      ? selectedPack.devTime || 0
      : base?.devTimeBase || 0;
    hours += extraPagesCount * (base?.devTimePage || 0);
    for (const opt of selectedOpts) {
      hours += opt.devTime || 0;
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
    setTotalPages(0);
    setNotes("");
    setValidUntil("");
    setClientSearch("");
    setSurMesure(false);
    setStep(0);
    setPromoCode("");
    setPromoResult(null);
  };

  const handleSubmit = async () => {
    await apiFetch(`${API}/devis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: selectedClientId,
        notes,
        validUntil: validUntil || undefined,
        packId: selectedPackId || undefined,
        optionIds: selectedOptionIds,
        pages: totalPages,
        promoCode: promoResult?.valid ? promoCode.trim() : undefined,
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
  const [promoCode, setPromoCode] = useState("");
  const [promoResult, setPromoResult] = useState(null);
  const [promoLoading, setPromoLoading] = useState(false);
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

  const validatePromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    try {
      const res = await apiFetch(
        `${API}/promo-codes/validate?code=${encodeURIComponent(promoCode.trim())}`,
      );
      if (res.ok) {
        const data = await res.json();
        setPromoResult(data);
      } else {
        setPromoResult({ valid: false, message: "Erreur de validation" });
      }
    } finally {
      setPromoLoading(false);
    }
  };

  const computeDiscount = () => {
    if (!promoResult?.valid || !promoResult?.promo) return 0;
    const subtotal = computeTotal();
    const p = promoResult.promo;
    if (p.minAmount && subtotal < p.minAmount) return 0;
    if (p.discountType === "PERCENTAGE") {
      return Math.round(subtotal * (p.discountValue / 100) * 100) / 100;
    }
    return Math.min(p.discountValue, subtotal);
  };

  const toggleOption = (id) => {
    if (packIncludedOptionIds.includes(id)) return;
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

  // Filtered list
  const filteredDevis =
    statusFilter === "ALL"
      ? devisList
      : devisList.filter((d) => d.status === statusFilter);

  // Stats
  const stats = {
    total: devisList.length,
    brouillon: devisList.filter((d) => d.status === "BROUILLON").length,
    envoye: devisList.filter((d) => d.status === "ENVOYE").length,
    accepte: devisList.filter((d) => d.status === "ACCEPTE").length,
    refuse: devisList.filter((d) => d.status === "REFUSE").length,
    totalHT: devisList.reduce((s, d) => s + (d.totalHT || 0), 0),
  };

  const STATUS_TABS = [
    { key: "ALL", label: "Tous" },
    { key: "BROUILLON", label: "Brouillons" },
    { key: "ENVOYE", label: "Envoyés" },
    { key: "ACCEPTE", label: "Acceptés" },
    { key: "REFUSE", label: "Refusés" },
  ];

  // ─── List View ────────────────────────────
  const renderList = () => (
    <div>
      {/* Stats */}
      <div
        style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}
      >
        <StatBadge label="Total" value={stats.total} color="var(--white)" />
        <StatBadge label="Brouillons" value={stats.brouillon} color="#aaa" />
        <StatBadge label="Envoyés" value={stats.envoye} color="var(--blue)" />
        <StatBadge
          label="Acceptés"
          value={stats.accepte}
          color="var(--green)"
        />
        <StatBadge label="Refusés" value={stats.refuse} color="#ff6b6b" />
        <StatBadge
          label="Total HT"
          value={`${stats.totalHT}€`}
          color="var(--gold)"
        />
      </div>

      <PageHeader
        title="Devis"
        count={filteredDevis.length}
        onAdd={() => {
          resetForm();
          setShowForm(true);
        }}
        addLabel="Nouveau devis"
      />

      <TabBar
        tabs={STATUS_TABS}
        activeTab={statusFilter}
        onTabChange={setStatusFilter}
      />

      {filteredDevis.length === 0 ? (
        <Empty>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>▤</div>
          <div style={{ fontSize: 14, marginBottom: 6 }}>Aucun devis</div>
          <div style={{ fontSize: 12, opacity: 0.6 }}>
            {statusFilter === "ALL"
              ? "Créez votre premier devis avec le bouton ci-dessus"
              : "Aucun devis avec ce statut"}
          </div>
        </Empty>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filteredDevis.map((d) => {
            const st = STATUS_MAP[d.status] || STATUS_MAP.BROUILLON;
            return (
              <Card key={d.id} hoverable>
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
                      {d.number}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--grey-3)",
                        marginTop: 2,
                      }}
                    >
                      {new Date(d.createdAt).toLocaleDateString("fr-FR")}
                    </div>
                  </div>

                  {/* Client */}
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ fontSize: 13, color: "var(--white)" }}>
                      {d.client?.company}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--grey-3)" }}>
                      {d.client?.contactName}
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
                      {d.totalHT}€
                    </div>
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
                      onClick={() => setViewing(d)}
                      title="Voir le détail"
                    >
                      👁 Voir
                    </SmallBtn>
                    <SmallBtn
                      color="var(--gold)"
                      onClick={() => downloadPdf(d.id, d.number)}
                      title="Télécharger le PDF"
                    >
                      📄 PDF
                    </SmallBtn>
                    {d.status === "BROUILLON" && (
                      <SmallBtn
                        color="var(--blue)"
                        onClick={() => sendByEmail(d.id)}
                        title="Envoyer par email"
                        disabled={sending}
                      >
                        {sending ? "⏳" : "✉"} Envoyer
                      </SmallBtn>
                    )}
                    {d.status === "ENVOYE" && (
                      <>
                        <SmallBtn
                          color="var(--green)"
                          onClick={() => updateStatus(d.id, "ACCEPTE")}
                          title="Marquer comme accepté"
                        >
                          ✓ Accepter
                        </SmallBtn>
                        <SmallBtn
                          color="#ff6b6b"
                          onClick={() => updateStatus(d.id, "REFUSE")}
                          title="Marquer comme refusé"
                        >
                          ✗ Refuser
                        </SmallBtn>
                      </>
                    )}
                    {d.status === "ACCEPTE" && !d.facture && (
                      <SmallBtn
                        color="var(--green)"
                        onClick={() => transformToFacture(d.id)}
                        title="Transformer en facture"
                      >
                        → Facture
                      </SmallBtn>
                    )}
                    {d.status === "BROUILLON" && (
                      <SmallBtn
                        color="#ff6b6b"
                        onClick={() => {
                          if (confirm("Supprimer ce devis ?"))
                            deleteDevis(d.id);
                        }}
                        title="Supprimer"
                      >
                        🗑
                      </SmallBtn>
                    )}
                  </div>
                </div>
                {/* Facture link if exists */}
                {d.facture && (
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
                    ✓ Facture {d.facture.number} créée
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
            {detail.discountAmount > 0 && detail.promoCode && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "6px 0",
                  fontSize: 12,
                  color: "var(--green)",
                }}
              >
                <span>Code promo : {detail.promoCode.code}</span>
                <span>-{detail.discountAmount}€ appliqué</span>
              </div>
            )}
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

      {/* Step 1: Pack / Base */}
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
            Choisir un pack ou sur mesure
          </div>
          <div
            style={{ fontSize: 12, color: "var(--grey-3)", marginBottom: 20 }}
          >
            Sélectionnez un pack complet ou partez sur mesure
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            {/* Sur mesure card */}
            <div
              onClick={() => {
                setSurMesure(true);
                setSelectedPackId("");
                setTotalPages(base?.basePages || 0);
                setSelectedOptionIds((prev) =>
                  prev.filter((id) => !packIncludedOptionIds.includes(id)),
                );
              }}
              style={{
                padding: 18,
                borderRadius: 10,
                border: `2px solid ${surMesure && !selectedPackId ? "var(--blue)" : "var(--border)"}`,
                background:
                  surMesure && !selectedPackId
                    ? "rgba(45,111,255,.06)"
                    : "var(--black-3)",
                cursor: "pointer",
                transition: "all .15s",
                position: "relative",
              }}
            >
              {surMesure && !selectedPackId && (
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
                Personnalisé
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "var(--white)",
                  marginBottom: 4,
                }}
              >
                Sur mesure
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: "var(--gold)",
                  marginBottom: 8,
                }}
              >
                {base?.basePrice || 0}€
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--grey-3)",
                  lineHeight: 1.5,
                }}
              >
                Base avec {base?.basePages || 0} page
                {(base?.basePages || 0) > 1 ? "s" : ""} incluse
                {(base?.basePages || 0) > 1 ? "s" : ""}. Ajoutez les options de
                votre choix.
              </div>
            </div>

            {/* Pack cards */}
            {packs.map((p) => {
              const isSelected = selectedPackId === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedPackId("");
                      setSurMesure(false);
                      setTotalPages(0);
                    } else {
                      setSelectedPackId(p.id);
                      setSurMesure(false);
                      setTotalPages(p.includedPages || 0);
                      const newIncluded = (p.includedOptions || []).map(
                        (io) => io.serviceOption.id,
                      );
                      setSelectedOptionIds((prev) =>
                        prev.filter((id) => !newIncluded.includes(id)),
                      );
                    }
                  }}
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
                  {(p.includedPages > 0 ||
                    (p.includedOptions || []).length > 0) && (
                    <div
                      style={{
                        marginTop: 10,
                        display: "flex",
                        flexDirection: "column",
                        gap: 3,
                      }}
                    >
                      {p.includedPages > 0 && (
                        <div style={{ fontSize: 11, color: "var(--blue)" }}>
                          • {p.includedPages} page
                          {p.includedPages > 1 ? "s" : ""} incluse
                          {p.includedPages > 1 ? "s" : ""}
                        </div>
                      )}
                      {(p.includedOptions || []).map((io) => (
                        <div
                          key={io.serviceOption.id}
                          style={{ fontSize: 11, color: "var(--blue)" }}
                        >
                          • {io.serviceOption.name} inclus
                        </div>
                      ))}
                    </div>
                  )}
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

          {/* Page counter */}
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
                marginBottom: 10,
                textTransform: "uppercase",
                letterSpacing: ".05em",
              }}
            >
              Nombre de pages
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                style={{
                  ...btn("ghost"),
                  padding: "4px 12px",
                  fontSize: 14,
                }}
                onClick={() =>
                  setTotalPages(Math.max(minPages, totalPages - 1))
                }
              >
                −
              </button>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--white)",
                  minWidth: 30,
                  textAlign: "center",
                }}
              >
                {totalPages}
              </span>
              <button
                style={{
                  ...btn("ghost"),
                  padding: "4px 12px",
                  fontSize: 14,
                }}
                onClick={() => setTotalPages(totalPages + 1)}
              >
                +
              </button>
              <span
                style={{
                  fontSize: 12,
                  color: "var(--grey-3)",
                  marginLeft: 8,
                }}
              >
                ({minPages} incluse{minPages > 1 ? "s" : ""}
                {extraPagesCount > 0
                  ? `, +${extraPagesCount} suppl. = ${extraPagesCount * (base?.pagePrice || 0)}€`
                  : ""}
                )
              </span>
            </div>
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
                const isIncluded = packIncludedOptionIds.includes(opt.id);
                const isSelected = selectedOptionIds.includes(opt.id);
                return (
                  <div
                    key={opt.id}
                    onClick={() => toggleOption(opt.id)}
                    style={{
                      padding: 14,
                      borderRadius: 8,
                      border: `2px solid ${isIncluded ? "var(--green)" : isSelected ? "var(--blue)" : "var(--border)"}`,
                      background: isIncluded
                        ? "rgba(93,216,160,.06)"
                        : isSelected
                          ? "rgba(45,111,255,.06)"
                          : "var(--black-3)",
                      cursor: isIncluded ? "default" : "pointer",
                      opacity: isIncluded ? 0.7 : 1,
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
                      {isIncluded ? (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "var(--green)",
                          }}
                        >
                          Inclus
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "var(--gold)",
                          }}
                        >
                          {opt.price}€
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--grey-3)" }}>
                      {opt.description}
                    </div>
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

          {/* Pack or Base */}
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
                {selectedPack
                  ? `Pack ${selectedPack.name}`
                  : "Sur mesure (base)"}
              </div>
              <div style={{ fontSize: 11, color: "var(--grey-3)" }}>
                {selectedPack
                  ? selectedPack.description
                  : `Base avec ${base?.basePages || 0} page${(base?.basePages || 0) > 1 ? "s" : ""}`}
              </div>
            </div>
            <div
              style={{ fontSize: 14, fontWeight: 700, color: "var(--gold)" }}
            >
              {selectedPack ? selectedPack.price : base?.basePrice || 0}€
            </div>
          </div>

          {/* Extra pages */}
          {extraPagesCount > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div style={{ fontSize: 13, color: "var(--white)" }}>
                +{extraPagesCount} page
                {extraPagesCount > 1 ? "s" : ""} supplémentaire
                {extraPagesCount > 1 ? "s" : ""} ({totalPages} au total)
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--gold)",
                }}
              >
                {extraPagesCount * (base?.pagePrice || 0)}€
              </div>
            </div>
          )}

          {/* Pack-included options */}
          {selectedPack && (selectedPack.includedOptions || []).length > 0 && (
            <div
              style={{
                padding: "10px 0",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "var(--grey-3)",
                  marginBottom: 4,
                }}
              >
                Options incluses dans le pack
              </div>
              {(selectedPack.includedOptions || []).map((io) => (
                <div
                  key={io.serviceOption.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "4px 0",
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      color: "var(--white)",
                      opacity: 0.7,
                    }}
                  >
                    {io.serviceOption.name}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--green)",
                      fontWeight: 600,
                    }}
                  >
                    Inclus
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Extra one-time options */}
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
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--gold)",
                  }}
                >
                  {opt.price}€
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
              Sous-total HT
            </span>
            <span
              style={{ fontSize: 18, fontWeight: 800, color: "var(--gold)" }}
            >
              {computeTotal()}€
            </span>
          </div>

          {/* Promo code */}
          <div
            style={{
              marginTop: 12,
              padding: 14,
              background: "var(--black-3)",
              borderRadius: 8,
              border: `1px solid ${promoResult?.valid ? "var(--green)" : "var(--border)"}`,
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: "var(--grey-3)",
                marginBottom: 8,
                fontWeight: 600,
              }}
            >
              Code promo
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                style={{ ...inputStyle, flex: 1, textTransform: "uppercase" }}
                placeholder="Entrez un code promo..."
                value={promoCode}
                onChange={(e) => {
                  setPromoCode(e.target.value);
                  if (promoResult) setPromoResult(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && validatePromo()}
              />
              <button
                style={btn("ghost")}
                onClick={validatePromo}
                disabled={promoLoading || !promoCode.trim()}
              >
                {promoLoading ? "..." : "Appliquer"}
              </button>
            </div>
            {promoResult && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: promoResult.valid ? "var(--green)" : "#ff6b6b",
                }}
              >
                {promoResult.valid
                  ? `✓ ${promoResult.promo.discountType === "PERCENTAGE" ? `-${promoResult.promo.discountValue}%` : `-${promoResult.promo.discountValue}€`} appliqué`
                  : `✗ ${promoResult.message || "Code invalide"}`}
              </div>
            )}
          </div>

          {/* Discount + Final total */}
          {computeDiscount() > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <span
                style={{ fontSize: 13, color: "var(--green)", fontWeight: 600 }}
              >
                Réduction (
                {promoResult.promo.discountType === "PERCENTAGE"
                  ? `${promoResult.promo.discountValue}%`
                  : "fixe"}
                )
              </span>
              <span
                style={{ fontSize: 13, fontWeight: 600, color: "var(--green)" }}
              >
                -{computeDiscount()}€
              </span>
            </div>
          )}

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
              {Math.round((computeTotal() - computeDiscount()) * 100) / 100}€
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
              (step === 1 && !selectedPackId && !surMesure)
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
