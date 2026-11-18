"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import styles from "./acceptance.module.css";

interface AcceptanceItem {
  label: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  recurring: boolean;
  recurringUnit?: string;
}

interface AcceptancePreview {
  number: string;
  status: string;
  createdAt: string;
  validUntil?: string;
  acceptedAt?: string;
  totalHT: number;
  discountAmount: number;
  promoCode?: string;
  client: { company: string; contactName: string };
  items: AcceptanceItem[];
  notes?: string | null;
  contract?: { version: string; digest: string; scope: string; consent: string; clauses: { title: string; text: string }[] } | null;
  signature?: { signerName: string; signerRole: string; signedAt: string; version: string } | null;
}

export default function AcceptQuotePage({
  params,
}: {
  params: { token: string };
}) {
  const [quote, setQuote] = useState<AcceptancePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [eligible, setEligible] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signerRole, setSignerRole] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/devis/accept/${params.token}`, {
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(
          data.message || "Ce lien d’acceptation est invalide ou a expiré.",
        );
      } else {
        setQuote(data);
      }
    } catch {
      setError(
        "Impossible de charger le devis pour le moment. Réessayez dans quelques instants.",
      );
    } finally {
      setLoading(false);
    }
  }, [params.token]);

  useEffect(() => {
    setQuote(null);
    setSignerName("");
    setSignerRole("");
    setAgreed(false);
    setEligible(false);
    void load();
  }, [load]);

  async function acceptQuote() {
    if (!agreed || !eligible || !quote?.contract || !signerName.trim() || !signerRole.trim() || accepting) return;
    setAccepting(true);
    setError("");
    try {
      const response = await fetch(`/api/devis/accept/${params.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signerName: signerName.trim(), signerRole: signerRole.trim(), acceptsContract: agreed, confirmsB2BRemote: eligible, digest: quote.contract.digest }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(Array.isArray(data.message) ? "Vérifiez votre nom, votre qualité et les deux déclarations." : data.message || "La signature n’a pas été enregistrée.");
        return;
      }
      await load();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError(
        "La confirmation n’a pas pu être envoyée. Vérifiez votre connexion et réessayez.",
      );
    } finally {
      setAccepting(false);
    }
  }

  const recurringItems = quote?.items.filter((item) => item.recurring) || [];
  const oneTimeItems = quote?.items.filter((item) => !item.recurring) || [];

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.siteHeader}>
          <Link href="/" className={styles.brand} aria-label="Quantum Code">
            <span className={styles.brandMark}>Q</span>
            <span>
              Quantum <strong>Code</strong>
            </span>
          </Link>
          <a href="mailto:contact@quantum-code.fr" className={styles.helpLink}>
            Une question ? <strong>Écrivez-moi</strong>
          </a>
        </header>

        {loading ? (
          <StateCard label="Ouverture sécurisée">
            <div className={styles.loader} aria-hidden="true" />
            <h1>Préparation de votre devis…</h1>
            <p>Quelques secondes suffisent.</p>
          </StateCard>
        ) : quote?.status === "ACCEPTE" ? (
          <SuccessState quote={quote} token={params.token} />
        ) : error && !quote ? (
          <StateCard label="Lien indisponible">
            <div className={styles.errorIcon}>!</div>
            <h1>Ce devis n’est plus accessible.</h1>
            <p>{error}</p>
            <a
              href="mailto:contact@quantum-code.fr"
              className={styles.primaryLink}
            >
              Demander un nouveau lien
            </a>
          </StateCard>
        ) : quote ? (
          <>
            <section className={styles.hero}>
              <div>
                <div className={styles.eyebrow}>
                  Proposition commerciale · {quote.number}
                </div>
                <h1>
                  Bonjour {firstName(quote.client.contactName)},
                  <br />
                  <span>voici votre projet.</span>
                </h1>
                <p>
                  Cette proposition a été préparée pour{" "}
                  <strong>{quote.client.company}</strong>. Vous pouvez examiner
                  chaque prestation, télécharger le document complet, puis
                  confirmer votre accord en bas de page.
                </p>
              </div>

              <aside className={styles.summaryCard}>
                <div className={styles.summaryTop}>
                  <span>Montant ponctuel</span>
                  <strong>{formatMoney(quote.totalHT)}</strong>
                  <small>Prix final · TVA non applicable</small>
                </div>
                <dl className={styles.metaList}>
                  <div>
                    <dt>Émis le</dt>
                    <dd>{formatDate(quote.createdAt)}</dd>
                  </div>
                  <div>
                    <dt>Valable jusqu’au</dt>
                    <dd>
                      {quote.validUntil
                        ? formatDate(quote.validUntil)
                        : "Non précisé"}
                    </dd>
                  </div>
                  <div>
                    <dt>Destinataire</dt>
                    <dd>{quote.client.company}</dd>
                  </div>
                </dl>
                <a
                  href={`/api/devis/accept/${params.token}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.documentLink}
                >
                  {quote.contract ? "Télécharger le devis et les CGV" : "Télécharger le devis PDF"} <span>↗</span>
                </a>
              </aside>
            </section>

            <section className={styles.contentCard}>
              <div className={styles.sectionHeading}>
                <div>
                  <span>01 · Périmètre</span>
                  <h2>Ce qui est compris dans le projet</h2>
                </div>
                <div className={styles.itemCount}>
                  {oneTimeItems.length} prestation
                  {oneTimeItems.length > 1 ? "s" : ""}
                </div>
              </div>

              <div className={styles.items}>
                {oneTimeItems.map((item, index) => (
                  <div
                    key={`${item.label}-${index}`}
                    className={styles.itemRow}
                  >
                    <span className={styles.itemIndex}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className={styles.itemCopy}>
                      <h3>{item.label}</h3>
                      {item.description && <p>{item.description}</p>}
                      {item.quantity > 1 && (
                        <small>
                          {item.quantity} × {formatMoney(item.unitPrice)}
                        </small>
                      )}
                    </div>
                    <strong>
                      {formatMoney(item.quantity * item.unitPrice)}
                    </strong>
                  </div>
                ))}
              </div>

              <div className={styles.totals}>
                {quote.discountAmount > 0 && (
                  <>
                    <TotalRow
                      label="Sous-total"
                      value={formatMoney(quote.totalHT + quote.discountAmount)}
                    />
                    <TotalRow
                      label={`Remise${quote.promoCode ? ` · ${quote.promoCode}` : ""}`}
                      value={`− ${formatMoney(quote.discountAmount)}`}
                      accent
                    />
                  </>
                )}
                <TotalRow
                  label="Prix final du projet"
                  value={formatMoney(quote.totalHT)}
                  strong
                />
                <p>TVA non applicable, art. 293 B du CGI</p>
              </div>
            </section>

            {recurringItems.length > 0 && (
              <section className={styles.subscriptionCard}>
                <div className={styles.sectionHeading}>
                  <div>
                    <span>02 · Suivi optionnel</span>
                    <h2>Abonnements et services récurrents</h2>
                  </div>
                  <div className={styles.subscriptionBadge}>À part</div>
                </div>
                <p className={styles.sectionIntro}>
                  Ces services sont facturés selon leur propre périodicité. Ils
                  ne sont pas inclus dans le montant ponctuel de création du
                  site.
                </p>
                <div className={styles.subscriptionGrid}>
                  {recurringItems.map((item, index) => (
                    <div
                      key={`${item.label}-${index}`}
                      className={styles.subscriptionItem}
                    >
                      <div>
                        <h3>{item.label}</h3>
                        {item.description && <p>{item.description}</p>}
                      </div>
                      <strong>
                        {formatMoney(item.quantity * item.unitPrice)}
                        <small>/ {item.recurringUnit || "mois"}</small>
                      </strong>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className={styles.reassurance}>
              <div>
                <span>Échange direct</span>
                <p>Vous échangez avec Hugo, du cadrage jusqu’à la livraison.</p>
              </div>
              <div>
                <span>Production maîtrisée</span>
                <p>
                  Chaque étape, chaque test et la mise en ligne sont contrôlés.
                </p>
              </div>
              <div>
                <span>Propriété claire</span>
                <p>Les droits sur les créations spécifiques et les licences des composants sont distingués dans le contrat.</p>
              </div>
            </section>

            <section className={styles.acceptCard}>
              <div>
                <span className={styles.acceptLabel}>03 · Contrat et CGV</span>
                <h2>Vérifier puis signer</h2>
                {quote.contract && <>
                  <p>Version {quote.contract.version}. Relisez le document complet. Pour corriger une information, contactez Hugo avant de signer.</p>
                  {quote.notes && <p className={styles.particulars}><strong>Conditions particulières</strong><br />{quote.notes}</p>}
                  <details className={styles.clauses}>
                    <summary>Lire les conditions générales de vente</summary>
                    {quote.contract.clauses.map(c => <section key={c.title}><h3>{c.title}</h3><p>{c.text}</p></section>)}
                  </details>
                  <a className={styles.documentLink} href={`/api/devis/accept/${params.token}/pdf`} target="_blank" rel="noreferrer">Conserver le document avant signature ↗</a>
                </>}
              </div>

              {quote.status !== "ENVOYE" || !quote.contract ? (
                <div className={styles.expiredBox}>
                  Cette invitation ne permet pas de signer. Contactez Hugo pour recevoir un devis et un contrat à jour.
                </div>
              ) : (
                <form className={styles.acceptAction} onSubmit={event => { event.preventDefault(); void acceptQuote(); }}>
                  <label className={styles.signField}>Prénom et nom du signataire
                    <input required autoComplete="name" minLength={2} maxLength={100} value={signerName} onChange={e => setSignerName(e.target.value)} />
                  </label>
                  <label className={styles.signField}>Qualité dans l’entreprise
                    <input required autoComplete="organization-title" placeholder="Ex. : gérante, artisan en EI" minLength={2} maxLength={100} value={signerRole} onChange={e => setSignerRole(e.target.value)} />
                  </label>
                  <label className={styles.checkbox}>
                    <input type="checkbox" checked={eligible} onChange={e => setEligible(e.target.checked)} />
                    <span>{quote.contract.scope} Si ce n’est pas votre situation, demandez un contrat adapté.</span>
                  </label>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(event) => setAgreed(event.target.checked)}
                    />
                    <span>
                      {quote.contract.consent}
                    </span>
                  </label>
                  {error && <div role="alert" className={styles.inlineError}>{error}</div>}
                  <button
                    type="submit"
                    disabled={!agreed || !eligible || signerName.trim().length < 2 || signerRole.trim().length < 2 || accepting}
                    className={styles.acceptButton}
                  >
                    {accepting
                      ? "Enregistrement de votre accord…"
                      : "Signer le devis et les CGV"}
                  </button>
                  <small>
                    Signature électronique simple, sans débit immédiat. Un exemplaire signé sera disponible ici.
                  </small>
                </form>
              )}
            </section>
          </>
        ) : null}

        <footer className={styles.footer}>
          <span>Quantum Code · Hugo André</span>
          <span>Hugo André EI · <Link href="/mentions-legales">Mentions légales</Link></span>
        </footer>
      </div>
    </main>
  );
}

function SuccessState({
  quote,
  token,
}: {
  quote: AcceptancePreview;
  token: string;
}) {
  return (
    <section className={styles.successCard}>
      <div className={styles.successMark}>✓</div>
      <div className={styles.eyebrow}>Accord enregistré</div>
      <h1>
        Merci {firstName(quote.client.contactName)}.
        <br />
        <span>{quote.signature ? "Votre contrat est signé." : "Votre accord a été enregistré."}</span>
      </h1>
      <p className={styles.successIntro}>
        L’acceptation du devis <strong>{quote.number}</strong> pour{" "}
        <strong>{quote.client.company}</strong> est bien enregistrée.
        {quote.signature ? ` Signé par ${quote.signature.signerName}, ${quote.signature.signerRole}, le ${formatDate(quote.signature.signedAt)} (CGV ${quote.signature.version}). Conservez votre exemplaire ci-dessous, même si l’email ne vous parvient pas.` : " Ce devis historique ne comporte pas de signature des nouvelles CGV."}
      </p>

      <div className={styles.nextSteps}>
        <div>
          <span>01</span>
          <strong>Confirmation du planning</strong>
          <p>Je vous recontacte pour définir la date de lancement.</p>
        </div>
        <div>
          <span>02</span>
          <strong>Acompte et démarrage</strong>
          <p>La facture d’acompte prévue au devis sera préparée.</p>
        </div>
        <div>
          <span>03</span>
          <strong>Collecte des contenus</strong>
          <p>Nous réunissons les textes, images et accès utiles au projet.</p>
        </div>
      </div>

      <div className={styles.successActions}>
        <a
          href={`/api/devis/accept/${token}/pdf`}
          target="_blank"
          rel="noreferrer"
          className={styles.primaryLink}
        >
          {quote.signature ? "Télécharger mon contrat signé" : "Conserver le devis PDF"}
        </a>
        <a
          href="mailto:contact@quantum-code.fr"
          className={styles.secondaryLink}
        >
          Écrire à Hugo
        </a>
      </div>
    </section>
  );
}

function StateCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.stateCard}>
      <div className={styles.eyebrow}>{label}</div>
      {children}
    </section>
  );
}

function TotalRow({
  label,
  value,
  strong = false,
  accent = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={`${styles.totalRow} ${strong ? styles.totalStrong : ""} ${accent ? styles.totalAccent : ""}`}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "bonjour";
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}
