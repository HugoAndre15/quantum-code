import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import AdminLayout from "../../components/AdminLayout";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

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
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

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
      image: form.image || undefined,
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

  const inputStyle = {
    width: "100%",
    padding: "8px 12px",
    fontSize: 13,
    background: "var(--black-3)",
    border: "1px solid var(--border-2)",
    borderRadius: "var(--r)",
    color: "var(--white)",
    outline: "none",
  };

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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--white)",
              margin: 0,
            }}
          >
            Projets ({projects.length})
          </h2>
          <p
            style={{ fontSize: 12, color: "var(--grey-3)", margin: "4px 0 0" }}
          >
            Gérez les projets affichés dans votre portfolio.
          </p>
        </div>
        <button
          onClick={openCreate}
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#fff",
            background: "var(--blue)",
            border: "none",
            borderRadius: "var(--r)",
            padding: "8px 18px",
            cursor: "pointer",
          }}
        >
          + Nouveau projet
        </button>
      </div>

      {/* ─── Modal formulaire ─────────────── */}
      {showForm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
        >
          <form
            onSubmit={handleSubmit}
            style={{
              background: "var(--black-2)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: 28,
              width: 520,
              maxHeight: "85vh",
              overflowY: "auto",
            }}
          >
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

            {error && (
              <div
                style={{
                  fontSize: 12,
                  color: "#ff6b6b",
                  background: "rgba(255,80,80,.1)",
                  padding: "8px 12px",
                  borderRadius: 6,
                  marginBottom: 16,
                }}
              >
                {error}
              </div>
            )}

            {/* Nom */}
            <label style={labelStyle}>Nom du projet *</label>
            <input
              required
              style={inputStyle}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Mon Calcul Impôt"
            />

            {/* Description */}
            <label style={{ ...labelStyle, marginTop: 14 }}>
              Description courte *
            </label>
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
                <label style={labelStyle}>Tag *</label>
                <input
                  required
                  style={inputStyle}
                  value={form.tag}
                  onChange={(e) => setForm({ ...form, tag: e.target.value })}
                  placeholder="Vitrine, SaaS, E-commerce..."
                />
              </div>
              <div>
                <label style={labelStyle}>
                  Langages / Techs{" "}
                  <span style={{ fontWeight: 400, color: "var(--grey-3)" }}>
                    (virgule)
                  </span>
                </label>
                <input
                  style={inputStyle}
                  value={form.languages}
                  onChange={(e) =>
                    setForm({ ...form, languages: e.target.value })
                  }
                  placeholder="Next.js, React, Prisma"
                />
              </div>
            </div>

            {/* Lien + Image */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
                marginTop: 14,
              }}
            >
              <div>
                <label style={labelStyle}>Lien</label>
                <input
                  style={inputStyle}
                  value={form.link}
                  onChange={(e) => setForm({ ...form, link: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label style={labelStyle}>
                  Image{" "}
                  <span style={{ fontWeight: 400, color: "var(--grey-3)" }}>
                    (URL ou chemin)
                  </span>
                </label>
                <input
                  style={inputStyle}
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                  placeholder="/images/projet.jpg"
                />
              </div>
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
                <label style={labelStyle}>Position</label>
                <input
                  type="number"
                  style={inputStyle}
                  value={form.position}
                  onChange={(e) =>
                    setForm({ ...form, position: e.target.value })
                  }
                />
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
            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
                marginTop: 24,
              }}
            >
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{
                  fontSize: 12,
                  padding: "8px 18px",
                  borderRadius: "var(--r)",
                  border: "1px solid var(--border-2)",
                  background: "transparent",
                  color: "var(--grey-3)",
                  cursor: "pointer",
                }}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "8px 24px",
                  borderRadius: "var(--r)",
                  border: "none",
                  background: "var(--blue)",
                  color: "#fff",
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "..." : editId ? "Modifier" : "Créer"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── Liste des projets ────────────── */}
      {projects.length === 0 && !showForm && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "var(--grey-3)",
            fontSize: 13,
          }}
        >
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
        </div>
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
                    src={p.image}
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
                <button
                  onClick={() => openEdit(p)}
                  style={{
                    fontSize: 11,
                    padding: "5px 12px",
                    borderRadius: "var(--r)",
                    border: "1px solid var(--border-2)",
                    background: "transparent",
                    color: "var(--grey-2)",
                    cursor: "pointer",
                  }}
                >
                  ✏️
                </button>
                <button
                  onClick={() => deleteProject(p.id)}
                  style={{
                    fontSize: 11,
                    padding: "5px 12px",
                    borderRadius: "var(--r)",
                    border: "1px solid rgba(255,80,80,.2)",
                    background: "transparent",
                    color: "#ff6b6b",
                    cursor: "pointer",
                  }}
                >
                  🗑
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </AdminLayout>
  );
}

const labelStyle = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--grey-2)",
  marginBottom: 4,
};
