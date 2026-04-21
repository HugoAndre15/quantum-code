import { budgetExamples, steps } from "../data/siteData";

export default function Tarifs({ onToast }) {
  const scrollToSimulator = () => {
    onToast?.("Simulez votre prix en 1 minute !");
    document
      .getElementById("simulateur")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="section tarifs-section" id="tarifs">
      <div className="section-inner">
        {/* Header */}
        <div className="tarifs-header">
          <div className="s-label gold">Tarifs</div>
          <h2 className="s-title">
            Quelques budgets <span className="serif-word">indicatifs.</span>
          </h2>
          <p className="s-sub">
            Chaque projet est unique, mais voici quelques exemples concrets pour
            vous aider à vous projeter. Pour un prix précis adapté à votre
            besoin, utilisez le simulateur.
          </p>
        </div>

        {/* Budget examples */}
        <div className="budgets-grid">
          {budgetExamples.map((b, i) => (
            <div key={i} className="budget-card">
              <div className="budget-icon" aria-hidden="true">
                {b.icon}
              </div>
              <div className="budget-title">{b.title}</div>
              <p className="budget-desc">{b.desc}</p>
              <div className="budget-price">{b.price}</div>
              <div className="budget-note">{b.note}</div>
              <button
                className="btn btn-outline budget-cta"
                onClick={scrollToSimulator}
              >
                Estimer mon projet →
              </button>
            </div>
          ))}
        </div>

        {/* Main CTA — simulator */}
        <div className="tarifs-cta-block">
          <div className="tarifs-cta-text">
            <h3 className="tarifs-cta-title">
              Besoin d&apos;un prix précis pour <em>votre</em> projet ?
            </h3>
            <p className="tarifs-cta-desc">
              Le simulateur vous donne une estimation détaillée en quelques
              clics, selon vos pages, vos fonctionnalités et vos options.
            </p>
          </div>
          <button className="btn btn-gold" onClick={scrollToSimulator}>
            🧮 Simuler mon budget →
          </button>
        </div>

        {/* Comment ça marche */}
        <div className="steps-block tarifs-steps">
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

        <p className="tarifs-footnote">
          Hébergement à partir de 10 €/mois · Maintenance 20 €/mois · Frais de
          domaine 5–20 € · TVA non applicable — art. 293B CGI
        </p>
      </div>
    </section>
  );
}
