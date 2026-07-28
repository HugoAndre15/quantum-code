"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/context/AuthContext";
import {
  PageHeader,
  Badge,
  Empty,
  Modal,
  Field,
  ErrorMsg,
  FormButtons,
  TabBar,
  inputStyle,
} from "@/app/admin/components/SharedUI";

const API = "/api";

type LeadStatus = "NOUVEAU" | "CONTACTE" | "QUALIFIE" | "CONVERTI" | "PERDU";
type LeadSource = "SIMULATOR" | "CONTACT" | "MANUEL";

interface Lead {
  id: string;
  name: string;
  company?: string;
  email: string;
  phone?: string;
  source: LeadSource;
  status: LeadStatus;
  score: number;
  budget?: number;
  notes?: string;
  createdAt: string;
}

const STATUS_COLORS: Record<LeadStatus, string> = {
  NOUVEAU: "#aaa",
  CONTACTE: "var(--blue)",
  QUALIFIE: "var(--gold)",
  CONVERTI: "var(--green)",
  PERDU: "#ff6b6b",
};

const STATUS_LABELS: Record<LeadStatus, string> = {
  NOUVEAU: "Nouveau",
  CONTACTE: "Contacté",
  QUALIFIE: "Qualifié",
  CONVERTI: "Converti",
  PERDU: "Perdu",
};

const SOURCE_LABELS: Record<LeadSource, string> = {
  SIMULATOR: "Simulateur",
  CONTACT: "Formulaire contact",
  MANUEL: "Ajout manuel",
};

const ALL_STATUSES: LeadStatus[] = ["NOUVEAU", "CONTACTE", "QUALIFIE", "CONVERTI", "PERDU"];

const TABS = [
  { key: "all", label: "Tous" },
  { key: "NOUVEAU", label: "Nouveaux" },
  { key: "CONTACTE", label: "Contactés" },
  { key: "QUALIFIE", label: "Qualifiés" },
  { key: "CONVERTI", label: "Convertis" },
  { key: "PERDU", label: "Perdus" },
];

