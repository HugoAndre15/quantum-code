"use client";
import { useState, useEffect } from "react";
import { gradients } from "../data/siteData";

const API = "/api";

// Grille featured : disposition [large, petite, petite, large]
const FEATURED_LAYOUT = [
  { w: "w8", h: "h1" },
  { w: "w4", h: "h1" },
  { w: "w4", h: "h2" },
  { w: "w8", h: "h2" },
];

export default function Portfolio() {
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    fetch(`${API}/portfolio/public`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setProjects)
      .catch(() => {});
  }, []);

  const featured = projects.slice(0, 4);
  const all = projects;

  return (
    <>
      <section className="section portfolio-section" id="portfolio">
        <div className="section-inner">
          <div className="portfolio-header">
            <div>
              <div className="s-label">Portfolio</div>
              <h2 className="s-title">
                Des sites qui <span className="serif-word">performent.</span>
              </h2>
              <p className="s-sub" style={{ marginTop: 8 }}>
                Chaque projet est conçu pour convertir — pas juste pour être
                beau.
              </p>
            </div>
            <button
              onClick={() => setOverlayOpen(true)}
              className="btn btn-ghost"
            >
              Voir tous mes projets <span className="arr">→</span>
            </button>
          </div>

          <div className="portfolio-grid">
            {featured.map((p, i) => {
              const layout = FEATURED_LAYOUT[i % FEATURED_LAYOUT.length];
              return (
                <div key={p.id || i} className={`proj ${layout.w} ${layout.h}`}>
                  {p.image ? (
                    <div className="proj-img">
                      <img src={p.image} alt={p.name} />
                    </div>
                  ) : (
                    <div
                      className="proj-img"
                      style={{ background: gradients[i % gradients.length] }}
                    />
                  )}
                  <div className="proj-overlay">
                    <div className="proj-tag">{p.tag}</div>
                    <div className="proj-name">{p.name}</div>
                    <div className="proj-desc">{p.description}</div>
                    <div className="proj-stack">
                      {(p.languages || []).map((t) => (
                        <span key={t} className="proj-tech">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  {p.link && (
                    <a
                      href={p.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="proj-link"
                    >
                      ↗
                    </a>
                  )}
                  {!p.link && <div className="proj-link">↗</div>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Full projects overlay */}
      <div className={`projects-page${overlayOpen ? " open" : ""}`}>
        <div className="pp-header">
          <div className="pp-back" onClick={() => setOverlayOpen(false)}>
            ← Retour
          </div>
          <div className="pp-title">Tous mes projets</div>
          <div style={{ width: 80 }} />
        </div>
        <div className="pp-body">
          <div className="pp-grid">
            {all.map((p, i) => {
              const inner = (
                <div
                  key={p.id || i}
                  className={`pp-card${p.link ? " pp-card-link" : ""}`}
                >
                  {p.image ? (
                    <div className="pp-card-img">
                      <img src={p.image} alt={p.name} />
                    </div>
                  ) : (
                    <div
                      className="pp-card-img"
                      style={{ background: gradients[i % gradients.length] }}
                    />
                  )}
                  <div className="pp-card-body">
                    <div className="pp-card-tag">{p.tag}</div>
                    <div className="pp-card-name">
                      {p.name}
                      {p.link && <span className="pp-card-arrow">↗</span>}
                    </div>
                    <div className="pp-card-desc">{p.description}</div>
                    <div className="pp-card-stack">
                      {(p.languages || []).map((t) => (
                        <span key={t} className="pp-card-tech">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
              if (p.link) {
                return (
                  <a
                    key={p.id || i}
                    href={p.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    {inner}
                  </a>
                );
              }
              return inner;
            })}
          </div>
        </div>
      </div>
    </>
  );
}
