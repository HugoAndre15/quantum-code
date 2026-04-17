import { useState, useEffect } from "react";

const API = "/api";

export default function PriceSimulator() {
  const [base, setBase] = useState(null);
  const [packs, setPacks] = useState([]);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Wizard state
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState(""); // "pack" | "custom"
  const [selectedPackId, setSelectedPackId] = useState("");
  const [selectedOptionIds, setSelectedOptionIds] = useState([]);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API}/offers/pricing/public`);
        if (res.ok) {
          const data = await res.json();
          setBase(data.base);
          setPacks(data.packs || []);
          setOptions((data.options || []).filter((o) => !o.recurring));
        }
      } catch {
        // API unreachable
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const selectedPack = packs.find((p) => p.id === selectedPackId);

  const includedOptionIds = selectedPack
    ? (selectedPack.includedOptions || []).map(
        (io) => io.serviceOption?.id || io.serviceOptionId
      )
    : [];

  const extraOptionIds = selectedOptionIds.filter(
    (id) => !includedOptionIds.includes(id)
  );

  const computeTotal = () => {
    if (!base) return 0;
    let total = 0;

    if (mode === "pack" && selectedPack) {
      total += selectedPack.price;
      const extraPages = Math.max(0, pages - (selectedPack.includedPages || 0));
      total += extraPages * (base.pagePrice || 0);
    } else {
      total += base.basePrice || 0;
      const extraPages = Math.max(0, pages - (base.basePages || 1));
      total += extraPages * (base.pagePrice || 0);
    }

    const extraOpts = options.filter((o) => extraOptionIds.includes(o.id));
    for (const opt of extraOpts) {
      total += opt.price;
    }

    return total;
  };

  const toggleOption = (id) => {
    setSelectedOptionIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const reset = () => {
    setStep(0);
    setMode("");
    setSelectedPackId("");
    setSelectedOptionIds([]);
    setPages(base?.basePages || 1);
  };

  const scrollToContact = () => {
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
  };

  const STEPS = [
    { label: "Formule", num: "1" },
    { label: "Choix", num: "2" },
    { label: "Pages & Options", num: "3" },
    { label: "Estimation", num: "4" },
  ];

  const canNext = () => {
    if (step === 0) return !!mode;
    if (step === 1) return mode === "custom" || !!selectedPackId;
    return true;
  };

  if (loading || !base) return null;

  return (
    <section className="section simulator-section" id="simulateur">
      <div className="section-inner">
        <div className="simulator-header">
          <div className="s-label gold">Simulateur</div>
          <h2 className="s-title">
            Estimez le prix de votre{" "}
            <span className="serif-word">site web.</span>
          </h2>
          <p className="s-sub">
            En quelques étapes, obtenez une estimation du budget pour votre
            projet. Ce simulateur est indicatif — contactez-nous pour un devis
            personnalisé.
          </p>
        </div>

        <div className="simulator-card">
          {/* Progress bar */}
          <div className="sim-progress">
            {STEPS.map((s, i) => (
              <div
                key={i}
                className={`sim-step-indicator${i <= step ? " active" : ""}${i < step ? " done" : ""}`}
              >
                <div className="sim-step-dot">
                  {i < step ? "✓" : s.num}
                </div>
                <span className="sim-step-label">{s.label}</span>
                {i < STEPS.length - 1 && (
                  <div className={`sim-step-line${i < step ? " active" : ""}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step 0: Choose mode */}
          {step === 0 && (
            <div className="sim-step-content">
              <h3 className="sim-step-title">Comment souhaitez-vous composer votre site ?</h3>
              <p className="sim-step-desc">
                Choisissez un pack clé en main ou composez votre site sur mesure.
              </p>
              <div className="sim-mode-grid">
                <div
                  className={`sim-mode-card${mode === "pack" ? " selected" : ""}`}
                  onClick={() => setMode("pack")}
                >
                  <div className="sim-mode-icon">📦</div>
                  <div className="sim-mode-name">Pack</div>
                  <div className="sim-mode-desc">
                    Une formule clé en main avec options et pages incluses, modulable selon vos besoins.
                  </div>
                </div>
                <div
                  className={`sim-mode-card${mode === "custom" ? " selected" : ""}`}
                  onClick={() => {
                    setMode("custom");
                    setSelectedPackId("");
                    setPages(base.basePages || 1);
                  }}
                >
                  <div className="sim-mode-icon">🎨</div>
                  <div className="sim-mode-name">Sur mesure</div>
                  <div className="sim-mode-desc">
                    Partez de la base à {base.basePrice}€ et ajoutez uniquement ce dont vous avez besoin.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Choose pack or confirm custom */}
          {step === 1 && mode === "pack" && (
            <div className="sim-step-content">
              <h3 className="sim-step-title">Choisissez votre pack</h3>
              <p className="sim-step-desc">
                Chaque pack inclut la base, un nombre de pages et des options. Vous pourrez ajouter des options supplémentaires ensuite.
              </p>
              <div className="sim-packs-grid">
                {packs.map((p) => {
                  const isSelected = selectedPackId === p.id;
                  const includedOpts = (p.includedOptions || []).map(
                    (io) => io.serviceOption
                  ).filter(Boolean);
                  return (
                    <div
                      key={p.id}
                      className={`sim-pack-card${isSelected ? " selected" : ""}`}
                      onClick={() => {
                        setSelectedPackId(isSelected ? "" : p.id);
                        setPages(p.includedPages || 1);
                      }}
                    >
                      {isSelected && <div className="sim-check">✓</div>}
                      <div className="sim-pack-name">{p.name}</div>
                      <div className="sim-pack-price">{p.price}€</div>
                      {p.description && (
                        <div className="sim-pack-desc">{p.description}</div>
                      )}
                      <div className="sim-pack-includes">
                        <span className="sim-pack-pages">📄 {p.includedPages || 0} page{(p.includedPages || 0) > 1 ? "s" : ""}</span>
                        {includedOpts.length > 0 && (
                          <div className="sim-pack-opts">
                            {includedOpts.map((o) => (
                              <span key={o.id} className="sim-included-tag">
                                ✓ {o.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 1 && mode === "custom" && (
            <div className="sim-step-content">
              <h3 className="sim-step-title">Votre base sur mesure</h3>
              <p className="sim-step-desc">
                Vous partez de la base «&nbsp;{base.name}&nbsp;» à {base.basePrice}€,
                avec {base.basePages} page{base.basePages > 1 ? "s" : ""} incluse{base.basePages > 1 ? "s" : ""}.
                Ajoutez ensuite des pages et options selon vos besoins.
              </p>
              <div className="sim-base-summary">
                <div className="sim-base-name">{base.name}</div>
                <div className="sim-base-price">{base.basePrice}€</div>
                <div className="sim-base-detail">
                  {base.basePages} page{base.basePages > 1 ? "s" : ""} incluse{base.basePages > 1 ? "s" : ""} · {base.pagePrice}€/page supplémentaire
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Pages & Options */}
          {step === 2 && (
            <div className="sim-step-content">
              <h3 className="sim-step-title">Pages & Options</h3>
              <p className="sim-step-desc">
                Ajustez le nombre de pages et sélectionnez les fonctionnalités souhaitées.
              </p>

              {/* Pages selector */}
              <div className="sim-pages-block">
                <div className="sim-pages-label">Nombre de pages</div>
                <div className="sim-pages-control">
                  <button
                    className="sim-pages-btn"
                    onClick={() => setPages(Math.max(1, pages - 1))}
                  >
                    −
                  </button>
                  <span className="sim-pages-count">{pages}</span>
                  <button
                    className="sim-pages-btn"
                    onClick={() => setPages(pages + 1)}
                  >
                    +
                  </button>
                </div>
                {(() => {
                  const included = mode === "pack" && selectedPack
                    ? selectedPack.includedPages || 0
                    : base.basePages || 1;
                  const extra = Math.max(0, pages - included);
                  return (
                    <div className="sim-pages-info">
                      {included} incluse{included > 1 ? "s" : ""}
                      {extra > 0 && (
                        <span className="sim-pages-extra">
                          {" "}· +{extra} × {base.pagePrice}€ = +{extra * base.pagePrice}€
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Options */}
              <div className="sim-options-block">
                <div className="sim-options-label">Options disponibles</div>
                <div className="sim-options-grid">
                  {options.map((opt) => {
                    const isIncluded = includedOptionIds.includes(opt.id);
                    const isSelected = selectedOptionIds.includes(opt.id);
                    return (
                      <div
                        key={opt.id}
                        className={`sim-option-card${isIncluded ? " included" : isSelected ? " selected" : ""}`}
                        onClick={() => !isIncluded && toggleOption(opt.id)}
                      >
                        <div className="sim-option-top">
                          <span className="sim-option-name">{opt.name}</span>
                          <span className={`sim-option-price${isIncluded ? " included" : ""}`}>
                            {isIncluded ? "Inclus" : `${opt.price}€`}
                          </span>
                        </div>
                        {opt.description && (
                          <div className="sim-option-desc">{opt.description}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Estimation */}
          {step === 3 && (
            <div className="sim-step-content">
              <h3 className="sim-step-title">Votre estimation</h3>
              <p className="sim-step-desc">
                Voici un récapitulatif indicatif de votre projet.
              </p>

              <div className="sim-recap">
                {/* Base or Pack */}
                <div className="sim-recap-row">
                  <span>
                    {mode === "pack" && selectedPack
                      ? `Pack ${selectedPack.name}`
                      : base.name}
                  </span>
                  <span className="sim-recap-price">
                    {mode === "pack" && selectedPack
                      ? selectedPack.price
                      : base.basePrice}€
                  </span>
                </div>

                {/* Extra pages */}
                {(() => {
                  const included = mode === "pack" && selectedPack
                    ? selectedPack.includedPages || 0
                    : base.basePages || 1;
                  const extra = Math.max(0, pages - included);
                  if (extra === 0) return null;
                  return (
                    <div className="sim-recap-row">
                      <span>+{extra} page{extra > 1 ? "s" : ""} supplémentaire{extra > 1 ? "s" : ""}</span>
                      <span className="sim-recap-price">
                        {extra * base.pagePrice}€
                      </span>
                    </div>
                  );
                })()}

                {/* Included options (if pack) */}
                {mode === "pack" && selectedPack && (selectedPack.includedOptions || []).length > 0 && (
                  <div className="sim-recap-included">
                    <div className="sim-recap-included-label">Inclus dans le pack :</div>
                    {(selectedPack.includedOptions || []).map((io) => (
                      <div key={io.serviceOption?.id} className="sim-recap-included-item">
                        ✓ {io.serviceOption?.name}
                      </div>
                    ))}
                  </div>
                )}

                {/* Extra options */}
                {extraOptionIds.length > 0 && options
                  .filter((o) => extraOptionIds.includes(o.id))
                  .map((opt) => (
                    <div key={opt.id} className="sim-recap-row">
                      <span>{opt.name}</span>
                      <span className="sim-recap-price">{opt.price}€</span>
                    </div>
                  ))}

                {/* Total */}
                <div className="sim-recap-total">
                  <span>Estimation totale</span>
                  <span className="sim-recap-total-price">{computeTotal()}€</span>
                </div>
              </div>

              <p className="sim-disclaimer">
                * Cette estimation est indicative et ne constitue pas un devis.
                Le prix final sera ajusté lors de notre échange selon la
                complexité réelle de votre projet.
              </p>

              <div className="sim-cta">
                <button className="btn btn-blue" onClick={scrollToContact}>
                  Demander un devis personnalisé →
                </button>
                <button className="sim-reset-btn" onClick={reset}>
                  Recommencer la simulation
                </button>
              </div>
            </div>
          )}

          {/* Navigation */}
          {step < 3 && (
            <div className="sim-nav">
              {step > 0 && (
                <button className="sim-nav-btn prev" onClick={() => setStep(step - 1)}>
                  ← Précédent
                </button>
              )}
              <button
                className="sim-nav-btn next"
                disabled={!canNext()}
                onClick={() => setStep(step + 1)}
              >
                Suivant →
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
