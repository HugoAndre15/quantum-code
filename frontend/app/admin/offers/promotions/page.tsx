"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { PageHeader, Badge, Empty, TabBar, Modal, Field, ErrorMsg, FormButtons, SmallBtn, inputStyle } from "@/app/admin/components/SharedUI";

const API = "/api";

type DiscountType = "PERCENTAGE" | "FIXED_VALUE";

interface PromoCode {
  id: string;
  code: string;
  name: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  minAmount?: number;
  maxUses?: number;
  currentUses: number;
  startDate?: string;
  endDate?: string;
  active: boolean;
  createdAt: string;
}

const TYPE_MAP: Record<DiscountType, { label: string; color: string }> = {
  PERCENTAGE: { label: "Pourcentage", color: "var(--blue)" },
  FIXED_VALUE: { label: "Valeur fixe", color: "var(--gold)" },
};

function getStatus(p: PromoCode) {
  if (!p.active) return { label: "Désactivé", color: "#ff6b6b" };
  const now = new Date();
  if (p.startDate && now < new Date(p.startDate)) return { label: "Programmé", color: "var(--gold)" };
  if (p.endDate && now > new Date(p.endDate)) return { label: "Expiré", color: "#aaa" };
  if (p.maxUses && p.currentUses >= p.maxUses) return { label: "Épuisé", color: "#aaa" };
  return { label: "Actif", color: "var(--green)" };
}

const EMPTY_FORM = { code: "", name: "", description: "", discountType: "PERCENTAGE" as DiscountType, discountValue: "", minAmount: "", maxUses: "", startDate: "", endDate: "", active: true };

const TABS = [
  { key: "all", label: "Tous" },
  { key: "active", label: "Actifs" },
  { key: "expired", label: "Expirés/Épuisés" },
  { key: "disabled", label: "Désactivés" },
];

