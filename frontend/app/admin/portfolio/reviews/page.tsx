"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { PageHeader, Badge, Empty, TabBar, Modal, Field, ErrorMsg, FormButtons, SmallBtn, inputStyle } from "@/app/admin/components/SharedUI";

const API = "/api";

interface Review {
  id: string;
  authorName: string;
  company?: string;
  rating: number;
  content: string;
  published: boolean;
  position: number;
  createdAt: string;
  client?: { company: string };
}

const STARS = ["★", "★★", "★★★", "★★★★", "★★★★★"];
const STAR_COLORS = ["#ff6b6b", "#ff9f43", "#ffd32a", "#5DD8A0", "#5DD8A0"];

const EMPTY_FORM = { authorName: "", company: "", rating: "5", content: "", published: false, position: "0" };

const TABS = [
  { key: "all", label: "Tous" },
  { key: "published", label: "Publiés" },
  { key: "pending", label: "En attente" },
];

export default function ReviewsPage() {
  const { apiFetch } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [tab, setTab] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await apiFetch(`${API}/portfolio/reviews`);
    if (res.ok) setReviews(await res.json());
  }, [apiFetch]);

  useEffect(() => { load(); }, [load]);

  const filtered = tab === "all" ? reviews : tab === "published" ? reviews.filter((r) => r.published) : reviews.filter((r) => !r.published);
  const tabsWithCounts = TABS.map((t) => ({ ...t, count: t.key === "all" ? reviews.length : t.key === "published" ? reviews.filter((r) => r.published).length : reviews.filter((r) => !r.published).length }));
  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "—";

  function openCreate() { setEditId(null); setForm(EMPTY_FORM); setError(""); setShowForm(true); }
  function openEdit(r: Review) {
    setEditId(r.id);
    setForm({ authorName: r.authorName, company: r.client?.company || r.company || "", rating: String(r.rating), content: r.content, published: r.published, position: String(r.position) });
    setError(""); setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    const body = { authorName: form.authorName, company: form.company || undefined, rating: parseInt(form.rating), content: form.content, published: form.published, position: parseInt(form.position) || 0 };
    const url = editId ? `${API}/portfolio/reviews/${editId}` : `${API}/portfolio/reviews`;
    const res = await apiFetch(url, { method: editId ? "PATCH" : "POST", body: JSON.stringify(body) });
    if (res.ok) { await load(); setShowForm(false); }
    else { const d = await res.json().catch(() => ({})); setError(d.message || "Erreur"); }
    setSaving(false);
  }

  async function togglePublish(r: Review) {
    await apiFetch(`${API}/portfolio/reviews/${r.id}`, { method: "PATCH", body: JSON.stringify({ published: !r.published }) });
    await load();
  }

  async function deleteReview(id: string) {
    if (!confirm("Supprimer cet avis ?")) return;
    await apiFetch(`${API}/portfolio/reviews/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <PageHeader title="Avis clients" subtitle={`Note moyenne : ${avgRating} / 5`} count={filtered.length} onAdd={openCreate} addLabel="Ajouter un avis" />

      <TabBar tabs={tabsWithCounts} activeTab={tab} onTabChange={setTab} />

      {filtered.length === 0 ? (
        <Empty>Aucun avis client</Empty>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {filtered.sort((a, b) => a.position - b.position).map((r) => (
            <div key={r.id} style={{ background: "var(--black-2)", border: "1px solid var(--border)", borderRadius: 10, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--white)" }}>{r.authorName}</div>
                  {(r.client?.company || r.company) && <div style={{ fontSize: 12, color: "var(--grey-3)" }}>{r.client?.company || r.company}</div>}
                </div>
                <Badge color={r.published ? "var(--green)" : "var(--gold)"}>{r.published ? "Publié" : "En attente"}</Badge>
              </div>
              <div style={{ fontSize: 18, color: STAR_COLORS[r.rating - 1], marginBottom: 10, letterSpacing: 2 }}>{STARS[r.rating - 1]}</div>
              <p style={{ fontSize: 13, color: "var(--grey-2)", lineHeight: 1.6, margin: "0 0 16px 0", fontStyle: "italic" }}>&ldquo;{r.content}&rdquo;</p>
              <div style={{ display: "flex", gap: 8 }}>
                <SmallBtn onClick={() => openEdit(r)}>Modifier</SmallBtn>
                <SmallBtn onClick={() => togglePublish(r)}>{r.published ? "Masquer" : "Publier"}</SmallBtn>
                <SmallBtn onClick={() => deleteReview(r.id)} danger>Supprimer</SmallBtn>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal onClose={() => setShowForm(false)}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--white)", marginBottom: 20 }}>{editId ? "Modifier l'avis" : "Ajouter un avis"}</h3>
          {error && <ErrorMsg>{error}</ErrorMsg>}
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Nom de l'auteur *"><input required style={inputStyle} value={form.authorName} onChange={(e) => setForm({ ...form, authorName: e.target.value })} /></Field>
              <Field label="Entreprise"><input style={inputStyle} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></Field>
            </div>
            <Field label="Note *">
              <div style={{ display: "flex", gap: 8 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setForm({ ...form, rating: String(n) })} style={{ width: 36, height: 36, borderRadius: 6, border: `2px solid ${parseInt(form.rating) === n ? "var(--gold)" : "var(--border)"}`, background: parseInt(form.rating) === n ? "rgba(240,192,64,.15)" : "var(--black-3)", color: parseInt(form.rating) >= n ? "var(--gold)" : "var(--grey-3)", fontSize: 18, cursor: "pointer" }}>★</button>
                ))}
                <span style={{ fontSize: 13, color: "var(--grey-2)", alignSelf: "center" }}>{form.rating}/5</span>
              </div>
            </Field>
            <Field label="Contenu de l'avis *">
              <textarea required rows={4} style={{ ...inputStyle, resize: "vertical" }} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Témoignage du client..." />
            </Field>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "var(--grey-2)", cursor: "pointer", marginBottom: 20 }}>
              <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} /> Publier immédiatement sur le site
            </label>
            <FormButtons saving={saving} onCancel={() => setShowForm(false)} submitLabel={editId ? "Enregistrer" : "Ajouter l'avis"} />
          </form>
        </Modal>
      )}
    </div>
  );
}
