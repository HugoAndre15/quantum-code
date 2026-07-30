"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

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
  totalHT: number;
  discountAmount: number;
  promoCode?: string;
  client: { company: string; contactName: string };
  items: AcceptanceItem[];
}

export default function AcceptQuotePage({
  params,
}: {
  params: { token: string };
}) {
  const [quote, setQuote] = useState<AcceptancePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const response = await fetch(`/api/devis/accept/${params.token}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(
        data.message || "Ce lien d’acceptation est invalide ou a expiré.",
      );
    } else {
      setQuote(data);
    }
    setLoading(false);
  }, [params.token]);

  useEffect(() => {
    load();
  }, [load]);

  async function acceptQuote() {
    setAccepting(true);
    setError("");
    const response = await fetch(`/api/devis/accept/${params.token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await response.json().catch(() => ({}));
    setAccepting(false);
    if (!response.ok) {
      setError(data.message || "L’acceptation du devis a échoué.");
      return;
    }
    setAccepted(true);
  }

  const recurringItems = quote?.items.filter((item) => item.recurring) || [];
  const oneTimeItems = quote?.items.filter((item) => !item.recurring) || [];

  return (
    <main style={pageStyle}>
      <div style={glowStyle} />
      <section style={shellStyle}>
        <Link href="/" style={brandStyle}>
          Quantum Code
        </Link>

        {loading ? (
          <div style={stateCardStyle}>Chargement du devis…</div>
        ) : accepted ? (
          <div style={stateCardStyle}>
            <div style={successIconStyle}>✓</div>
            <h1 style={titleStyle}>Devis accepté</h1>
            <p style={paragraphStyle}>
              Merci pour votre confiance. Quantum Code a bien reçu votre accord
              et vous recontactera pour organiser le lancement du projet.
            </p>
            <Link href="/" style={primaryLinkStyle}>
              Retour au site
            </Link>
          </div>
        ) : error && !quote ? (
          <div style={stateCardStyle}>
            <h1 style={titleStyle}>Lien indisponible</h1>
            <p style={paragraphStyle}>{error}</p>
            <a href="mailto:contact@quantum-code.fr" style={primaryLinkStyle}>
              Contacter Quantum Code
            </a>
          </div>
        ) : quote ? (
          <>
            <header style={{ marginBottom: 26 }}>
              <div style={eyebrowStyle}>Validation en ligne</div>
              <h1 style={titleStyle}>Devis {quote.number}</h1>
              <p style={paragraphStyle}>
                Bonjour {quote.client.contactName}, vérifiez le récapitulatif
                ci-dessous avant de confirmer l’accord de {quote.client.company}
                .
              </p>
            </header>

            <div style={cardStyle}>
              <div style={metaGridStyle}>
                <Meta
                  label="Émis le"
                  value={new Date(quote.createdAt).toLocaleDateString("fr-FR")}
                />
                <Meta
                  label="Valable jusqu’au"
                  value={
                    quote.validUntil
                      ? new Date(quote.validUntil).toLocaleDateString("fr-FR")
                      : "Non précisé"
                  }
                />
                <Meta label="Client" value={quote.client.company} />
              </div>

              <div style={{ marginTop: 24 }}>
                {oneTimeItems.map((item, index) => (
                  <div key={`${item.label}-${index}`} style={itemRowStyle}>
                    <div>
                      <div
                        style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}
                      >
                        {item.label}
                      </div>
                      {item.description && (
                        <div
                          style={{
                            color: "#8f96a8",
                            fontSize: 11,
                            marginTop: 4,
                          }}
                        >
                          {item.description}
                        </div>
                      )}
                    </div>
                    <div
                      style={{
                        color: "#fff",
                        fontSize: 13,
                        fontWeight: 700,
                        textAlign: "right",
                      }}
                    >
                      {(item.quantity * item.unitPrice).toFixed(2)} €
                      {item.quantity > 1 && (
                        <div
                          style={{
                            color: "#737b8e",
                            fontSize: 9,
                            fontWeight: 400,
                          }}
                        >
                          {item.quantity} × {item.unitPrice.toFixed(2)} €
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div style={totalBoxStyle}>
                {quote.discountAmount > 0 && (
                  <>
                    <TotalRow
                      label="Sous-total"
                      value={`${(quote.totalHT + quote.discountAmount).toFixed(2)} € HT`}
                    />
                    <TotalRow
                      label={`Réduction${quote.promoCode ? ` ${quote.promoCode}` : ""}`}
                      value={`−${quote.discountAmount.toFixed(2)} €`}
                      color="#5dd8a0"
                    />
                  </>
                )}
                <TotalRow
                  label="Total ponctuel"
                  value={`${quote.totalHT.toFixed(2)} € HT`}
                  strong
                />
                <div
                  style={{
                    color: "#737b8e",
                    fontSize: 10,
                    textAlign: "right",
                    marginTop: 5,
                  }}
                >
                  TVA non applicable, art. 293 B du CGI
                </div>
              </div>

              {recurringItems.length > 0 && (
                <div style={recurringBoxStyle}>
                  <div
                    style={{
                      color: "#9aa3b7",
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: ".08em",
                      marginBottom: 10,
                    }}
                  >
                    Prestations récurrentes
                  </div>
                  {recurringItems.map((item, index) => (
                    <div
                      key={`${item.label}-${index}`}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 20,
                        padding: "5px 0",
                        color: "#d9ddea",
                        fontSize: 12,
                      }}
                    >
                      <span>
                        {item.label}
                        {item.quantity > 1 ? ` × ${item.quantity}` : ""}
                      </span>
                      <strong style={{ color: "#77a0ff" }}>
                        {(item.quantity * item.unitPrice).toFixed(2)} € /{" "}
                        {item.recurringUnit || "mois"}
                      </strong>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && <div style={errorStyle}>{error}</div>}
            {quote.status === "EXPIRE" ? (
              <div style={errorStyle}>
                Ce devis a expiré. Contactez Quantum Code pour recevoir une
                nouvelle proposition.
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: 18,
                }}
              >
                <button
                  disabled={accepting}
                  onClick={acceptQuote}
                  style={primaryButtonStyle}
                >
                  {accepting ? "Validation…" : "J’accepte ce devis"}
                </button>
              </div>
            )}
            <p
              style={{
                color: "#737b8e",
                fontSize: 10,
                lineHeight: 1.6,
                marginTop: 16,
              }}
            >
              En cliquant sur « J’accepte ce devis », vous confirmez votre
              accord sur les prestations et montants présentés dans le PDF reçu
              par email.
            </p>
          </>
        ) : null}
      </section>
    </main>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        style={{
          color: "#737b8e",
          fontSize: 9,
          textTransform: "uppercase",
          letterSpacing: ".08em",
          marginBottom: 5,
        }}
      >
        {label}
      </div>
      <div style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>
        {value}
      </div>
    </div>
  );
}

function TotalRow({
  label,
  value,
  strong = false,
  color = "#fff",
}: {
  label: string;
  value: string;
  strong?: boolean;
  color?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 20,
        padding: strong ? "8px 0 0" : "4px 0",
        borderTop: strong ? "1px solid #2a3040" : undefined,
      }}
    >
      <span
        style={{
          color: strong ? "#fff" : "#8f96a8",
          fontSize: strong ? 13 : 11,
          fontWeight: strong ? 700 : 400,
        }}
      >
        {label}
      </span>
      <strong style={{ color, fontSize: strong ? 18 : 12 }}>{value}</strong>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  position: "relative",
  overflow: "hidden",
  padding: "48px 18px",
  background: "#090b10",
  fontFamily: "Arial, sans-serif",
};

const glowStyle: React.CSSProperties = {
  position: "fixed",
  top: -240,
  left: "50%",
  width: 700,
  height: 500,
  transform: "translateX(-50%)",
  borderRadius: "50%",
  background: "rgba(45,111,255,.16)",
  filter: "blur(90px)",
  pointerEvents: "none",
};

const shellStyle: React.CSSProperties = {
  position: "relative",
  width: "min(100%, 760px)",
  margin: "0 auto",
};

const brandStyle: React.CSSProperties = {
  display: "inline-block",
  color: "#fff",
  fontSize: 16,
  fontWeight: 800,
  textDecoration: "none",
  marginBottom: 52,
};

const eyebrowStyle: React.CSSProperties = {
  color: "#77a0ff",
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: ".12em",
  textTransform: "uppercase",
  marginBottom: 10,
};

const titleStyle: React.CSSProperties = {
  color: "#fff",
  fontSize: "clamp(28px, 6vw, 46px)",
  lineHeight: 1.05,
  margin: "0 0 12px",
};

const paragraphStyle: React.CSSProperties = {
  maxWidth: 620,
  color: "#9aa3b7",
  fontSize: 14,
  lineHeight: 1.7,
  margin: "0 0 24px",
};

const cardStyle: React.CSSProperties = {
  padding: "clamp(18px, 4vw, 30px)",
  border: "1px solid #222836",
  borderRadius: 14,
  background: "rgba(17,20,28,.92)",
  boxShadow: "0 24px 80px rgba(0,0,0,.35)",
};

const stateCardStyle: React.CSSProperties = {
  ...cardStyle,
  padding: "clamp(28px, 7vw, 56px)",
  textAlign: "center",
};

const metaGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 18,
  paddingBottom: 22,
  borderBottom: "1px solid #222836",
};

const itemRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 18,
  alignItems: "center",
  padding: "14px 0",
  borderBottom: "1px solid #202531",
};

const totalBoxStyle: React.CSSProperties = {
  width: "min(100%, 360px)",
  margin: "24px 0 0 auto",
};

const recurringBoxStyle: React.CSSProperties = {
  marginTop: 24,
  padding: 16,
  border: "1px solid rgba(45,111,255,.28)",
  borderRadius: 9,
  background: "rgba(45,111,255,.07)",
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "13px 20px",
  border: 0,
  borderRadius: 8,
  background: "#2d6fff",
  color: "#fff",
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
};

const primaryLinkStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  display: "inline-block",
  textDecoration: "none",
};

const successIconStyle: React.CSSProperties = {
  display: "grid",
  placeItems: "center",
  width: 58,
  height: 58,
  margin: "0 auto 20px",
  borderRadius: "50%",
  background: "rgba(93,216,160,.14)",
  color: "#5dd8a0",
  fontSize: 28,
  fontWeight: 800,
};

const errorStyle: React.CSSProperties = {
  marginTop: 16,
  padding: 12,
  border: "1px solid rgba(255,107,107,.35)",
  borderRadius: 8,
  background: "rgba(255,107,107,.08)",
  color: "#ff9a9a",
  fontSize: 12,
  lineHeight: 1.5,
};