export default function LeadsPage() {
  const { apiFetch } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [form, setForm] = useState({
    company: "", name: "", email: "", phone: "",
    source: "MANUEL" as LeadSource, status: "NOUVEAU" as LeadStatus,
    budget: "", notes: "",
  });

  const load = useCallback(async () => {
    const res = await apiFetch(`${API}/crm/leads`);
    if (res.ok) setLeads(await res.json());
    setLoading(false);
  }, [apiFetch]);

  useEffect(() => { load(); }, [load]);

  const filtered = tab === "all" ? leads : leads.filter((l) => l.status === tab);

  function openCreate() {
    setEditLead(null);
    setForm({ company: "", name: "", email: "", phone: "", source: "MANUEL", status: "NOUVEAU", budget: "", notes: "" });
    setError("");
    setShowModal(true);
  }

  function openEdit(lead: Lead) {
    setEditLead(lead);
    setForm({
      company: lead.company || "", name: lead.name, email: lead.email,
      phone: lead.phone || "", source: lead.source, status: lead.status,
      budget: lead.budget?.toString() || "", notes: lead.notes || "",
    });
    setError("");
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const payload = editLead
      ? {
          company: form.company || undefined,
          phone: form.phone || undefined,
          status: form.status,
          budget: form.budget ? Number(form.budget) : undefined,
          notes: form.notes || undefined,
        }
      : {
          name: form.name,
          email: form.email,
          company: form.company || undefined,
          phone: form.phone || undefined,
          source: form.source,
          budget: form.budget ? Number(form.budget) : undefined,
          notes: form.notes || undefined,
        };
    try {
      const url = editLead ? `${API}/crm/leads/${editLead.id}` : `${API}/crm/leads`;
      const method = editLead ? "PATCH" : "POST";
      const res = await apiFetch(url, { method, body: JSON.stringify(payload) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || "Erreur"); }
      await load();
      setShowModal(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function convertToClient(lead: Lead) {
    if (!confirm(`Convertir "${lead.company || lead.name}" en client ?`)) return;
    const res = await apiFetch(`${API}/crm/leads/${lead.id}/convert`, { method: "POST" });
    if (res.ok) await load();
  }

  async function deleteLead(id: string) {
    if (!confirm("Supprimer ce lead ?")) return;
    await apiFetch(`${API}/crm/leads/${id}`, { method: "DELETE" });
    await load();
  }

  const tabsWithCounts = TABS.map((t) => ({
    ...t,
    count: t.key === "all" ? leads.length : leads.filter((l) => l.status === t.key).length,
  }));

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle="Prospects à convertir en clients"
        count={filtered.length}
        onAdd={openCreate}
        addLabel="Nouveau lead"
      />

      <TabBar tabs={tabsWithCounts} activeTab={tab} onTabChange={setTab} />

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--grey-3)" }}>Chargement...</div>
      ) : filtered.length === 0 ? (
        <Empty>Aucun lead{tab !== "all" ? ` avec le statut "${STATUS_LABELS[tab as LeadStatus]}"` : ""}</Empty>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 100px 80px 90px 100px", gap: 12, padding: "6px 16px", fontSize: 11, color: "var(--grey-3)", fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase" }}>
            <span>Entreprise / Contact</span>
            <span>Source</span>
            <span>Statut</span>
            <span>Score</span>
            <span>Budget</span>
            <span style={{ textAlign: "right" }}>Actions</span>
          </div>

          {filtered.map((lead) => (
            <div
              key={lead.id}
              style={{ display: "grid", gridTemplateColumns: "1fr 140px 100px 80px 90px 100px", gap: 12, padding: "12px 16px", background: "var(--black-2)", border: "1px solid var(--border)", borderRadius: 8, alignItems: "center" }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--white)" }}>{lead.company || lead.name}</div>
                <div style={{ fontSize: 11, color: "var(--grey-3)", marginTop: 2 }}>{lead.name} · {lead.email}</div>
              </div>
              <span style={{ fontSize: 12, color: "var(--grey-2)" }}>{SOURCE_LABELS[lead.source]}</span>
              <Badge color={STATUS_COLORS[lead.status]}>{STATUS_LABELS[lead.status]}</Badge>
              <div style={{ fontSize: 13, fontWeight: 600, color: lead.score >= 61 ? "var(--green)" : lead.score >= 31 ? "var(--gold)" : "var(--grey-3)" }}>
                {lead.score}/100
              </div>
              <span style={{ fontSize: 13, color: lead.budget ? "var(--gold)" : "var(--grey-3)" }}>
                {lead.budget ? `${lead.budget}€` : "—"}
              </span>
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <button onClick={() => openEdit(lead)} style={{ fontSize: 11, padding: "4px 10px", background: "var(--black-3)", border: "1px solid var(--border-2)", borderRadius: "var(--r)", color: "var(--grey-2)", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                  Éditer
                </button>
                {lead.status !== "CONVERTI" && (
                  <button onClick={() => convertToClient(lead)} style={{ fontSize: 11, padding: "4px 10px", background: "rgba(93,216,160,.1)", border: "1px solid rgba(93,216,160,.3)", borderRadius: "var(--r)", color: "var(--green)", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                    → Client
                  </button>
                )}
                <button onClick={() => deleteLead(lead.id)} style={{ fontSize: 11, padding: "4px 8px", background: "transparent", border: "1px solid transparent", borderRadius: "var(--r)", color: "var(--grey-4)", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal onClose={() => setShowModal(false)} maxWidth={560}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--white)", marginBottom: 20 }}>
            {editLead ? "Modifier le lead" : "Nouveau lead"}
          </h3>
          {error && <ErrorMsg>{error}</ErrorMsg>}
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Entreprise">
                <input style={inputStyle} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              </Field>
              <Field label="Contact *">
                <input required disabled={Boolean(editLead)} style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label="Email *">
                <input required disabled={Boolean(editLead)} type="email" style={inputStyle} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Field>
              <Field label="Téléphone">
                <input style={inputStyle} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </Field>
              <Field label="Budget estimé (€)">
                <input type="number" style={inputStyle} value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
              </Field>
              <Field label="Source">
                <select disabled={Boolean(editLead)} style={inputStyle} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value as LeadSource })}>
                  {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="Statut">
                <select style={inputStyle} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as LeadStatus })}>
                  {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Notes">
              <textarea rows={3} style={{ ...inputStyle, resize: "vertical" }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
            <FormButtons saving={saving} onCancel={() => setShowModal(false)} submitLabel={editLead ? "Enregistrer" : "Créer le lead"} />
          </form>
        </Modal>
      )}
    </div>
  );
}
