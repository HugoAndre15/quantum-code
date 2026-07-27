"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import {
  PageHeader, Badge, Empty, TabBar, Modal, Field, ErrorMsg, FormButtons, inputStyle,
} from "@/app/admin/components/SharedUI";

const API = "/api";

type ProjectStatus = "EN_ATTENTE" | "EN_COURS" | "EN_REVISION" | "LIVRE" | "TERMINE";

interface ClientProject {
  id: string;
  title: string;
  status: ProjectStatus;
  clientId: string;
  client?: { company: string; contactName: string };
  startDate?: string;
  deliveryDate?: string;
  notes?: string;
  tasksTotal: number;
  tasksDone: number;
  createdAt: string;
}

const STATUS_COLORS: Record<ProjectStatus, string> = {
  EN_ATTENTE: "#aaa",
  EN_COURS: "var(--blue)",
  EN_REVISION: "var(--gold)",
  LIVRE: "var(--green)",
  TERMINE: "#5D8AFF",
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  EN_ATTENTE: "En attente",
  EN_COURS: "En cours",
  EN_REVISION: "En révision",
  LIVRE: "Livré",
  TERMINE: "Terminé",
};

const TABS = [
  { key: "all", label: "Tous" },
  { key: "EN_ATTENTE", label: "En attente" },
  { key: "EN_COURS", label: "En cours" },
  { key: "EN_REVISION", label: "En révision" },
  { key: "LIVRE", label: "Livrés" },
  { key: "TERMINE", label: "Terminés" },
];

export default function ClientProjectsPage() {
  const { apiFetch } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [clients, setClients] = useState<{ id: string; company: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ title: "", clientId: "", status: "EN_ATTENTE" as ProjectStatus, startDate: "", deliveryDate: "", notes: "" });

  const load = useCallback(async () => {
    const [projRes, clientRes] = await Promise.all([
      apiFetch(`${API}/crm/projects`),
      apiFetch(`${API}/clients`),
    ]);
    if (projRes.ok) setProjects(await projRes.json());
    if (clientRes.ok) setClients(await clientRes.json());
    setLoading(false);
  }, [apiFetch]);

  useEffect(() => { load(); }, [load]);

  const filtered = tab === "all" ? projects : projects.filter((p) => p.status === tab);
  const tabsWithCounts = TABS.map((t) => ({ ...t, count: t.key === "all" ? projects.length : projects.filter((p) => p.status === t.key).length }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await apiFetch(`${API}/crm/projects`, { method: "POST", body: JSON.stringify(form) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || "Erreur"); }
      await load();
      setShowModal(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="Projets clients" subtitle="Suivi des projets en cours" count={filtered.length} onAdd={() => { setForm({ title: "", clientId: "", status: "EN_ATTENTE", startDate: "", deliveryDate: "", notes: "" }); setError(""); setShowModal(true); }} addLabel="Nouveau projet" />

      <TabBar tabs={tabsWithCounts} activeTab={tab} onTabChange={setTab} />

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--grey-3)" }}>Chargement...</div>
      ) : filtered.length === 0 ? (
        <Empty>Aucun projet</Empty>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {filtered.map((project) => {
            const progress = project.tasksTotal > 0 ? Math.round((project.tasksDone / project.tasksTotal) * 100) : 0;
            return (
              <div
                key={project.id}
                onClick={() => router.push(`/admin/crm/projects/${project.id}`)}
                style={{ background: "var(--black-2)", border: "1px solid var(--border)", borderRadius: 10, padding: 20, cursor: "pointer", transition: "border-color .15s" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--blue)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)")}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--white)" }}>{project.title}</div>
                  <Badge color={STATUS_COLORS[project.status]}>{STATUS_LABELS[project.status]}</Badge>
                </div>
                <div style={{ fontSize: 12, color: "var(--grey-3)", marginBottom: 14 }}>
                  {project.client?.company} · {project.client?.contactName}
                </div>
                {project.tasksTotal > 0 && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 11, color: "var(--grey-3)" }}>
                      <span>Avancement</span>
                      <span>{progress}% ({project.tasksDone}/{project.tasksTotal} tâches)</span>
                    </div>
                    <div style={{ height: 4, background: "var(--black-3)", borderRadius: 2 }}>
                      <div style={{ height: 4, borderRadius: 2, background: "var(--blue)", width: `${progress}%`, transition: "width .3s" }} />
                    </div>
                  </div>
                )}
                {project.deliveryDate && (
                  <div style={{ marginTop: 10, fontSize: 11, color: "var(--grey-3)" }}>
                    Livraison prévue : {new Date(project.deliveryDate).toLocaleDateString("fr-FR")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--white)", marginBottom: 20 }}>Nouveau projet</h3>
          {error && <ErrorMsg>{error}</ErrorMsg>}
          <form onSubmit={handleSubmit}>
            <Field label="Titre du projet *">
              <input required style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
            <Field label="Client *">
              <select required style={inputStyle} value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
                <option value="">-- Choisir un client --</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.company}</option>)}
              </select>
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Date de début">
                <input type="date" style={inputStyle} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </Field>
              <Field label="Date de livraison">
                <input type="date" style={inputStyle} value={form.deliveryDate} onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })} />
              </Field>
            </div>
            <Field label="Notes">
              <textarea rows={3} style={{ ...inputStyle, resize: "vertical" }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
            <FormButtons saving={saving} onCancel={() => setShowModal(false)} submitLabel="Créer le projet" />
          </form>
        </Modal>
      )}
    </div>
  );
}
