"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CONTENT_CHOICES,
  FALLBACK_PRICING,
  FEATURE_DEFINITIONS,
  PAGE_BLUEPRINTS,
  PROJECT_CHOICES,
  PROJECT_DEFAULT_FEATURES,
  PROJECT_LABELS,
  READINESS_CHOICES,
  SECTOR_CHOICES,
  SECTOR_LABELS,
  SUPPORT_CHOICES,
  TIMELINE_CHOICES,
} from "../data/simulatorData";
import { getConversionSessionId, trackConversion } from "../lib/conversion";

const API = "/api";
const STORAGE_KEY = "qc_simulator_progress_v2";
const STEP_KEYS = ["project", "content", "features", "qualification", "result"];
const STEP_LABELS = ["Projet", "Structure", "Fonctionnalités", "Délai", "Estimation"];

function normalize(value = "") {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatPrice(value) {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(Math.round(value || 0));
}

function roundToFifty(value) {
  return Math.max(0, Math.round(value / 50) * 50);
}

function findOptionByName(options, name) {
  const target = normalize(name);
  return options.find((option) => normalize(option.name) === target);
}

function getIncludedOptionIds(pack) {
  return new Set(
    (pack?.includedOptions || [])
      .map((entry) => entry.serviceOption?.id || entry.serviceOptionId)
      .filter(Boolean),
  );
}

function pageCountFor(scale, sector, projectType) {
  if (projectType === "shop") return scale === "one" ? 5 : scale === "complete" ? 8 : 6;
  if (projectType === "custom") return scale === "one" ? 3 : scale === "complete" ? 8 : 6;
  if (scale === "one") return 1;
  if (scale === "complete") return 7;
  if (scale === "standard") return sector === "other" ? 4 : 5;
  return (PAGE_BLUEPRINTS[sector] || PAGE_BLUEPRINTS.other).length;
}

function pickPack(packs, projectType, contentScale, pages) {
  const sorted = [...packs].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0),
  );
  if (!sorted.length) return null;
  if (projectType === "shop") return sorted[3] || sorted.at(-1);
  if (projectType === "custom" || contentScale === "complete" || pages > 5) {
    return sorted[2] || sorted.at(-1);
  }
  if (contentScale === "one" && pages <= 1) return sorted[0];
  return sorted[1] || sorted[0];
}

function getBlueprint(sector, pages) {
  if (pages === 1) return ["Page unique : présentation, preuves et contact"];
  const blueprint = PAGE_BLUEPRINTS[sector] || PAGE_BLUEPRINTS.other;
  return Array.from({ length: pages }, (_, index) => {
    return blueprint[index] || `Page complémentaire ${index - blueprint.length + 1}`;
  });
}

function getDelay(devTime) {
  if (devTime <= 10) return "5 à 8 jours ouvrés";
  if (devTime <= 22) return "1 à 2 semaines";
  if (devTime <= 38) return "2 à 3 semaines";
  return "4 à 6 semaines";
}

