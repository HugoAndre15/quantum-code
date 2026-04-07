import { useState, useEffect } from "react";
import { steps } from "../data/siteData";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export default function Tarifs({ onToast }) {
  const [packs, setPacks] = useState([]);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOffers() {
      try {
        const [packsRes, optsRes] = await Promise.all([
          fetch(`${API}/offers/packs/public`),
          fetch(`${API}/offers/options/public`),
        ]);
        if (packsRes.ok) setPacks(await packsRes.json());
        if (optsRes.ok) {
          const allOpts = await optsRes.json();
          setOptions(allOpts.filter((o) => !o.recurring));
        }
      } catch {
        // fallback vide
      } finally {
        setLoading(false);
      }
    }
    fetchOffers();
  }, []);
  const scrollToContact = () => {
    onToast?.("On vous répond sous 24h !");
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="section tarifs-section" id="tarifs">
      <div className="section-inner">
        {/* Header */}
        <div className="tarifs-header">
          <div className="s-label gold">Offres</div>
          <h2 className="s-title">
            Des packs clairs et <span className="serif-word">rassurants.</span>
          </h2>
          <p className="s-sub">
            Une base simple, des packs lisibles, et des options à ajouter
            seulement si elles vous sont utiles.
          </p>
        </div>

        {/* Packs */}
        <div className="packs-layout">
          {packs.map((p, i) => {
            const isPopular = packs.length >= 2 && i === Math.floor(packs.length / 2);
            return (
              <div key={p.id || i} className={`pack-card${isPopular ? " popular" : ""}`}>
                {isPopular && (
                  <div className="pack-popular-badge">Le plus choisi</div>
                )}
                <div className="pack-label">PACK</div>
                <div className="pack-name">{p.name}</div>
                <div className="pack-price">
                  <span className="pack-price-num">{p.price}€</span>
                </div>
                <ul className="pack-features">
                  {(p.features || []).map((f, fi) => (
                    <li key={fi} className="pack-feature">
                      <span className="pack-dot" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button className="btn btn-blue" onClick={scrollToContact}>
                  Choisir ce pack
                </button>
              </div>
            );
          })}
        </div>

        {/* Options + Comment ça marche */}
        <div className="offres-bottom">
          <div className="options-block">
            <div className="s-label">Options</div>
            <h3 className="options-title">
              Ajoutez seulement ce dont vous avez besoin
            </h3>
            <p className="options-desc">
              L&apos;idée est simple&nbsp;: garder un prix accessible, puis
              ajouter les fonctionnalités utiles selon votre activité.
            </p>
            <div className="options-grid">
              {options.map((o, i) => (
                <div key={o.id || i} className="option-card">
                  <div className="option-label">{o.name || o.label}</div>
                  <div className="option-price">{o.price}€</div>
                </div>
              ))}
            </div>
          </div>

          <div className="steps-block">
            <div className="s-label">Comment ça marche</div>
            <div className="steps-list">
              {steps.map((s, i) => (
                <div key={i} className="step-item">
                  <div className="step-num">{s.num}</div>
                  <div className="step-content">
                    <div className="step-title">{s.title}</div>
                    <p className="step-desc">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="tarifs-footnote">
          Hébergement à partir de 10 €/mois · Maintenance 20 €/mois · Frais de
          domaine 5–20 € · TVA non applicable — art. 293B CGI
        </p>
      </div>
    </section>
  );
}