export default function PromotionsPage() {
  const { apiFetch } = useAuth();
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [tab, setTab] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await apiFetch(`${API}/promo-codes`);
    if (res.ok) setPromos(await res.json());
  }, [apiFetch]);

  useEffect(() => { load(); }, [load]);

  const filtered = promos.filter((p) => {
    if (tab === "all") return true;
    const s = getStatus(p).label;
    if (tab === "active") return s === "Actif";
    if (tab === "expired") return s === "Expiré" || s === "Épuisé";
    if (tab === "disabled") return s === "Désactivé";
    return true;
  });
  const tabsWithCounts = TABS.map((t) => ({
    ...t,
    count: t.key === "all" ? promos.length : promos.filter((p) => {
      const s = getStatus(p).label;
      if (t.key === "active") return s === "Actif";
      if (t.key === "expired") return s === "Expiré" || s === "Épuisé";
      if (t.key === "disabled") return s === "Désactivé";
      return false;
    }).length,
  }));

  function openCreate() { setEditId(null); setForm(EMPTY_FORM); setError(""); setShowForm(true); }
  function openEdit(p: PromoCode) {
    setEditId(p.id);
    setForm({ code: p.code, name: p.name, description: p.description || "", discountType: p.discountType, discountValue: String(p.discountValue), minAmount: p.minAmount ? String(p.minAmount) : "", maxUses: p.maxUses ? String(p.maxUses) : "", startDate: p.startDate ? p.startDate.split("T")[0] : "", endDate: p.endDate ? p.endDate.split("T")[0] : "", active: p.active });
    setError(""); setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    const body = { code: form.code.toUpperCase(), name: form.name, description: form.description || undefined, discountType: form.discountType, discountValue: parseFloat(form.discountValue), minAmount: form.minAmount ? parseFloat(form.minAmount) : undefined, maxUses: form.maxUses ? parseInt(form.maxUses) : undefined, startDate: form.startDate || undefined, endDate: form.endDate || undefined, active: form.active };
    const url = editId ? `${API}/promo-codes/${editId}` : `${API}/promo-codes`;
    const res = await apiFetch(url, { method: editId ? "PUT" : "POST", body: JSON.stringify(body) });
    if (res.ok) { await load(); setShowForm(false); }
    else { const d = await res.json().catch(() => ({})); setError(d.message || "Erreur"); }
    setSaving(false);
  }

  async function deletePromo(id: string) {
    if (!confirm("Supprimer ce code promo ?")) return;
    await apiFetch(`${API}/promo-codes/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <PageHeader title="Codes promo" subtitle="Réductions et promotions" count={filtered.length} onAdd={openCreate} addLabel="Nouveau code" />

      <TabBar tabs={tabsWithCounts} activeTab={tab} onTabChange={setTab} />

      {filtered.length === 0 ? (
        <Empty>Aucun code promo</Empty>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 100px 120px 80px 100px 100px", gap: 12, padding: "6px 16px", fontSize: 11, color: "var(--grey-3)", fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase" }}>
            <span>Code</span><span>Nom</span><span>Statut</span><span>Type</span><span>Valeur</span><span>Utilisations</span><span style={{ textAlign: "right" }}>Actions</span>
          </div>
          {filtered.map((p) => {
            const status = getStatus(p);
            return (
              <div key={p.id} style={{ display: "grid", gridTemplateColumns: "140px 1fr 100px 120px 80px 100px 100px", gap: 12, padding: "12px 16px", background: "var(--black-2)", border: "1px solid var(--border)", borderRadius: 8, alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--white)", fontFamily: "var(--font-mono)", letterSpacing: ".08em" }}>{p.code}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--white)" }}>{p.name}</div>
                  {p.endDate && <div style={{ fontSize: 11, color: "var(--grey-3)" }}>Expire : {new Date(p.endDate).toLocaleDateString("fr-FR")}</div>}
                </div>
                <Badge color={status.color}>{status.label}</Badge>
                <Badge color={TYPE_MAP[p.discountType].color}>{TYPE_MAP[p.discountType].label}</Badge>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)" }}>
                  {p.discountValue}{p.discountType === "PERCENTAGE" ? "%" : "€"}
                </span>
                <span style={{ fontSize: 12, color: "var(--grey-2)" }}>
                  {p.currentUses}{p.maxUses ? ` / ${p.maxUses}` : ""}
                </span>
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <SmallBtn onClick={() => openEdit(p)}>Modifier</SmallBtn>
                  <SmallBtn onClick={() => deletePromo(p.id)} danger>Supprimer</SmallBtn>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <Modal onClose={() => setShowForm(false)}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--white)", marginBottom: 20 }}>{editId ? "Modifier le code promo" : "Nouveau code promo"}</h3>
          {error && <ErrorMsg>{error}</ErrorMsg>}
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Code *"><input required style={{ ...inputStyle, textTransform: "uppercase" }} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="PROMO20" /></Field>
              <Field label="Nom *"><input required style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Promo printemps" /></Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Type de réduction *">
                <select style={inputStyle} value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value as DiscountType })}>
                  <option value="PERCENTAGE">Pourcentage (%)</option>
                  <option value="FIXED_VALUE">Valeur fixe (€)</option>
                </select>
              </Field>
              <Field label="Valeur *"><input required type="number" min={0} style={inputStyle} value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} /></Field>
              <Field label="Montant min. (€)"><input type="number" min={0} style={inputStyle} value={form.minAmount} onChange={(e) => setForm({ ...form, minAmount: e.target.value })} /></Field>
              <Field label="Nb max. d'utilisations"><input type="number" min={1} style={inputStyle} value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} /></Field>
              <Field label="Valide à partir du"><input type="date" style={inputStyle} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
              <Field label="Expire le"><input type="date" style={inputStyle} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></Field>
            </div>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "var(--grey-2)", cursor: "pointer", marginBottom: 20 }}>
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Actif
            </label>
            <FormButtons saving={saving} onCancel={() => setShowForm(false)} submitLabel={editId ? "Enregistrer" : "Créer le code"} />
          </form>
        </Modal>
      )}
    </div>
  );
}
