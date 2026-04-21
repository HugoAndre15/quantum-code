import { useState } from "react";
import { faqItems } from "../data/siteData";

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  const toggle = (i) => {
    setOpenIndex((prev) => (prev === i ? -1 : i));
  };

  const scrollToSimulator = () => {
    document
      .getElementById("simulateur")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="section faq-section" id="faq">
      <div className="section-inner">
        <div className="faq-header">
          <div className="s-label">FAQ</div>
          <h2 className="s-title">
            Vos questions, mes <span className="serif-word">réponses.</span>
          </h2>
          <p className="s-sub">
            Tout ce qu&apos;il faut savoir avant de se lancer : délais,
            personnalisation, accompagnement, paiement…
          </p>
        </div>

        <ul className="faq-list">
          {faqItems.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <li
                key={i}
                className={`faq-item${isOpen ? " open" : ""}`}
              >
                <button
                  type="button"
                  className="faq-question"
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${i}`}
                  id={`faq-trigger-${i}`}
                  onClick={() => toggle(i)}
                >
                  <span className="faq-question-text">{item.q}</span>
                  <span className="faq-icon" aria-hidden="true">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>
                <div
                  id={`faq-panel-${i}`}
                  role="region"
                  aria-labelledby={`faq-trigger-${i}`}
                  className="faq-answer"
                  hidden={!isOpen}
                >
                  <p>{item.a}</p>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="faq-cta">
          <p className="faq-cta-text">
            Une autre question ou envie d&apos;une estimation tout de suite ?
          </p>
          <div className="faq-cta-buttons">
            <button className="btn btn-gold" onClick={scrollToSimulator}>
              🧮 Simuler mon prix
            </button>
            <a href="#contact" className="btn btn-outline">
              Me contacter
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
