"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import {
  ActionButton,
  Badge,
  Empty,
  ErrorMsg,
  Field,
  FormButtons,
  ListActions,
  ListRow,
  ListTable,
  Modal,
  PageHeader,
  TabBar,
  inputStyle,
} from "@/app/admin/components/SharedUI";

const API = "/api";

type ProjectStatus =
  | "EN_ATTENTE"
  | "EN_COURS"
  | "EN_LIGNE"
  | "LIVRE"
  | "ARCHIVE";

interface ClientProject {
  id: string;
  name: string;
  status: ProjectStatus;
  clientId: string;
  client?: { company: string; contactName: string };
  devis?: { id: string; number: string; totalHT: number; status: string };
  productionUrl?: string;
  notes?: string;
  createdAt: string;
}

const STATUS_COLORS: Record<ProjectStatus, string> = {
  EN_ATTENTE: "#aaa",
  EN_COURS: "var(--blue)",
  EN_LIGNE: "var(--gold)",
  LIVRE: "var(--green)",
  ARCHIVE: "#5D8AFF",
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  EN_ATTENTE: "En attente",
  EN_COURS: "En cours",
  EN_LIGNE: "En ligne",
  LIVRE: "Livré",
  ARCHIVE: "Archivé",
};

const TABS = [
  { key: "all", label: "Tous" },
  { key: "EN_ATTENTE", label: "En attente" },
  { key: "EN_COURS", label: "En cours" },
  { key: "EN_LIGNE", label: "En ligne" },
  { key: "LIVRE", label: "Livrés" },
  { key: "ARCHIVE", label: "Archivés" },
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
  const [form, setForm] = useState({
    name: "",
    clientId: "",
    status: "EN_ATTENTE" as ProjectStatus,
    productionUrl: "",
    notes: "",
  });

  const load = useCallback(async () => {
    const [projRes, clientRes] = await Promise.all([
      apiFetch(`${API}/crm/projects`),
      apiFetch(`${API}/clients`),
    ]);
    if (projRes.ok) setProjects(await projRes.json());
    if (clientRes.ok) setClients(await clientRes.json());
    setLoading(false);
  }, [apiFetch]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered =
    tab === "all" ? projects : projects.filter((p) => p.status === tab);
  const tabsWithCounts = TABS.map((t) => ({
    ...t,
    count:
      t.key === "all"
        ? projects.length
        : projects.filter((p) => p.status === t.key).length,
  }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await apiFetch(`${API}/crm/projects`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Erreur");
      }
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
      <PageHeader
        title="Projets clients"
        subtitle="Suivi des projets en cours"
        count={filtered.length}
        onAdd={() => {
          setForm({
            name: "",
            clientId: "",
            status: "EN_ATTENTE",
            productionUrl: "",
            notes: "",
          });
          setError("");
          setShowModal(true);
        }}
        addLabel="Nouveau projet"
      />

      <TabBar tabs={tabsWithCounts} activeTab={tab} onTabChange={setTab} />

      {loading ? (
        <div
          style={{ padding: 40, textAlign: "center", color: "var(--grey-3)" }}
        >
          Chargement...
        </div>
      ) : filtered.length === 0 ? (
        <Empty>Aucun projet</Empty>
      ) : (
        <ListTable
          columns="minmax(250px, 1.2fr) 130px minmax(150px, .8fr) minmax(180px, 1fr) 100px"
          minWidth={900}
          header={
            <>
              <span>Projet / client</span>
              <span>Statut</span>
              <span>Devis</span>
              <span>Production</span>
              <span style={{ textAlign: "right" }}>Actions</span>
            </>
          }
        >
          {filtered.map((project) => (
            <ListRow
              key={project.id}
              onOpen={() => router.push(`/admin/crm/projects/${project.id}`)}
              openLabel={`Ouvrir le projet ${project.name}`}
            >
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--white)",
                  }}
                >
                  {project.name}
                </div>
                <div
                  style={{ marginTop: 2, fontSize: 11, color: "var(--grey-3)" }}
                >
                  {project.client?.company || "—"}
                  {project.client?.contactName
                    ? ` · ${project.client.contactName}`
                    : ""}
                </div>
              </div>
              <Badge color={STATUS_COLORS[project.status]}>
                {STATUS_LABELS[project.status]}
              </Badge>
              <span style={{ fontSize: 11, color: "var(--grey-2)" }}>
                {project.devis
                  ? `${project.devis.number} · ${project.devis.totalHT.toFixed(0)} € HT`
                  : "—"}
              </span>
              <span
                style={{
                  overflow: "hidden",
                  color: project.productionUrl ? "#8aafff" : "var(--grey-3)",
                  fontSize: 11,
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {project.productionUrl || "Non publiée"}
              </span>
              <ListActions>
                <ActionButton
                  variant="primary"
                  onClick={() =>
                    router.push(`/admin/crm/projects/${project.id}`)
                  }
                >
                  Ouvrir →
                </ActionButton>
              </ListActions>
            </ListRow>
          ))}
        </ListTable>
      )}

      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <h3
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "var(--white)",
              marginBottom: 20,
            }}
          >
            Nouveau projet
          </h3>
          {error && <ErrorMsg>{error}</ErrorMsg>}
          <form onSubmit={handleSubmit}>
            <Field label="Titre du projet *">
              <input
                required
                style={inputStyle}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Client *">
              <select
                required
                style={inputStyle}
                value={form.clientId}
                onChange={(e) => setForm({ ...form, clientId: e.target.value })}
              >
                <option value="">-- Choisir un client --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="URL de production">
              <input
                type="url"
                style={inputStyle}
                value={form.productionUrl}
                onChange={(e) =>
                  setForm({ ...form, productionUrl: e.target.value })
                }
                placeholder="https://…"
              />
            </Field>
            <Field label="Notes">
              <textarea
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
            <FormButtons
              saving={saving}
              onCancel={() => setShowModal(false)}
              submitLabel="Créer le projet"
            />
          </form>
        </Modal>
      )}
    </div>
  );
}
