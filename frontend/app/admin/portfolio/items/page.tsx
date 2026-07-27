"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { PageHeader, Badge, Empty, Modal, Field, ErrorMsg, FormButtons, SmallBtn, inputStyle } from "@/app/admin/components/SharedUI";

const API = "/api";

interface PortfolioProject {
  id: string;
  name: string;
  description?: string;
  tag?: string;
  languages: string[];
  link?: string;
  image?: string;
  position: number;
  active: boolean;
}

const TAG_COLORS: Record<string, string> = {
  "Application web": "#2D6FFF",
  Vitrine: "#5DD8A0",
  "E-commerce": "#F0C040",
  SaaS: "#FF6B6B",
  Booking: "#A78BFA",
};

function resolveImage(src?: string) {
  if (!src) return "";
  if (src.startsWith("/uploads")) return `/api${src}`;
  return src;
}

const EMPTY = { name: "", description: "", tag: "", languages: "", link: "", image: "", position: "0", active: true };

export default function PortfolioItemsPage() {
  const { apiFetch } = useAuth();
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");

  const load = useCallback(async () => {
    const res = await apiFetch(`${API}/portfolio`);
    if (res.ok) setProjects(await res.json());
  }, [apiFetch]);

  useEffect(() => { load(); }, [load]);

  function openCreate() { setEditId(null); setForm(EMPTY); setError(""); setImageFile(null); setImagePreview(""); setShowForm(true); }
  function openEdit(p: PortfolioProject) {
    setEditId(p.id);
    setForm({ name: p.name, description: p.description || "", tag: p.tag || "", languages: (p.languages || []).join(", "), link: p.link || "", image: p.image || "", position: String(p.position), active: p.active });
    setError(""); setImageFile(null); setImagePreview(p.image || ""); setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    let imageUrl = form.image || undefined;
    if (imageFile) {
      const formData = new FormData();
      formData.append("image", imageFile);
      const uploadRes = await apiFetch(`${API}/portfolio/upload`, { method: "POST", body: formData });
      if (uploadRes.ok) { const d = await uploadRes.json(); imageUrl = d.url; }
      else { const d = await uploadRes.json().catch(() => ({})); setError(d.message || "Erreur upload"); setSaving(false); return; }
    }
    const body = { name: form.name, description: form.description, tag: form.tag, languages: form.languages ? form.languages.split(",").map((l) => l.trim()).filter(Boolean) : [], link: form.link || undefined, image: imageUrl, position: parseInt(form.position) || 0, active: form.active };
    const url = editId ? `${API}/portfolio/${editId}` : `${API}/portfolio`;
    const res = await apiFetch(url, { method: editId ? "PUT" : "POST", body: JSON.stringify(body) });
    if (res.ok) { await load(); setShowForm(false); }
    else { const d = await res.json().catch(() => ({})); setError(d.message || "Erreur"); }
    setSaving(false);
  }

  async function deleteProject(id: string) {
    if (!confirm("Supprimer ce projet du portfolio ?")) return;
    await apiFetch(`${API}/portfolio/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <PageHeader title="Portfolio" subtitle="Projets affichés sur votre site" count={projects.length} onAdd={openCreate} addLabel="Nouveau projet" />

      {projects.length === 0 ? (
        <Empty>Aucun projet dans le portfolio</Empty>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {projects.sort((a, b) => a.position - b.position).map((p) => (
            <div key={p.id} style={{ background: "var(--black-2)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
              {resolveImage(p.image) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resolveImage(p.image)} alt={p.name} style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />
              )}
              <div style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--white)" }}>{p.name}</div>
                  <Badge color={p.active ? "var(--green)" : "#aaa"}>{p.active ? "Actif" : "Masqué"}</Badge>
                </div>
                {p.tag && <Badge color={TAG_COLORS[p.tag] || "var(--blue)"}>{p.tag}</Badge>}
                {p.languages?.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                    {p.languages.map((l) => <span key={l} style={{ fontSize: 11, padding: "2px 8px", background: "var(--black-3)", borderRadius: 20, color: "var(--grey-2)", border: "1px solid var(--border)" }}>{l}</span>)}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <SmallBtn onClick={() => openEdit(p)}>Modifier</SmallBtn>
                  <SmallBtn onClick={() => deleteProject(p.id)} danger>Supprimer</SmallBtn>
                  {p.link && <a href={p.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, padding: "4px 10px", background: "var(--black-3)", border: "1px solid var(--border-2)", borderRadius: "var(--r)", color: "var(--grey-2)", textDecoration: "none" }}>↗</a>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal onClose={() => setShowForm(false)}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--white)", marginBottom: 20 }}>{editId ? "Modifier le projet" : "Nouveau projet portfolio"}</h3>
          {error && <ErrorMsg>{error}</ErrorMsg>}
          <form onSubmit={handleSubmit}>
            <Field label="Nom du projet *"><input required style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Description"><textarea rows={3} style={{ ...inputStyle, resize: "vertical" }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Tag / Catégorie"><input style={inputStyle} value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} placeholder="Vitrine, SaaS..." /></Field>
              <Field label="Technologies (virgule)"><input style={inputStyle} value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} placeholder="React, TypeScript..." /></Field>
            </div>
            <Field label="URL du projet"><input type="url" style={inputStyle} value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://..." /></Field>
            <Field label="Image (fichier)">
              <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); } }} style={{ ...inputStyle, cursor: "pointer" }} />
              {imagePreview && <img src={imagePreview} alt="aperçu" style={{ marginTop: 8, maxHeight: 120, borderRadius: 6, objectFit: "cover" }} />}
            </Field>
            <div style={{ display: "flex", gap: 12 }}>
              <Field label="Position"><input type="number" min={0} style={inputStyle} value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></Field>
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "var(--grey-2)", cursor: "pointer", marginTop: 24 }}>
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Visible sur le site
              </label>
            </div>
            <FormButtons saving={saving} onCancel={() => setShowForm(false)} submitLabel={editId ? "Enregistrer" : "Créer le projet"} />
          </form>
        </Modal>
      )}
    </div>
  );
}
