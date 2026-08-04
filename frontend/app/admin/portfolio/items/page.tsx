"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/context/AuthContext";
import {
  ActionButton,
  ActionLink,
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
  inputStyle,
} from "@/app/admin/components/SharedUI";

const API = "/api";

interface PortfolioProject {
  id: string;
  slug?: string;
  name: string;
  description?: string;
  tag?: string;
  languages: string[];
  link?: string;
  image?: string;
  clientProblem?: string;
  solution?: string;
  result?: string;
  features: string[];
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

function isManagedBlobUrl(src?: string) {
  if (!src) return false;
  try {
    return new URL(src).hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

const EMPTY = {
  slug: "",
  name: "",
  description: "",
  tag: "",
  languages: "",
  link: "",
  image: "",
  clientProblem: "",
  solution: "",
  result: "",
  features: "",
  position: "0",
  active: true,
};

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

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditId(null);
    setForm(EMPTY);
    setError("");
    setImageFile(null);
    setImagePreview("");
    setShowForm(true);
  }
  function openEdit(p: PortfolioProject) {
    setEditId(p.id);
    setForm({
      slug: p.slug || "",
      name: p.name,
      description: p.description || "",
      tag: p.tag || "",
      languages: (p.languages || []).join(", "),
      link: p.link || "",
      image: p.image || "",
      clientProblem: p.clientProblem || "",
      solution: p.solution || "",
      result: p.result || "",
      features: (p.features || []).join("\n"),
      position: String(p.position),
      active: p.active,
    });
    setError("");
    setImageFile(null);
    setImagePreview(resolveImage(p.image));
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    let imageUrl = form.image || undefined;
    let uploadedUrl: string | undefined;
    if (imageFile) {
      const formData = new FormData();
      formData.append("image", imageFile);
      const uploadRes = await apiFetch(`${API}/portfolio/upload`, {
        method: "POST",
        body: formData,
      });
      if (uploadRes.ok) {
        const d = await uploadRes.json();
        imageUrl = d.url;
        uploadedUrl = d.url;
      } else {
        const d = await uploadRes.json().catch(() => ({}));
        setError(d.message || "Erreur upload");
        setSaving(false);
        return;
      }
    }
    const body = {
      slug: form.slug || undefined,
      name: form.name,
      description: form.description,
      tag: form.tag,
      languages: form.languages
        ? form.languages
            .split(",")
            .map((l) => l.trim())
            .filter(Boolean)
        : [],
      link: form.link || undefined,
      image: imageUrl,
      clientProblem: form.clientProblem || undefined,
      solution: form.solution || undefined,
      result: form.result || undefined,
      features: form.features
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      position: parseInt(form.position) || 0,
      active: form.active,
    };
    const url = editId ? `${API}/portfolio/${editId}` : `${API}/portfolio`;
    const res = await apiFetch(url, {
      method: editId ? "PUT" : "POST",
      body: JSON.stringify(body),
    });
    if (res.ok) {
      if (
        editId &&
        uploadedUrl &&
        isManagedBlobUrl(form.image) &&
        form.image !== uploadedUrl
      ) {
        await apiFetch(`${API}/portfolio/upload`, {
          method: "DELETE",
          body: JSON.stringify({ url: form.image }),
        });
      }
      await load();
      setShowForm(false);
    } else {
      if (uploadedUrl) {
        await apiFetch(`${API}/portfolio/upload`, {
          method: "DELETE",
          body: JSON.stringify({ url: uploadedUrl }),
        });
      }
      const d = await res.json().catch(() => ({}));
      setError(d.message || "Erreur");
    }
    setSaving(false);
  }

  async function deleteProject(project: PortfolioProject) {
    if (!confirm("Supprimer ce projet du portfolio ?")) return;
    const response = await apiFetch(`${API}/portfolio/${project.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.message || "Impossible de supprimer le projet");
      return;
    }
    if (isManagedBlobUrl(project.image)) {
      await apiFetch(`${API}/portfolio/upload`, {
        method: "DELETE",
        body: JSON.stringify({ url: project.image }),
      });
    }
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Portfolio"
        subtitle="Projets affichés sur votre site"
        count={projects.length}
        onAdd={openCreate}
        addLabel="Nouveau projet"
      />

      {projects.length === 0 ? (
        <Empty>Aucun projet dans le portfolio</Empty>
      ) : (
        <ListTable
          columns="minmax(250px, 1fr) 120px 100px minmax(220px, .9fr) 260px"
          minWidth={980}
          header={
            <>
              <span>Projet</span>
              <span>Catégorie</span>
              <span>Statut</span>
              <span>Technologies</span>
              <span style={{ textAlign: "right" }}>Actions</span>
            </>
          }
        >
          {[...projects]
            .sort((a, b) => a.position - b.position)
            .map((p) => (
              <ListRow
                key={p.id}
                onOpen={() => openEdit(p)}
                openLabel={`Modifier le projet ${p.name}`}
              >
                <div
                  style={{
                    display: "flex",
                    minWidth: 0,
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  {resolveImage(p.image) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolveImage(p.image)}
                      alt=""
                      style={{
                        width: 48,
                        height: 36,
                        flex: "0 0 auto",
                        borderRadius: 5,
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        width: 48,
                        height: 36,
                        flex: "0 0 auto",
                        border: "1px solid var(--border)",
                        borderRadius: 5,
                        background: "var(--black-3)",
                      }}
                    />
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        overflow: "hidden",
                        color: "var(--white)",
                        fontSize: 13,
                        fontWeight: 700,
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.name}
                    </div>
                    <div
                      style={{
                        marginTop: 2,
                        overflow: "hidden",
                        color: "var(--grey-3)",
                        fontSize: 10,
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.description || "Aucune description"}
                    </div>
                  </div>
                </div>
                <span>
                  {p.tag ? (
                    <Badge color={TAG_COLORS[p.tag] || "var(--blue)"}>
                      {p.tag}
                    </Badge>
                  ) : (
                    <span style={{ color: "var(--grey-3)", fontSize: 11 }}>
                      —
                    </span>
                  )}
                </span>
                <Badge color={p.active ? "var(--green)" : "#aaa"}>
                  {p.active ? "Actif" : "Masqué"}
                </Badge>
                <span
                  style={{
                    overflow: "hidden",
                    color: "var(--grey-2)",
                    fontSize: 11,
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.languages?.length ? p.languages.join(" · ") : "—"}
                </span>
                <ListActions>
                  <ActionButton variant="primary" onClick={() => openEdit(p)}>
                    Modifier
                  </ActionButton>
                  {p.link && (
                    <ActionLink
                      href={p.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Ouvrir ${p.name} dans un nouvel onglet`}
                    >
                      Voir le site ↗
                    </ActionLink>
                  )}
                  <ActionButton
                    variant="danger"
                    onClick={() => deleteProject(p)}
                  >
                    Supprimer
                  </ActionButton>
                </ListActions>
              </ListRow>
            ))}
        </ListTable>
      )}

      {showForm && (
        <Modal onClose={() => setShowForm(false)}>
          <h3
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "var(--white)",
              marginBottom: 20,
            }}
          >
            {editId ? "Modifier le projet" : "Nouveau projet portfolio"}
          </h3>
          {error && <ErrorMsg>{error}</ErrorMsg>}
          <form onSubmit={handleSubmit}>
            <Field label="Nom du projet *">
              <input
                required
                style={inputStyle}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Slug de l’étude de cas">
              <input
                style={inputStyle}
                value={form.slug}
                onChange={(e) =>
                  setForm({
                    ...form,
                    slug: e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, "-"),
                  })
                }
                placeholder="restaurant-signature"
              />
            </Field>
            <Field label="Description">
              <textarea
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </Field>
            <Field label="Problème client">
              <textarea
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
                value={form.clientProblem}
                onChange={(e) =>
                  setForm({ ...form, clientProblem: e.target.value })
                }
              />
            </Field>
            <Field label="Solution apportée">
              <textarea
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
                value={form.solution}
                onChange={(e) => setForm({ ...form, solution: e.target.value })}
              />
            </Field>
            <Field label="Résultat / bénéfice">
              <textarea
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
                value={form.result}
                onChange={(e) => setForm({ ...form, result: e.target.value })}
              />
            </Field>
            <Field label="Fonctionnalités (une par ligne)">
              <textarea
                rows={4}
                style={{ ...inputStyle, resize: "vertical" }}
                value={form.features}
                onChange={(e) => setForm({ ...form, features: e.target.value })}
              />
            </Field>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <Field label="Tag / Catégorie">
                <input
                  style={inputStyle}
                  value={form.tag}
                  onChange={(e) => setForm({ ...form, tag: e.target.value })}
                  placeholder="Vitrine, SaaS..."
                />
              </Field>
              <Field label="Technologies (virgule)">
                <input
                  style={inputStyle}
                  value={form.languages}
                  onChange={(e) =>
                    setForm({ ...form, languages: e.target.value })
                  }
                  placeholder="React, TypeScript..."
                />
              </Field>
            </div>
            <Field label="URL du projet">
              <input
                type="url"
                style={inputStyle}
                value={form.link}
                onChange={(e) => setForm({ ...form, link: e.target.value })}
                placeholder="https://..."
              />
            </Field>
            <Field label="Image (fichier)">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setImageFile(f);
                    setImagePreview(URL.createObjectURL(f));
                  }
                }}
                style={{ ...inputStyle, cursor: "pointer" }}
              />
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="aperçu"
                  style={{
                    marginTop: 8,
                    maxHeight: 120,
                    borderRadius: 6,
                    objectFit: "cover",
                  }}
                />
              )}
            </Field>
            <div style={{ display: "flex", gap: 12 }}>
              <Field label="Position">
                <input
                  type="number"
                  min={0}
                  style={inputStyle}
                  value={form.position}
                  onChange={(e) =>
                    setForm({ ...form, position: e.target.value })
                  }
                />
              </Field>
              <label
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  fontSize: 13,
                  color: "var(--grey-2)",
                  cursor: "pointer",
                  marginTop: 24,
                }}
              >
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm({ ...form, active: e.target.checked })
                  }
                />{" "}
                Visible sur le site
              </label>
            </div>
            <FormButtons
              saving={saving}
              onCancel={() => setShowForm(false)}
              submitLabel={editId ? "Enregistrer" : "Créer le projet"}
            />
          </form>
        </Modal>
      )}
    </div>
  );
}
