"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface CaseStudy {
  slug: string;
  name: string;
  description: string;
  tag: string;
  languages: string[];
  link?: string;
  image?: string;
  clientProblem?: string;
  solution?: string;
  result?: string;
  features: string[];
}

export default function CaseStudyPage({ params }: { params: { slug: string } }) {
  const [project, setProject] = useState<CaseStudy | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    fetch(`/api/portfolio/public/${params.slug}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("missing");
        setProject(await response.json());
      })
      .catch(() => setMissing(true));
  }, [params.slug]);

  return (
    <>
      <Navbar />
      <main className="case-study">
        {missing ? (
          <div className="case-study-empty">
            <h1>Réalisation introuvable</h1>
            <Link href="/#portfolio" className="btn btn-blue">Retour au portfolio</Link>
          </div>
        ) : !project ? (
          <div className="case-study-empty">Chargement…</div>
        ) : (
          <>
            <section className="case-hero">
              <div className="case-hero-copy">
                <Link href="/#portfolio" className="case-back">← Retour aux réalisations</Link>
                <div className="s-label">{project.tag}</div>
                <h1>{project.name}</h1>
                <p>{project.description}</p>
                <div className="case-tags">
                  {project.languages.map((language) => <span key={language}>{language}</span>)}
                </div>
                {project.link && (
                  <a href={project.link} target="_blank" rel="noopener noreferrer" className="btn btn-blue">
                    Voir la démonstration ↗
                  </a>
                )}
              </div>
              <div className="case-hero-media">
                {project.image ? <img src={project.image} alt={`Aperçu ${project.name}`} /> : <div className="case-placeholder" />}
              </div>
            </section>

            <section className="case-story">
              {[
                { number: "01", title: "Le problème client", body: project.clientProblem },
                { number: "02", title: "La solution Quantum Code", body: project.solution },
                { number: "03", title: "Le résultat recherché", body: project.result },
              ].filter((item) => item.body).map((item) => (
                <article key={item.number} className="case-story-card">
                  <span>{item.number}</span>
                  <h2>{item.title}</h2>
                  <p>{item.body}</p>
                </article>
              ))}
            </section>

            {project.features?.length > 0 && (
              <section className="case-features">
                <div>
                  <div className="s-label">Fonctionnalités</div>
                  <h2>Une vitrine pensée pour <span className="serif-word">convertir.</span></h2>
                </div>
                <div className="case-feature-list">
                  {project.features.map((feature, index) => (
                    <div key={feature}><span>{String(index + 1).padStart(2, "0")}</span>{feature}</div>
                  ))}
                </div>
              </section>
            )}

            <section className="case-cta">
              <div>
                <div className="s-label">Votre projet</div>
                <h2>Vous voulez une vitrine de ce niveau pour votre activité ?</h2>
              </div>
              <Link href="/#contact" className="btn btn-blue">Parlons de votre projet →</Link>
            </section>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
