"use client";
import { useState } from "react";
import { contactInfo, siteConfig } from "../data/siteData";

const API = "/api";

export default function Contact({ onToast }) {
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    message: "",
  });

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch(`${API}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        onToast?.("Message envoyé — réponse sous 24h !");
        setForm({ name: "", email: "", phone: "", company: "", message: "" });
      } else {
        const err = await res.json().catch(() => ({}));
        onToast?.(err.message || "Erreur lors de l'envoi, réessayez.");
      }
    } catch {
      onToast?.("Erreur réseau, veuillez réessayer.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="section contact-section" id="contact">
      <div className="section-inner">
        <div className="contact-grid">
          <div>
            <div className="s-label">Contact</div>
            <h2 className="s-title">
              Votre projet
              <br />
              <span className="serif-word">commence ici.</span>
            </h2>
            <p className="s-sub" style={{ marginTop: 12 }}>
              Premier échange gratuit et sans engagement. Je reviens vers vous
              sous 24h avec une analyse et une estimation.
            </p>

            <div className="contact-info-items">
              {contactInfo.map((c, i) => (
                <div key={i} className="contact-info-item">
                  <div className="contact-info-ico">{c.ico}</div>
                  <div>
                    <div className="contact-info-lbl">{c.label}</div>
                    <div className="contact-info-val">{c.value}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="contact-avail">
              <div className="avail-dot" />
              Disponible pour de nouveaux projets
            </div>
          </div>

          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Nom / Prénom *</label>
                <input
                  className="form-input"
                  type="text"
                  name="name"
                  placeholder="Marie Dupont"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input
                  className="form-input"
                  type="email"
                  name="email"
                  placeholder="marie@exemple.fr"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Téléphone</label>
                <input
                  className="form-input"
                  type="tel"
                  name="phone"
                  placeholder="+33 6 00 00 00 00"
                  value={form.phone}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Société</label>
                <input
                  className="form-input"
                  type="text"
                  name="company"
                  placeholder="Nom de votre entreprise"
                  value={form.company}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Message *</label>
              <textarea
                className="form-textarea"
                name="message"
                placeholder="Décrivez votre projet, vos objectifs, votre délai idéal…"
                value={form.message}
                onChange={handleChange}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-blue"
              style={{
                alignSelf: "flex-start",
                padding: "14px 32px",
                fontSize: 14,
              }}
              disabled={sending}
            >
              {sending ? "Envoi en cours…" : "Envoyer — c'est gratuit →"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
