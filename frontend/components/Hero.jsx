import { heroStats, siteConfig } from "../data/siteData";

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-inner">
        <div className="hero-content">
          <div className="hero-badge">
            <div className="hero-badge-dot" />
            {siteConfig.availableText}
          </div>

          <h1 className="hero-title">
            Je construis des
            <br />
            <span className="serif-word">sites web</span>
          </h1>
          <div className="hero-title-sub">qui génèrent des clients.</div>

          <p className="hero-desc">
            Développeur web freelance dans {siteConfig.locationShort} — je crée
            des sites vitrines, boutiques en ligne et applications sur mesure
            qui attirent du trafic, convertissent vos visiteurs et font grandir
            votre activité.
          </p>

          <div className="hero-ctas">
            <a href="#contact" className="btn btn-blue">
              Obtenir un devis gratuit
            </a>
            <a href="#portfolio" className="btn btn-outline">
              Voir mes réalisations
            </a>
          </div>

          <div className="hero-stats">
            {heroStats.map((s, i) => (
              <div key={i} className="hero-stat">
                <div className="hero-stat-num">
                  {s.num}
                  <span>{s.suf}</span>
                </div>
                <div className="hero-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="scroll-hint">
          <div className="scroll-hint-line" />
          Défiler
        </div>
      </div>
    </section>
  );
}
