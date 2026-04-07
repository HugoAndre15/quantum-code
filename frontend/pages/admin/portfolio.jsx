import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import AdminLayout from "../../components/AdminLayout";
import {
  inputStyle,
  Field,
  SmallBtn,
  Empty,
  Modal,
  ErrorMsg,
  FormButtons,
  PageHeader,
} from "../../components/admin/SharedUI";

const API = "/api";

function resolveImage(src) {
  if (!src) return "";
  if (src.startsWith("/uploads")) return `/api${src}`;
  return src;
}

const EMPTY = {
  name: "",
  description: "",
  tag: "",
  languages: "",
  link: "",
  image: "",
  position: "0",
  active: true,
};

export default function PortfolioPage() {
  const { user, apiFetch } = useAuth();
  const [projects, setProjects] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const fetchProjects = useCallback(async () => {
    const res = await apiFetch(`${API}/portfolio`);
    if (res.ok) setProjects(await res.json());
  }, [apiFetch]);

  useEffect(() => {
    if (user) fetchProjects();
  }, [user, fetchProjects]);

  function openCreate() {
    setEditId(null);
    setForm(EMPTY);
    setError("");
    setImageFile(null);
    setImagePreview("");
    setShowForm(true);
  }

  function openEdit(p) {
    setEditId(p.id);
    setForm({
      name: p.name || "",
      description: p.description || "",
      tag: p.tag || "",
      languages: (p.languages || []).join(", "),
      link: p.link || "",
      image: p.image || "",
      position: p.position != null ? String(p.position) : "0",
      active: p.active !== false,
    });
    setError("");
    setImageFile(null);
    setImagePreview(p.image || "");
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    let imageUrl = form.image || undefined;

    // Upload image file if selected
    if (imageFile) {
      try {
        const formData = new FormData();
        formData.append("image", imageFile);
        const uploadRes = await apiFetch(`${API}/portfolio/upload`, {
          method: "POST",
          body: formData,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          imageUrl = uploadData.url;
        } else {
          const errData = await uploadRes.json().catch(() => ({}));
          setError(errData.message || "Erreur lors de l'upload de l'image");
          setSaving(false);
          return;
        }
      } catch {
        setError("Erreur lors de l'upload de l'image");
        setSaving(false);
        return;
      }
    }

    const body = {
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
      position: parseInt(form.position) || 0,
      active: form.active,
    };

    const url = editId ? `${API}/portfolio/${editId}` : `${API}/portfolio`;
    const method = editId ? "PUT" : "POST";

    const res = await apiFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setShowForm(false);
      fetchProjects();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.message || "Erreur");
    }
    setSaving(false);
  }

  async function deleteProject(id) {
    if (!confirm("Supprimer ce projet ?")) return;
    await apiFetch(`${API}/portfolio/${id}`, { method: "DELETE" });
    fetchProjects();
  }

  // inputStyle imported from SharedUI

  const TAG_COLORS = {
    "Application web": "#2D6FFF",
    Vitrine: "#5DD8A0",
    "E-commerce": "#F0C040",
    SaaS: "#FF6B6B",
    Booking: "#A78BFA",
  };

  return (
    <AdminLayout title="Portfolio">
      {/* Header */}
      <PageHeader
        title="Projets"
        count={projects.length}
        subtitle="Gérez les projets affichés dans votre portfolio."
        onAdd={openCreate}
        addLabel="Nouveau projet"
      />

      {/* ─── Modal formulaire ─────────────── */}
      {showForm && (
        <Modal onClose={() => setShowForm(false)} maxWidth={520}>
          <form onSubmit={handleSubmit}>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--white)",
                margin: "0 0 20px",
              }}
            >
              {editId ? "Modifier le projet" : "Nouveau projet"}
            </h3>

            {error && <ErrorMsg>{error}</ErrorMsg>}

            {/* Nom */}
            <Field label="Nom du projet *">
              <input
                required
                style={inputStyle}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Mon Calcul Impôt"
              />
            </Field>

            {/* Description */}
            <Field label="Description courte *">
              <textarea
                required
                rows={2}
                style={{ ...inputStyle, resize: "vertical" }}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Simulateur d'impôt en ligne..."
              />
            </Field>

            {/* Tag + Langages */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
                marginTop: 14,
              }}
            >
              <div>
                <Field label="Tag *">
                  <input
                    required
                    style={inputStyle}
                    value={form.tag}
                    onChange={(e) => setForm({ ...form, tag: e.target.value })}
                    placeholder="Vitrine, SaaS, E-commerce..."
                  />
                </Field>
              </div>
              <div>
                <Field label="Langages / Techs (virgule)">
                  <input
                    style={inputStyle}
                    value={form.languages}
                    onChange={(e) =>
                      setForm({ ...form, languages: e.target.value })
                    }
                    placeholder="Next.js, React, Prisma"
                  />
                </Field>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <Field label="Lien">
                <input
                  style={inputStyle}
                  value={form.link}
                  onChange={(e) => setForm({ ...form, link: e.target.value })}
                  placeholder="https://..."
                />
              </Field>
            </div>

            <div style={{ marginTop: 14 }}>
              <Field label="Image">
              <div
                style={{
                  border: "2px dashed var(--border-2)",
                  borderRadius: 8,
                  padding: 16,
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "border-color .15s",
                  position: "relative",
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = "var(--blue)";
                }}
                onDragLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-2)";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = "var(--border-2)";
                  const file = e.dataTransfer.files[0];
                  if (file && file.type.startsWith("image/")) {
                    setImageFile(file);
                    setImagePreview(URL.createObjectURL(file));
                    setForm({ ...form, image: "" });
                  }
                }}
                onClick={() => document.getElementById("portfolio-image-input")?.click()}
              >
                <input
                  id="portfolio-image-input"
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setImageFile(file);
                      setImagePreview(URL.createObjectURL(file));
                      setForm({ ...form, image: "" });
                    }
                  }}
                />

                {(imagePreview || form.image) ? (
                  <div style={{ position: "relative", display: "inline-block" }}>
                    <img
                      src={
                        imageFile
                          ? imagePreview
                          : resolveImage(form.image || imagePreview)
                      }
                      alt="Aperçu"
                      style={{
                        maxWidth: "100%",
                        maxHeight: 150,
                        borderRadius: 6,
                        objectFit: "cover",
                      }}
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                    <div style={{ marginTop: 8, fontSize: 11, color: "var(--grey-3)" }}>
                      {imageFile ? imageFile.name : "Image actuelle"}
                      {" — "}
                      <span
                        style={{ color: "var(--blue)", cursor: "pointer" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setImageFile(null);
                          setImagePreview("");
                          setForm({ ...form, image: "" });
                        }}
                      >
                        Supprimer
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 28, opacity: 0.3, marginBottom: 6 }}>📷</div>
                    <div style={{ fontSize: 12, color: "var(--grey-3)" }}>
                      Cliquez ou glissez une image ici
                    </div>
                    <div style={{ fontSize: 10, color: "var(--grey-3)", marginTop: 4, opacity: 0.6 }}>
                      JPG, PNG, GIF, WebP, SVG — Max 5 Mo
                    </div>
                  </div>
                )}
              </div>
              </Field>
            </div>

            {/* Position + Actif */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
                marginTop: 14,
              }}
            >
              <div>
                <Field label="Position">
                  <input
                    type="number"
                    style={inputStyle}
                    value={form.position}
                    onChange={(e) =>
                      setForm({ ...form, position: e.target.value })
                    }
                  />
                </Field>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  paddingTop: 22,
                }}
              >
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm({ ...form, active: e.target.checked })
                  }
                  style={{ accentColor: "var(--blue)" }}
                />
                <span style={{ fontSize: 13, color: "var(--white)" }}>
                  Actif (visible)
                </span>
              </div>
            </div>

            {/* Buttons */}
            <FormButtons
              saving={saving}
              onCancel={() => setShowForm(false)}
              submitLabel={editId ? "Modifier" : "Créer"}
            />
          </form>
        </Modal>
      )}

      {/* ─── Liste des projets ────────────── */}
      {projects.length === 0 && !showForm && (
        <Empty>
          Aucun projet dans le portfolio.
          <br />
          <button
            onClick={openCreate}
            style={{
              marginTop: 12,
              fontSize: 12,
              color: "var(--blue)",
              background: "none",
              border: "none",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Ajouter un premier projet
          </button>
        </Empty>
      )}

      <div style={{ display: "grid", gap: 14 }}>
        {projects.map((p) => {
          const tagColor = TAG_COLORS[p.tag] || "var(--blue)";
          return (
            <div
              key={p.id}
              style={{
                background: "var(--black-2)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: 20,
                display: "flex",
                gap: 16,
                alignItems: "flex-start",
              }}
            >
              {/* Thumbnail */}
              {p.image && (
                <div
                  style={{
                    width: 80,
                    height: 56,
                    borderRadius: 6,
                    overflow: "hidden",
                    flexShrink: 0,
                    background: "var(--black-3)",
                  }}
                >
                  <img
                    src={resolveImage(p.image)}
                    alt={p.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                </div>
              )}

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: "var(--white)",
                    }}
                  >
                    {p.name}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      padding: "2px 8px",
                      borderRadius: 99,
                      background: `${tagColor}22`,
                      color: tagColor,
                      fontWeight: 600,
                    }}
                  >
                    {p.tag}
                  </span>
                  {!p.active && (
                    <span
                      style={{
                        fontSize: 10,
                        padding: "2px 8px",
                        borderRadius: 99,
                        background: "rgba(255,80,80,.15)",
                        color: "#ff6b6b",
                      }}
                    >
                      Masqué
                    </span>
                  )}
                </div>

                <p
                  style={{
                    fontSize: 12,
                    color: "var(--grey-3)",
                    margin: "4px 0 8px",
                    lineHeight: 1.4,
                  }}
                >
                  {p.description}
                </p>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    flexWrap: "wrap",
                  }}
                >
                  {(p.languages || []).map((lang) => (
                    <span
                      key={lang}
                      style={{
                        fontSize: 10,
                        padding: "2px 8px",
                        borderRadius: 4,
                        background: "var(--black-3)",
                        color: "var(--grey-2)",
                        fontWeight: 500,
                      }}
                    >
                      {lang}
                    </span>
                  ))}
                  {p.link && (
                    <a
                      href={p.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 10,
                        color: "var(--blue)",
                        textDecoration: "none",
                        marginLeft: 4,
                      }}
                    >
                      ↗ {p.link.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </a>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <SmallBtn color="var(--blue)" onClick={() => openEdit(p)} title="Modifier">
                  ✎ Modifier
                </SmallBtn>
                <SmallBtn color="#ff6b6b" onClick={() => deleteProject(p.id)} title="Supprimer">
                  🗑
                </SmallBtn>
              </div>
            </div>
          );
        })}
      </div>
    </AdminLayout>
  );
}

// labelStyle replaced by shared Field component
