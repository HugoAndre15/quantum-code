"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { Card, ErrorMsg, Field, PageHeader, inputStyle } from "@/app/admin/components/SharedUI";
import CommercialPanel from "@/app/admin/components/CommercialPanel";

const API = "/api";
type ProjectStatus = "EN_ATTENTE" | "EN_COURS" | "EN_LIGNE" | "LIVRE" | "ARCHIVE";

interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  productionUrl?: string;
  notes?: string;
  client: { id: string; company: string; contactName: string };
  devis?: { id: string; number: string; totalHT: number; factures?: Array<{ id: string; number: string }> };
}

const LABELS: Record<ProjectStatus, string> = {
  EN_ATTENTE: "En attente",
  EN_COURS: "En cours",
  EN_LIGNE: "En ligne",
  LIVRE: "Livré",
  ARCHIVE: "Archivé",
};

export default function ProjectDetailsPage({ params }: { params: { id: string } }) {
  const { apiFetch } = useAuth();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [name, setName] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("EN_ATTENTE");
  const [productionUrl, setProductionUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const response = await apiFetch(`${API}/crm/projects/${params.id}`);
    if (!response.ok) {
      setError("Projet introuvable.");
      return;
    }
    const data: Project = await response.json();
    setProject(data);
    setName(data.name);
    setStatus(data.status);
    setProductionUrl(data.productionUrl || "");
    setNotes(data.notes || "");
  }, [apiFetch, params.id]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true);
    setError("");
    const response = await apiFetch(`${API}/crm/projects/${params.id}`, {
      method: "PATCH",
      body: JSON.stringify({ name, status, productionUrl: productionUrl || undefined, notes: notes || undefined }),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setError(data.message || "Enregistrement impossible.");
      return;
    }
    setMessage("Projet enregistré.");
    await load();
  }

  async function remove() {
    if (!confirm("Supprimer définitivement ce projet ?")) return;
    const response = await apiFetch(`${API}/crm/projects/${params.id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.message || "Suppression impossible.");
      return;
    }
    router.push("/admin/crm/projects");
  }

  if (!project && !error) return <div style={{ padding: 40, color: "var(--grey-3)" }}>Chargement...</div>;

  return (
    <div>
      <PageHeader title={project?.name || "Projet"} subtitle={project ? `${project.client.company} · ${LABELS[project.status]}` : "Détail"} />
      {error && <ErrorMsg>{error}</ErrorMsg>}
      {message && <div style={{ color: "var(--green)", fontSize: 12, marginBottom: 14 }}>{message}</div>}
      {project && (
        <>
          <Card>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
              <Field label="Nom du projet">
                <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Statut">
                <select style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
                  {(Object.keys(LABELS) as ProjectStatus[]).map((value) => <option key={value} value={value}>{LABELS[value]}</option>)}
                </select>
              </Field>
            </div>
            <Field label="URL de production">
              <input type="url" style={inputStyle} value={productionUrl} onChange={(e) => setProductionUrl(e.target.value)} placeholder="https://…" />
            </Field>
            <Field label="Notes">
              <textarea rows={5} style={{ ...inputStyle, resize: "vertical" }} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            <div style={{ display: "flex", gap: 8 }}>
              <button disabled={saving} onClick={save} style={{ ...buttonStyle, background: "var(--blue)", color: "#fff", borderColor: "var(--blue)" }}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
              <button onClick={() => router.push(`/admin/crm/clients/${project.client.id}`)} style={buttonStyle}>Voir le client</button>
              {project.devis && <button onClick={() => router.push(`/admin/sales/quotes/${project.devis?.id}`)} style={buttonStyle}>Voir {project.devis.number}</button>}
              {productionUrl && <a href={productionUrl} target="_blank" rel="noopener noreferrer" style={buttonStyle}>Ouvrir le site ↗</a>}
            </div>
          </Card>
          <CommercialPanel context={{ clientId: project.client.id, devisId: project.devis?.id, projectId: project.id }} />
          <button onClick={remove} style={{ ...buttonStyle, marginTop: 18, color: "#ff6b6b", borderColor: "rgba(255,107,107,.35)" }}>Supprimer le projet</button>
        </>
      )}
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  display: "inline-flex",
  padding: "8px 12px",
  background: "var(--black-3)",
  border: "1px solid var(--border-2)",
  color: "var(--grey-2)",
  borderRadius: 6,
  cursor: "pointer",
  textDecoration: "none",
  fontFamily: "var(--font-sans)",
  fontSize: 12,
};
