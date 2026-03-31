"use client";
import { useState } from "react";
import {
  contactInfo,
  projectTypes,
  budgetRanges,
  siteConfig,
} from "../data/siteData";

export default function Contact({ onToast }) {
  const [sending, setSending] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      onToast?.("Message envoyé — réponse sous 24h !");
      setSending(false);
      e.target.reset();
    }, 400);
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
                <label className="form-label">Prénom &amp; Nom</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Marie Dupont"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="marie@exemple.fr"
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Type de projet</label>
              <select className="form-select form-input" defaultValue="">
                <option value="" disabled>
                  Sélectionner...
                </option>
                {projectTypes.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Budget estimé</label>
              <select className="form-select form-input" defaultValue="">
                <option value="" disabled>
                  Sélectionner...
                </option>
                {budgetRanges.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Décrivez votre projet</label>
              <textarea
                className="form-textarea"
                placeholder="Votre activité, vos objectifs, votre délai idéal…"
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
              Envoyer — c&apos;est gratuit →
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
