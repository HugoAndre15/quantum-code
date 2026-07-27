"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { PageHeader, Badge, Empty, TabBar, Modal, Field, ErrorMsg, FormButtons, Card, SmallBtn, inputStyle } from "@/app/admin/components/SharedUI";

const API = "/api";

interface Pack {
  id: string;
  name: string;
  description?: string;
  price: number;
  devTime?: number;
  position: number;
  active: boolean;
  features: string[];
  includedPages: number;
}

interface ServiceOption {
  id: string;
  name: string;
  price: number;
  category: string;
  active: boolean;
  recurring: boolean;
  recurringUnit?: string;
}

const EMPTY_PACK = { name: "", description: "", price: "", devTime: "", position: "0", active: true, features: "", includedPages: "0" };
const EMPTY_OPT = { name: "", description: "", price: "", devTime: "", category: "general", active: true, recurring: false, recurringUnit: "" };
const TABS = [{ key: "packs", label: "Packs" }, { key: "options", label: "Options & Services" }];

export default function PackagesPage() {
  const { apiFetch } = useAuth();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [options, setOptions] = useState<ServiceOption[]>([]);
  const [tab, setTab] = useState("packs");
  const [showPackForm, setShowPackForm] = useState(false);
  const [editPack, setEditPack] = useState<string | null>(null);
  const [packForm, setPackForm] = useState(EMPTY_PACK);
  const [showOptForm, setShowOptForm] = useState(false);
  const [editOpt, setEditOpt] = useState<string | null>(null);
  const [optForm, setOptForm] = useState(EMPTY_OPT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [packRes, optRes] = await Promise.all([apiFetch(`${API}/offers/packs`), apiFetch(`${API}/offers/options`)]);
    if (packRes.ok) setPacks(await packRes.json());
    if (optRes.ok) setOptions(await optRes.json());
  }, [apiFetch]);

  useEffect(() => { load(); }, [load]);

  function openCreatePack() { setEditPack(null); setPackForm(EMPTY_PACK); setError(""); setShowPackForm(true); }
  function openEditPack(p: Pack) {
    setEditPack(p.id);
    setPackForm({ name: p.name, description: p.description || "", price: String(p.price), devTime: p.devTime != null ? String(p.devTime) : "", position: String(p.position), active: p.active, features: (p.features || []).join(", "), includedPages: String(p.includedPages) });
    setError(""); setShowPackForm(true);
  }
  function openCreateOpt() { setEditOpt(null); setOptForm(EMPTY_OPT); setError(""); setShowOptForm(true); }
  function openEditOpt(o: ServiceOption) {
    setEditOpt(o.id);
    setOptForm({ name: o.name, description: "", price: String(o.price), devTime: "", category: o.category, active: o.active, recurring: o.recurring, recurringUnit: o.recurringUnit || "" });
    setError(""); setShowOptForm(true);
  }

  async function handlePackSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    const body = { name: packForm.name, description: packForm.description || undefined, price: parseFloat(packForm.price), devTime: packForm.devTime ? parseFloat(packForm.devTime) : 0, position: parseInt(packForm.position) || 0, active: packForm.active, features: packForm.features ? packForm.features.split(",").map((f) => f.trim()).filter(Boolean) : [], includedPages: parseInt(packForm.includedPages) || 0 };
    const url = editPack ? `${API}/offers/packs/${editPack}` : `${API}/offers/packs`;
    const res = await apiFetch(url, { method: editPack ? "PUT" : "POST", body: JSON.stringify(body) });
    if (res.ok) { await load(); setShowPackForm(false); }
    else { const d = await res.json().catch(() => ({})); setError(d.message || "Erreur"); }
    setSaving(false);
  }

  async function handleOptSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    const body = { name: optForm.name, price: parseFloat(optForm.price), category: optForm.category, active: optForm.active, recurring: optForm.recurring, recurringUnit: optForm.recurringUnit || undefined };
    const url = editOpt ? `${API}/offers/options/${editOpt}` : `${API}/offers/options`;
    const res = await apiFetch(url, { method: editOpt ? "PUT" : "POST", body: JSON.stringify(body) });
    if (res.ok) { await load(); setShowOptForm(false); }
    else { const d = await res.json().catch(() => ({})); setError(d.message || "Erreur"); }
    setSaving(false);
  }

  async function togglePack(id: string, active: boolean) {
    await apiFetch(`${API}/offers/packs/${id}`, { method: "PUT", body: JSON.stringify({ active: !active }) });
    await load();
  }
  async function toggleOpt(id: string, active: boolean) {
    await apiFetch(`${API}/offers/options/${id}`, { method: "PUT", body: JSON.stringify({ active: !active }) });
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Packs & Options"
        subtitle="Catalogue de vos offres et services"
        count={tab === "packs" ? packs.length : options.length}
        onAdd={tab === "packs" ? openCreatePack : openCreateOpt}
        addLabel={tab === "packs" ? "Nouveau pack" : "Nouvelle option"}
      />

      <TabBar tabs={TABS} activeTab={tab} onTabChange={setTab} />

      {/* PACKS */}
      {tab === "packs" && (
        packs.length === 0 ? <Empty>Aucun pack défini</Empty> : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {packs.sort((a, b) => a.position - b.position).map((p) => (
              <Card key={p.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--white)" }}>{p.name}</div>
                  <Badge color={p.active ? "var(--green)" : "#aaa"}>{p.active ? "Actif" : "Inactif"}</Badge>
                </div>
                {p.description && <div style={{ fontSize: 12, color: "var(--grey-3)", marginBottom: 10 }}>{p.description}</div>}
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--gold)", marginBottom: 8 }}>{p.price}€ <span style={{ fontSize: 12, fontWeight: 400, color: "var(--grey-3)" }}>HT</span></div>
                {p.features?.length > 0 && (
                  <ul style={{ margin: "0 0 12px 0", padding: "0 0 0 18px", fontSize: 12, color: "var(--grey-2)", display: "flex", flexDirection: "column", gap: 3 }}>
                    {p.features.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <SmallBtn onClick={() => openEditPack(p)}>Modifier</SmallBtn>
                  <SmallBtn onClick={() => togglePack(p.id, p.active)} danger={p.active}>{p.active ? "Désactiver" : "Activer"}</SmallBtn>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {/* OPTIONS */}
      {tab === "options" && (
        options.length === 0 ? <Empty>Aucune option définie</Empty> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {options.map((o) => (
              <div key={o.id} style={{ display: "grid", gridTemplateColumns: "1fr 100px 80px 80px 120px", gap: 12, padding: "12px 16px", background: "var(--black-2)", border: "1px solid var(--border)", borderRadius: 8, alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--white)" }}>{o.name}</div>
                  <div style={{ fontSize: 11, color: "var(--grey-3)" }}>{o.category} {o.recurring && `· ${o.recurringUnit || "récurrent"}`}</div>
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--gold)" }}>{o.price}€</span>
                <Badge color={o.active ? "var(--green)" : "#aaa"}>{o.active ? "Actif" : "Inactif"}</Badge>
                {o.recurring ? <Badge color="var(--blue)">Récurrent</Badge> : <span />}
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <SmallBtn onClick={() => openEditOpt(o)}>Modifier</SmallBtn>
                  <SmallBtn onClick={() => toggleOpt(o.id, o.active)} danger={o.active}>{o.active ? "Off" : "On"}</SmallBtn>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Pack modal */}
      {showPackForm && (
        <Modal onClose={() => setShowPackForm(false)}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--white)", marginBottom: 20 }}>{editPack ? "Modifier le pack" : "Nouveau pack"}</h3>
          {error && <ErrorMsg>{error}</ErrorMsg>}
          <form onSubmit={handlePackSubmit}>
            <Field label="Nom *"><input required style={inputStyle} value={packForm.name} onChange={(e) => setPackForm({ ...packForm, name: e.target.value })} /></Field>
            <Field label="Description"><textarea rows={2} style={{ ...inputStyle, resize: "vertical" }} value={packForm.description} onChange={(e) => setPackForm({ ...packForm, description: e.target.value })} /></Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <Field label="Prix HT (€) *"><input required type="number" min={0} style={inputStyle} value={packForm.price} onChange={(e) => setPackForm({ ...packForm, price: e.target.value })} /></Field>
              <Field label="Jours de dev"><input type="number" min={0} style={inputStyle} value={packForm.devTime} onChange={(e) => setPackForm({ ...packForm, devTime: e.target.value })} /></Field>
              <Field label="Pages incluses"><input type="number" min={0} style={inputStyle} value={packForm.includedPages} onChange={(e) => setPackForm({ ...packForm, includedPages: e.target.value })} /></Field>
            </div>
            <Field label="Fonctionnalités (séparées par des virgules)"><input style={inputStyle} value={packForm.features} onChange={(e) => setPackForm({ ...packForm, features: e.target.value })} placeholder="Responsive, SEO, CMS..." /></Field>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <input type="checkbox" id="pack-active" checked={packForm.active} onChange={(e) => setPackForm({ ...packForm, active: e.target.checked })} />
              <label htmlFor="pack-active" style={{ fontSize: 13, color: "var(--grey-2)" }}>Pack actif (visible dans le simulateur)</label>
            </div>
            <FormButtons saving={saving} onCancel={() => setShowPackForm(false)} submitLabel={editPack ? "Enregistrer" : "Créer le pack"} />
          </form>
        </Modal>
      )}

      {/* Option modal */}
      {showOptForm && (
        <Modal onClose={() => setShowOptForm(false)}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--white)", marginBottom: 20 }}>{editOpt ? "Modifier l'option" : "Nouvelle option"}</h3>
          {error && <ErrorMsg>{error}</ErrorMsg>}
          <form onSubmit={handleOptSubmit}>
            <Field label="Nom *"><input required style={inputStyle} value={optForm.name} onChange={(e) => setOptForm({ ...optForm, name: e.target.value })} /></Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Prix HT (€) *"><input required type="number" min={0} style={inputStyle} value={optForm.price} onChange={(e) => setOptForm({ ...optForm, price: e.target.value })} /></Field>
              <Field label="Catégorie"><input style={inputStyle} value={optForm.category} onChange={(e) => setOptForm({ ...optForm, category: e.target.value })} placeholder="general, seo, design..." /></Field>
            </div>
            <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "var(--grey-2)", cursor: "pointer" }}>
                <input type="checkbox" checked={optForm.recurring} onChange={(e) => setOptForm({ ...optForm, recurring: e.target.checked })} /> Récurrent
              </label>
              {optForm.recurring && (
                <Field label="Unité récurrence"><input style={inputStyle} value={optForm.recurringUnit} onChange={(e) => setOptForm({ ...optForm, recurringUnit: e.target.value })} placeholder="/ mois" /></Field>
              )}
            </div>
            <FormButtons saving={saving} onCancel={() => setShowOptForm(false)} submitLabel={editOpt ? "Enregistrer" : "Créer l'option"} />
          </form>
        </Modal>
      )}
    </div>
  );
}