export default function PriceSimulator() {
  const simulatorStarted = useRef(false);
  const completed = useRef(false);
  const trackedSteps = useRef(new Set());
  const restored = useRef(false);

  const [pricing, setPricing] = useState(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [projectType, setProjectType] = useState("");
  const [sector, setSector] = useState("");
  const [contentScale, setContentScale] = useState("");
  const [pages, setPages] = useState(1);
  const [selectedFeatureKeys, setSelectedFeatureKeys] = useState([]);
  const [timeline, setTimeline] = useState("");
  const [contentReadiness, setContentReadiness] = useState("");
  const [supportChoice, setSupportChoice] = useState("");
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadSending, setLeadSending] = useState(false);
  const [leadSent, setLeadSent] = useState(false);
  const [leadError, setLeadError] = useState("");
  const [lead, setLead] = useState({
    contactName: "",
    email: "",
    company: "",
    phone: "",
    website: "",
    message: "",
  });

  useEffect(() => {
    async function loadPricing() {
      try {
        const response = await fetch(`${API}/offers/pricing/public`);
        if (!response.ok) throw new Error("pricing unavailable");
        const data = await response.json();
        if (!data?.base || !data?.packs?.length) {
          throw new Error("pricing incomplete");
        }
        setPricing(data);
      } catch {
        setPricing(FALLBACK_PRICING);
        setUsingFallback(true);
      } finally {
        setLoading(false);
      }
    }
    loadPricing();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || restored.current) return;
    restored.current = true;
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || "null");
      if (!saved) return;
      setStep(Math.min(Math.max(saved.step || 0, 0), 3));
      setProjectType(saved.projectType || "");
      setSector(saved.sector || "");
      setContentScale(saved.contentScale || "");
      setPages(saved.pages || 1);
      setSelectedFeatureKeys(
        Array.isArray(saved.selectedFeatureKeys) ? saved.selectedFeatureKeys : [],
      );
      setTimeline(saved.timeline || "");
      setContentReadiness(saved.contentReadiness || "");
      setSupportChoice(saved.supportChoice || "");
      if (saved.projectType) simulatorStarted.current = true;
    } catch {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !restored.current || leadSent) return;
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        step: Math.min(step, 3),
        projectType,
        sector,
        contentScale,
        pages,
        selectedFeatureKeys,
        timeline,
        contentReadiness,
        supportChoice,
      }),
    );
  }, [
    step,
    projectType,
    sector,
    contentScale,
    pages,
    selectedFeatureKeys,
    timeline,
    contentReadiness,
    supportChoice,
    leadSent,
  ]);

  useEffect(() => {
    if (!simulatorStarted.current || trackedSteps.current.has(step)) return;
    trackedSteps.current.add(step);
    trackConversion("SIMULATOR_STEP_VIEWED", {
      step: STEP_KEYS[step],
      stepNumber: step + 1,
    });
  }, [step, projectType]);

  useEffect(() => {
    if (step !== 4 || completed.current) return;
    completed.current = true;
    trackConversion("SIMULATOR_COMPLETED", {
      projectType,
      sector,
    });
  }, [step, projectType, sector]);

  const base = pricing?.base || FALLBACK_PRICING.base;
  const packs = pricing?.packs || FALLBACK_PRICING.packs;
  const options = pricing?.options || FALLBACK_PRICING.options;
  const oneTimeOptions = options.filter(
    (option) => !option.recurring && normalize(option.name) !== "page supplementaire",
  );
  const recurringOptions = options.filter((option) => option.recurring);

  const recommendedPack = useMemo(
    () => pickPack(packs, projectType, contentScale, pages),
    [packs, projectType, contentScale, pages],
  );
  const includedOptionIds = useMemo(
    () => getIncludedOptionIds(recommendedPack),
    [recommendedPack],
  );

  const featureCards = useMemo(() => {
    return FEATURE_DEFINITIONS.map((feature) => {
      const matchedOptions = feature.optionNames
        .map((name) => findOptionByName(oneTimeOptions, name))
        .filter(Boolean);
      const price = matchedOptions
        .filter((option) => !includedOptionIds.has(option.id))
        .reduce((sum, option) => sum + option.price, 0);
      const fullyIncluded =
        matchedOptions.length > 0 &&
        matchedOptions.every((option) => includedOptionIds.has(option.id));
      return { ...feature, matchedOptions, price, fullyIncluded };
    }).filter((feature) => feature.matchedOptions.length > 0);
  }, [oneTimeOptions, includedOptionIds]);

  const selectedOneTimeOptions = useMemo(() => {
    const ids = new Set();
    for (const feature of featureCards) {
      if (!selectedFeatureKeys.includes(feature.key)) continue;
      for (const option of feature.matchedOptions) ids.add(option.id);
    }
    return oneTimeOptions.filter((option) => ids.has(option.id));
  }, [featureCards, oneTimeOptions, selectedFeatureKeys]);

  const selectedSupport = SUPPORT_CHOICES.find(
    (choice) => choice.id === supportChoice,
  );
  const selectedRecurringOptions = useMemo(() => {
    const names = selectedSupport?.optionNames || [];
    return names
      .map((name) => findOptionByName(recurringOptions, name))
      .filter(Boolean);
  }, [recurringOptions, selectedSupport]);

  const pricingSummary = useMemo(() => {
    if (!recommendedPack) {
      return {
        total: 0,
        essentialTotal: 0,
        min: 0,
        max: 0,
        extraPages: 0,
        extraOptions: [],
        devTime: 0,
      };
    }
    const extraPages = Math.max(
      0,
      pages - (recommendedPack.includedPages || 0),
    );
    const extraOptions = selectedOneTimeOptions.filter(
      (option) => !includedOptionIds.has(option.id),
    );
    const total =
      recommendedPack.price +
      extraPages * (base.pagePrice || 0) +
      extraOptions.reduce((sum, option) => sum + option.price, 0);
    const devTime =
      (recommendedPack.devTime || 0) +
      extraPages * (base.devTimePage || 0) +
      extraOptions.reduce((sum, option) => sum + (option.devTime || 0), 0);

    const essentialKeys = PROJECT_DEFAULT_FEATURES[projectType] || [];
    const essentialIds = new Set();
    for (const feature of featureCards) {
      if (!essentialKeys.includes(feature.key)) continue;
      for (const option of feature.matchedOptions) essentialIds.add(option.id);
    }
    const essentialOptions = oneTimeOptions.filter(
      (option) =>
        essentialIds.has(option.id) && !includedOptionIds.has(option.id),
    );
    const essentialTotal =
      recommendedPack.price +
      extraPages * (base.pagePrice || 0) +
      essentialOptions.reduce((sum, option) => sum + option.price, 0);

    return {
      total,
      essentialTotal,
      min: roundToFifty(total * 0.95),
      max: roundToFifty(total * 1.12),
      extraPages,
      extraOptions,
      devTime,
    };
  }, [
    recommendedPack,
    pages,
    selectedOneTimeOptions,
    includedOptionIds,
    base,
    projectType,
    featureCards,
    oneTimeOptions,
  ]);

  const monthlyRecurring = selectedRecurringOptions
    .filter((option) => normalize(option.recurringUnit).includes("mois"))
    .reduce((sum, option) => sum + option.price, 0);
  const yearlyRecurring = selectedRecurringOptions
    .filter((option) => normalize(option.recurringUnit).includes("an"))
    .reduce((sum, option) => sum + option.price, 0);
  const blueprint = getBlueprint(sector, pages);
  const selectedFeatureLabels = featureCards
    .filter((feature) => selectedFeatureKeys.includes(feature.key))
    .map((feature) => feature.title);
  const caseStudy =
    sector === "restaurant"
      ? {
          title: "Voir l’étude de cas Restaurant Signature",
          href: "/realisations/restaurant-signature",
        }
      : sector === "artisan"
        ? {
            title: "Voir l’étude de cas Artisans locaux",
            href: "/realisations/artisans-local",
          }
        : null;

  function startSimulator() {
    if (simulatorStarted.current) return;
    simulatorStarted.current = true;
    trackConversion("SIMULATOR_STARTED", { entry: "advisor" });
  }

  function selectProject(id) {
    startSimulator();
    setProjectType(id);
    setSelectedFeatureKeys(PROJECT_DEFAULT_FEATURES[id] || []);
    if (id === "shop") {
      setContentScale("complete");
      setPages(8);
    } else if (contentScale) {
      setPages(pageCountFor(contentScale, sector || "other", id));
    }
  }

  function selectContent(id) {
    setContentScale(id);
    setPages(pageCountFor(id, sector || "other", projectType));
  }

  function toggleFeature(key) {
    setSelectedFeatureKeys((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  }

  function canContinue() {
    if (step === 0) return Boolean(projectType && sector);
    if (step === 1) return Boolean(contentScale && pages > 0);
    if (step === 2) return true;
    if (step === 3) {
      return Boolean(timeline && contentReadiness && supportChoice);
    }
    return false;
  }

  function nextStep() {
    if (!canContinue()) return;
    setStep((current) => Math.min(current + 1, 4));
  }

  function previousStep() {
    setStep((current) => Math.max(current - 1, 0));
  }

  function reset() {
    setStep(0);
    setProjectType("");
    setSector("");
    setContentScale("");
    setPages(1);
    setSelectedFeatureKeys([]);
    setTimeline("");
    setContentReadiness("");
    setSupportChoice("");
    setShowLeadForm(false);
    setLeadSent(false);
    setLeadError("");
    completed.current = false;
    trackedSteps.current = new Set();
    simulatorStarted.current = false;
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  }

  function handleLeadChange(event) {
    setLead((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function submitLead(event) {
    event.preventDefault();
    setLeadSending(true);
    setLeadError("");
    const validOneTimeIds = selectedOneTimeOptions
      .map((option) => option.id)
      .filter((id) => !id.startsWith("fallback-"));
    const validRecurringIds = selectedRecurringOptions
      .map((option) => option.id)
      .filter((id) => !id.startsWith("fallback-"));
    const packId =
      recommendedPack?.id && !recommendedPack.id.startsWith("fallback-")
        ? recommendedPack.id
        : undefined;

    try {
      const response = await fetch(`${API}/simulator/lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: getConversionSessionId(),
          contactName: lead.contactName.trim(),
          email: lead.email.trim(),
          company: lead.company.trim(),
          phone: lead.phone.trim() || undefined,
          website: lead.website.trim() || undefined,
          message: lead.message.trim() || undefined,
          trade: SECTOR_LABELS[sector],
          mode: "recommended",
          packId,
          optionIds: validOneTimeIds,
          recurringOptionIds: validRecurringIds,
          pages,
          estimatedTotal: pricingSummary.total,
          estimatedMin: pricingSummary.min,
          estimatedMax: pricingSummary.max,
          projectType,
          sector,
          primaryGoal: PROJECT_LABELS[projectType],
          contentScale,
          selectedFeatures: selectedFeatureLabels,
          timeline,
          contentReadiness,
          supportChoice,
          recommendationName: recommendedPack?.name,
        }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          Array.isArray(error.message)
            ? error.message.join(", ")
            : error.message || "Une erreur est survenue.",
        );
      }
      setLeadSent(true);
      setShowLeadForm(false);
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      setLeadError(
        error instanceof Error
          ? error.message
          : "Erreur réseau, veuillez réessayer.",
      );
    } finally {
      setLeadSending(false);
    }
  }

  if (loading || !pricing) {
    return (
      <section className="section simulator-section" id="simulateur">
        <div className="section-inner">
          <div className="advisor-loading" aria-live="polite">
            Préparation du conseiller…
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section simulator-section" id="simulateur">
      <div className="section-inner">
        <div className="simulator-header">
          <div className="s-label gold">Conseiller de projet</div>
          <h2 className="s-title">
            Construisons le site qui correspond{" "}
            <span className="serif-word">à votre activité.</span>
          </h2>
          <p className="s-sub">
            Parlez-nous de votre objectif : le conseiller compose la structure,
            les fonctionnalités, le délai et une fourchette de budget cohérente.
          </p>
          <div className="advisor-trust-row">
            <span>Estimation gratuite</span>
            <span>Environ 2 minutes</span>
            <span>Aucun engagement</span>
          </div>
          <div className="advisor-ai-disclosure">
            <strong>Production assistée par IA, expertise humaine.</strong>
            <span>
              L’IA accélère certaines étapes. La stratégie, le design, le code,
              les contrôles et la livraison restent pilotés et validés par
              Quantum Code.
            </span>
          </div>
        </div>

        {usingFallback && (
          <div className="advisor-warning" role="status">
            Les tarifs en direct sont momentanément indisponibles. La grille de
            référence 2026 est utilisée pour cette estimation.
          </div>
        )}

        <div className="advisor-card">
          <div className="advisor-progress" aria-label={`Étape ${step + 1} sur 5`}>
            <div className="advisor-progress-top">
              <span>
                Étape {step + 1} sur {STEP_LABELS.length}
              </span>
              <strong>{STEP_LABELS[step]}</strong>
            </div>
            <div className="advisor-progress-track">
              <span style={{ width: `${((step + 1) / STEP_LABELS.length) * 100}%` }} />
            </div>
            <div className="advisor-progress-labels" aria-hidden="true">
              {STEP_LABELS.map((label, index) => (
                <span key={label} className={index <= step ? "active" : ""}>
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className="advisor-layout">
            <div className="advisor-main">
              {step === 0 && (
                <div className="advisor-panel">
                  <div className="advisor-question-number">01 — Votre besoin</div>
                  <h3 className="advisor-question">Que doit accomplir votre futur site ?</h3>
                  <p className="advisor-question-help">
                    Pas besoin de connaître les offres : choisissez simplement
                    le résultat que vous recherchez.
                  </p>
                  <div className="advisor-choice-grid two-columns">
                    {PROJECT_CHOICES.map((choice) => (
                      <button
                        key={choice.id}
                        type="button"
                        className={`advisor-choice${projectType === choice.id ? " selected" : ""}`}
                        aria-pressed={projectType === choice.id}
                        onClick={() => selectProject(choice.id)}
                      >
                        <span className="advisor-choice-eyebrow">{choice.eyebrow}</span>
                        <strong>{choice.title}</strong>
                        <small>{choice.description}</small>
                        <span className="advisor-choice-mark" aria-hidden="true">
                          {projectType === choice.id ? "✓" : "→"}
                        </span>
                      </button>
                    ))}
                  </div>

                  <fieldset className="advisor-inline-question">
                    <legend>Dans quel secteur travaillez-vous ?</legend>
                    <div className="advisor-chip-list">
                      {SECTOR_CHOICES.map((choice) => (
                        <button
                          key={choice.id}
                          type="button"
                          className={`advisor-chip${sector === choice.id ? " selected" : ""}`}
                          aria-pressed={sector === choice.id}
                          onClick={() => {
                            startSimulator();
                            setSector(choice.id);
                            if (contentScale) {
                              setPages(
                                pageCountFor(
                                  contentScale,
                                  choice.id,
                                  projectType,
                                ),
                              );
                            }
                          }}
                        >
                          {choice.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </div>
              )}

              {step === 1 && (
                <div className="advisor-panel">
                  <div className="advisor-question-number">02 — Le contenu</div>
                  <h3 className="advisor-question">Quelle ampleur imaginez-vous ?</h3>
                  <p className="advisor-question-help">
                    Le nombre de pages est ajustable. Nous vous proposons déjà
                    une structure adaptée au secteur {SECTOR_LABELS[sector]?.toLowerCase()}.
                  </p>
                  <div className="advisor-choice-grid two-columns compact">
                    {CONTENT_CHOICES.map((choice) => (
                      <button
                        key={choice.id}
                        type="button"
                        className={`advisor-choice${contentScale === choice.id ? " selected" : ""}`}
                        aria-pressed={contentScale === choice.id}
                        onClick={() => selectContent(choice.id)}
                      >
                        {choice.recommended && (
                          <span className="advisor-recommended-tag">Le plus choisi</span>
                        )}
                        <strong>{choice.title}</strong>
                        <small>{choice.description}</small>
                        <span className="advisor-choice-meta">{choice.pageHint}</span>
                      </button>
                    ))}
                  </div>

                  {contentScale && (
                    <div className="advisor-pages">
                      <div>
                        <span className="advisor-pages-label">Structure proposée</span>
                        <strong>
                          {pages} page{pages > 1 ? "s" : ""}
                        </strong>
                      </div>
                      <div className="advisor-counter">
                        <button
                          type="button"
                          aria-label="Retirer une page"
                          onClick={() => setPages((value) => Math.max(1, value - 1))}
                        >
                          −
                        </button>
                        <span>{pages}</span>
                        <button
                          type="button"
                          aria-label="Ajouter une page"
                          onClick={() => setPages((value) => Math.min(15, value + 1))}
                        >
                          +
                        </button>
                      </div>
                      <div className="advisor-blueprint">
                        {blueprint.map((page) => (
                          <span key={page}>{page}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="advisor-panel">
                  <div className="advisor-question-number">03 — Les fonctionnalités</div>
                  <h3 className="advisor-question">De quoi vos visiteurs ont-ils besoin ?</h3>
                  <p className="advisor-question-help">
                    Les fonctionnalités déjà comprises dans la formule
                    recommandée sont signalées comme incluses.
                  </p>
                  {[...new Set(featureCards.map((feature) => feature.group))].map(
                    (group) => (
                      <div className="advisor-feature-group" key={group}>
                        <div className="advisor-feature-group-title">{group}</div>
                        <div className="advisor-feature-grid">
                          {featureCards
                            .filter((feature) => feature.group === group)
                            .map((feature) => {
                              const selected = selectedFeatureKeys.includes(
                                feature.key,
                              );
                              return (
                                <button
                                  key={feature.key}
                                  type="button"
                                  className={`advisor-feature${selected ? " selected" : ""}`}
                                  aria-pressed={selected}
                                  onClick={() => toggleFeature(feature.key)}
                                >
                                  <span className="advisor-feature-check">
                                    {selected ? "✓" : "+"}
                                  </span>
                                  <span>
                                    <strong>{feature.title}</strong>
                                    <small>{feature.description}</small>
                                  </span>
                                  <em className={feature.fullyIncluded ? "included" : ""}>
                                    {feature.fullyIncluded
                                      ? "Inclus"
                                      : feature.price
                                        ? `+ ${formatPrice(feature.price)} €`
                                        : "Sur devis"}
                                  </em>
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="advisor-panel">
                  <div className="advisor-question-number">04 — Le contexte</div>
                  <h3 className="advisor-question">Comment préparer le bon accompagnement ?</h3>
                  <p className="advisor-question-help">
                    Ces réponses améliorent la recommandation et la priorité de
                    votre demande dans le CRM.
                  </p>

                  <fieldset className="advisor-qualification">
                    <legend>Quand souhaitez-vous lancer le site ?</legend>
                    <div className="advisor-mini-grid">
                      {TIMELINE_CHOICES.map((choice) => (
                        <button
                          key={choice.id}
                          type="button"
                          className={`advisor-mini-choice${timeline === choice.id ? " selected" : ""}`}
                          aria-pressed={timeline === choice.id}
                          onClick={() => setTimeline(choice.id)}
                        >
                          <strong>{choice.label}</strong>
                          <small>{choice.detail}</small>
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className="advisor-qualification">
                    <legend>Où en sont vos contenus ?</legend>
                    <div className="advisor-chip-list">
                      {READINESS_CHOICES.map((choice) => (
                        <button
                          key={choice.id}
                          type="button"
                          className={`advisor-chip${contentReadiness === choice.id ? " selected" : ""}`}
                          aria-pressed={contentReadiness === choice.id}
                          onClick={() => setContentReadiness(choice.id)}
                        >
                          {choice.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className="advisor-qualification">
                    <legend>Quel suivi souhaitez-vous après la livraison ?</legend>
                    <div className="advisor-mini-grid support">
                      {SUPPORT_CHOICES.map((choice) => {
                        const supportOptions = choice.optionNames
                          .map((name) => findOptionByName(recurringOptions, name))
                          .filter(Boolean);
                        const perMonth = supportOptions
                          .filter((option) =>
                            normalize(option.recurringUnit).includes("mois"),
                          )
                          .reduce((sum, option) => sum + option.price, 0);
                        const perYear = supportOptions
                          .filter((option) =>
                            normalize(option.recurringUnit).includes("an"),
                          )
                          .reduce((sum, option) => sum + option.price, 0);
                        return (
                          <button
                            key={choice.id}
                            type="button"
                            className={`advisor-mini-choice${supportChoice === choice.id ? " selected" : ""}`}
                            aria-pressed={supportChoice === choice.id}
                            onClick={() => setSupportChoice(choice.id)}
                          >
                            <strong>{choice.title}</strong>
                            <small>{choice.description}</small>
                            <span>
                              {perMonth
                                ? `${formatPrice(perMonth)} €/mois`
                                : "0 €/mois"}
                              {perYear ? ` + ${formatPrice(perYear)} €/an` : ""}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                </div>
              )}

              {step === 4 && (
                <div className="advisor-panel advisor-result-panel">
                  {!leadSent ? (
                    <>
                      <div className="advisor-result-kicker">
                        Votre recommandation personnalisée
                      </div>
                      <h3 className="advisor-result-title">
                        {recommendedPack?.name || "Projet sur mesure"}
                      </h3>
                      <p className="advisor-result-intro">
                        Une solution pensée pour{" "}
                        {PROJECT_LABELS[projectType]?.toLowerCase()} dans le secteur{" "}
                        {SECTOR_LABELS[sector]?.toLowerCase()}, avec {pages} page
                        {pages > 1 ? "s" : ""} et les fonctionnalités réellement utiles.
                      </p>

                      <div className="advisor-offer-compare">
                        {pricingSummary.essentialTotal < pricingSummary.total && (
                          <div className="advisor-offer-card">
                            <span>Version essentielle</span>
                            <strong>
                              dès {formatPrice(pricingSummary.essentialTotal)} €
                            </strong>
                            <small>
                              Prix final · TVA non applicable. Les fonctions
                              indispensables à votre objectif.
                            </small>
                          </div>
                        )}
                        <div className="advisor-offer-card recommended">
                          <span>Solution recommandée</span>
                          <strong>
                            {formatPrice(pricingSummary.min)} à{" "}
                            {formatPrice(pricingSummary.max)} €
                          </strong>
                          <small>
                            Prix final · TVA non applicable. Estimation affinée
                            selon vos contenus et la complexité finale.
                          </small>
                        </div>
                      </div>

                      <div className="advisor-result-metrics">
                        <div>
                          <span>Délai indicatif</span>
                          <strong>{getDelay(pricingSummary.devTime)}</strong>
                        </div>
                        <div>
                          <span>Structure</span>
                          <strong>
                            {pages} page{pages > 1 ? "s" : ""}
                          </strong>
                        </div>
                        <div>
                          <span>Suivi choisi</span>
                          <strong>{selectedSupport?.title || "À définir"}</strong>
                        </div>
                      </div>

                      <div className="advisor-result-detail">
                        <div>
                          <h4>Pages proposées</h4>
                          <div className="advisor-result-tags">
                            {blueprint.map((page) => (
                              <span key={page}>{page}</span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4>Fonctionnalités retenues</h4>
                          <div className="advisor-result-tags">
                            {(selectedFeatureLabels.length
                              ? selectedFeatureLabels
                              : ["Socle professionnel responsive et SEO"]
                            ).map((label) => (
                              <span key={label}>{label}</span>
                            ))}
                          </div>
                        </div>
                        {(monthlyRecurring > 0 || yearlyRecurring > 0) && (
                          <div className="advisor-recurring">
                            <span>Services récurrents séparés</span>
                            <strong>
                              {monthlyRecurring > 0
                                ? `${formatPrice(monthlyRecurring)} €/mois`
                                : ""}
                              {monthlyRecurring > 0 && yearlyRecurring > 0
                                ? " + "
                                : ""}
                              {yearlyRecurring > 0
                                ? `${formatPrice(yearlyRecurring)} €/an`
                                : ""}
                            </strong>
                          </div>
                        )}
                      </div>

                      <p className="advisor-disclaimer">
                        Cette fourchette ne constitue pas un devis. Elle permet
                        de cadrer le projet avant un échange gratuit et sans
                        engagement. L’IA accélère la préparation et le
                        développement ; chaque choix et chaque livraison restent
                        contrôlés par une personne.
                      </p>

                      {!showLeadForm ? (
                        <div className="advisor-result-actions">
                          <button
                            type="button"
                            className="btn btn-blue advisor-primary-cta"
                            onClick={() => {
                              trackConversion("CTA_CLICKED", {
                                cta: "simulator-estimate",
                                recommendation: recommendedPack?.name || "custom",
                              });
                              setShowLeadForm(true);
                            }}
                          >
                            Recevoir mon estimation détaillée →
                          </button>
                          <span>Réponse personnalisée sous 24h ouvrées</span>
                          {caseStudy && (
                            <a href={caseStudy.href} className="advisor-case-link">
                              {caseStudy.title} ↗
                            </a>
                          )}
                        </div>
                      ) : (
                        <form className="advisor-lead-form" onSubmit={submitLead}>
                          <div>
                            <h4>À qui envoyer cette estimation ?</h4>
                            <p>
                              Quatre informations suffisent. Votre brief complet
                              sera joint au lead dans le CRM.
                            </p>
                          </div>
                          <div className="advisor-form-grid">
                            <label>
                              <span>Nom et prénom *</span>
                              <input
                                type="text"
                                name="contactName"
                                value={lead.contactName}
                                onChange={handleLeadChange}
                                autoComplete="name"
                                required
                              />
                            </label>
                            <label>
                              <span>Email *</span>
                              <input
                                type="email"
                                name="email"
                                value={lead.email}
                                onChange={handleLeadChange}
                                autoComplete="email"
                                required
                              />
                            </label>
                            <label>
                              <span>Entreprise / activité *</span>
                              <input
                                type="text"
                                name="company"
                                value={lead.company}
                                onChange={handleLeadChange}
                                autoComplete="organization"
                                required
                              />
                            </label>
                            <label>
                              <span>Téléphone (facultatif)</span>
                              <input
                                type="tel"
                                name="phone"
                                value={lead.phone}
                                onChange={handleLeadChange}
                                autoComplete="tel"
                              />
                            </label>
                            {projectType === "redesign" && (
                              <label className="full">
                                <span>Adresse du site actuel</span>
                                <input
                                  type="url"
                                  name="website"
                                  value={lead.website}
                                  onChange={handleLeadChange}
                                  placeholder="https://"
                                />
                              </label>
                            )}
                            <label className="full">
                              <span>Une précision à ajouter ?</span>
                              <textarea
                                name="message"
                                rows={3}
                                value={lead.message}
                                onChange={handleLeadChange}
                                placeholder="Contrainte, référence ou information utile…"
                              />
                            </label>
                          </div>
                          {leadError && (
                            <div className="advisor-form-error" role="alert">
                              {leadError}
                            </div>
                          )}
                          <div className="advisor-form-actions">
                            <button
                              type="button"
                              className="advisor-text-button"
                              onClick={() => setShowLeadForm(false)}
                              disabled={leadSending}
                            >
                              Retour au résultat
                            </button>
                            <button
                              type="submit"
                              className="btn btn-blue"
                              disabled={leadSending}
                            >
                              {leadSending
                                ? "Enregistrement…"
                                : "Envoyer mon projet →"}
                            </button>
                          </div>
                          <small className="advisor-privacy">
                            Vos informations servent uniquement à répondre à
                            votre demande. Aucun démarchage automatisé.
                          </small>
                        </form>
                      )}
                    </>
                  ) : (
                    <div className="advisor-success">
                      <span className="advisor-success-mark">✓</span>
                      <div className="advisor-result-kicker">Projet enregistré</div>
                      <h3>Votre estimation est bien arrivée.</h3>
                      <p>
                        Le besoin, la recommandation, les fonctionnalités et la
                        source de la visite sont maintenant regroupés dans le
                        CRM. Vous recevrez une réponse personnalisée sous 24h
                        ouvrées.
                      </p>
                      <button type="button" className="advisor-text-button" onClick={reset}>
                        Simuler un autre projet
                      </button>
                    </div>
                  )}
                </div>
              )}

              {step < 4 && (
                <div className="advisor-navigation">
                  {step > 0 ? (
                    <button type="button" className="advisor-back" onClick={previousStep}>
                      ← Précédent
                    </button>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    className="advisor-next"
                    disabled={!canContinue()}
                    onClick={nextStep}
                  >
                    {step === 3 ? "Voir ma recommandation" : "Continuer"} →
                  </button>
                </div>
              )}
            </div>

            <aside className="advisor-summary" aria-label="Résumé du projet">
              <div className="advisor-summary-head">
                <span>Votre projet</span>
                {projectType && (
                  <button type="button" onClick={reset}>
                    Recommencer
                  </button>
                )}
              </div>
              <div className="advisor-summary-body">
                <SummaryRow
                  label="Objectif"
                  value={PROJECT_LABELS[projectType] || "À préciser"}
                  active={Boolean(projectType)}
                />
                <SummaryRow
                  label="Secteur"
                  value={SECTOR_LABELS[sector] || "À préciser"}
                  active={Boolean(sector)}
                />
                <SummaryRow
                  label="Structure"
                  value={
                    contentScale
                      ? `${pages} page${pages > 1 ? "s" : ""}`
                      : "À composer"
                  }
                  active={Boolean(contentScale)}
                />
                <SummaryRow
                  label="Fonctionnalités"
                  value={
                    selectedFeatureLabels.length
                      ? `${selectedFeatureLabels.length} retenue${selectedFeatureLabels.length > 1 ? "s" : ""}`
                      : step >= 2
                        ? "Socle essentiel"
                        : "À choisir"
                  }
                  active={step >= 2}
                />
                <SummaryRow
                  label="Lancement"
                  value={
                    TIMELINE_CHOICES.find((choice) => choice.id === timeline)
                      ?.label || "À préciser"
                  }
                  active={Boolean(timeline)}
                />
              </div>
              <div className="advisor-live-price">
                <span>Budget indicatif</span>
                {recommendedPack && contentScale ? (
                  <>
                    <strong>
                      {formatPrice(pricingSummary.min)} –{" "}
                      {formatPrice(pricingSummary.max)} €
                    </strong>
                    <small>
                      Prix final · TVA non applicable · services récurrents
                      séparés
                    </small>
                  </>
                ) : (
                  <>
                    <strong>Sur mesure</strong>
                    <small>La fourchette se construit avec vos réponses</small>
                  </>
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}

function SummaryRow({ label, value, active }) {
  return (
    <div className={`advisor-summary-row${active ? " active" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
