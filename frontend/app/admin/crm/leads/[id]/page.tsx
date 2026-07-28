"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { Badge, Card, ErrorMsg, PageHeader } from "@/app/admin/components/SharedUI";
import CommercialPanel from "@/app/admin/components/CommercialPanel";

const API = "/api";

type Lead = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  budget?: number;
  pageCount?: number;
  source: string;
  status: string;
  score: number;
  scoreLabel: string;
  notes?: string;
  simulatorData?: Record<string, unknown>;
  convertedClient?: { id: string; company: string };
  devis?: Array<{ id: string; number: string; status: string; totalHT: number }>;
};

export default function LeadDetailsPage({ params }: { params: { id: string } }) {
  const { apiFetch } = useAuth();
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    const response = await apiFetch(`${API}/crm/leads/${params.id}`);
    if (!response.ok) {
      setError("Lead introuvable.");
      return;
    }
    setLead(await response.json());
  }, [apiFetch, params.id]);

  useEffect(() => { load(); }, [load]);

  async function convert() {
    setWorking(true);
    setError("");
    const response = await apiFetch(`${API}/crm/workflow/leads/${params.id}/convert`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    const data = await response.json().catch(() => ({}));
    setWorking(false);
    if (!response.ok) {
      setError(data.message || "Conversion impossible.");
      return;
    }
    router.push(`/admin/crm/clients/${data.clientId}`);
  }

  async function createQuote() {
    setWorking(true);
    setError("");
    const response = await apiFetch(`${API}/crm/workflow/leads/${params.id}/quote`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    const data = await response.json().catch(() => ({}));
    setWorking(false);
    if (!response.ok) {
      setError(data.message || "Création du devis impossible.");
      return;
    }
    router.push(`/admin/sales/quotes/${data.quoteId}`);
  }

  if (!lead && !error) return <div style={{ padding: 40, color: "var(--grey-3)" }}>Chargement...</div>;

  return (
    <div>
      <PageHeader title={lead?.company || lead?.name || "Lead"} subtitle={lead ? `${lead.name} · ${lead.email}` : "Détail"} />
      {error && <ErrorMsg>{error}</ErrorMsg>}
      {lead && (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            <button disabled={working} onClick={createQuote} style={{ ...buttonStyle, background: "var(--blue)", borderColor: "var(--blue)", color: "#fff" }}>
              {lead.devis?.length ? `Voir ${lead.devis[0].number}` : "Créer un devis prérempli"}
            </button>
            {lead.convertedClient ? (
              <button onClick={() => router.push(`/admin/crm/clients/${lead.convertedClient?.id}`)} style={buttonStyle}>Voir le client</button>
            ) : (
              <button disabled={working} onClick={convert} style={buttonStyle}>Convertir en client</button>
            )}
            <button onClick={() => router.push("/admin/crm/leads")} style={buttonStyle}>Retour</button>
          </div>

          <Card>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 18 }}>
              <Info label="Statut"><Badge color={lead.status === "PERDU" ? "#ff6b6b" : lead.status === "CONVERTI" ? "var(--green)" : "var(--blue)"}>{lead.status}</Badge></Info>
              <Info label="Score">{lead.score}/100 · {lead.scoreLabel}</Info>
              <Info label="Source">{lead.source}</Info>
              <Info label="Budget">{lead.budget ? `${lead.budget.toFixed(0)} €` : "Non renseigné"}</Info>
              <Info label="Téléphone">{lead.phone || "Non renseigné"}</Info>
              <Info label="Pages">{lead.pageCount || "Non renseigné"}</Info>
            </div>
            {lead.notes && <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--border)", color: "var(--grey-2)", fontSize: 12, lineHeight: 1.6 }}>{lead.notes}</div>}
          </Card>

          {lead.simulatorData && <ProjectBrief data={lead.simulatorData} />}

          <CommercialPanel context={{ leadId: lead.id }} />
        </>
      )}
    </div>
  );
}

function ProjectBrief({ data }: { data: Record<string, unknown> }) {
  const pricing =
    data.pricingSnapshot &&
    typeof data.pricingSnapshot === "object" &&
    !Array.isArray(data.pricingSnapshot)
      ? (data.pricingSnapshot as Record<string, unknown>)
      : {};
  const features = Array.isArray(data.selectedFeatures)
    ? data.selectedFeatures.filter((value): value is string => typeof value === "string")
    : [];
  const recurring = Array.isArray(pricing.recurring)
    ? pricing.recurring.filter(
        (value): value is Record<string, unknown> =>
          Boolean(value && typeof value === "object" && !Array.isArray(value)),
      )
    : [];
  const sectorLabels: Record<string, string> = {
    artisan: "Artisan",
    restaurant: "Restaurant",
    commerce: "Commerce",
    beauty: "Beauté & bien-être",
    coach: "Coach / club",
    liberal: "Profession libérale",
    other: "Autre activité",
  };
  const timelineLabels: Record<string, string> = {
    asap: "Dès que possible",
    "1-2": "Sous 1 à 2 mois",
    "3-4": "Sous 3 à 4 mois",
    explore: "En réflexion",
  };
  const contentLabels: Record<string, string> = {
    ready: "Textes et images prêts",
    partial: "Une partie est prête",
    help: "Accompagnement nécessaire",
  };
  const supportLabels: Record<string, string> = {
    autonomous: "Autonome",
    hosting: "Hébergement suivi",
    essential: "Maintenance essentielle",
    serenity: "Formule sérénité",
  };
  const min = typeof pricing.estimatedMin === "number" ? pricing.estimatedMin : null;
  const max = typeof pricing.estimatedMax === "number" ? pricing.estimatedMax : null;

  return (
    <div style={{ marginTop: 16 }}>
      <Card>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--white)", marginBottom: 14 }}>
          Brief du simulateur
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 16 }}>
          <Info label="Objectif">{stringValue(data.primaryGoal) || stringValue(data.projectType) || "Non renseigné"}</Info>
          <Info label="Secteur">{sectorLabels[stringValue(data.sector)] || stringValue(data.trade) || "Non renseigné"}</Info>
          <Info label="Recommandation">{stringValue(data.recommendationName) || "Non renseignée"}</Info>
          <Info label="Fourchette">{min !== null && max !== null ? `${min.toFixed(0)} à ${max.toFixed(0)} € · TVA non applicable` : "Non renseignée"}</Info>
          <Info label="Lancement">{timelineLabels[stringValue(data.timeline)] || stringValue(data.timeline) || "Non renseigné"}</Info>
          <Info label="Contenus">{contentLabels[stringValue(data.contentReadiness)] || stringValue(data.contentReadiness) || "Non renseigné"}</Info>
          <Info label="Suivi">{supportLabels[stringValue(data.supportChoice)] || stringValue(data.supportChoice) || "Non renseigné"}</Info>
          <Info label="Site actuel">{stringValue(data.website) || "Aucun"}</Info>
        </div>

        {features.length > 0 && (
          <div style={{ marginTop: 18, paddingTop: 15, borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: 10, color: "var(--grey-3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>
              Fonctionnalités demandées
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {features.map((feature) => (
                <span key={feature} style={{ padding: "5px 8px", borderRadius: 5, border: "1px solid var(--border)", background: "var(--black-3)", color: "var(--grey-2)", fontSize: 10 }}>
                  {feature}
                </span>
              ))}
            </div>
          </div>
        )}

        {recurring.length > 0 && (
          <div style={{ marginTop: 15, paddingTop: 15, borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: 10, color: "var(--grey-3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>
              Services récurrents envisagés
            </div>
            {recurring.map((item, index) => (
              <div key={`${stringValue(item.name)}-${index}`} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "5px 0", color: "var(--grey-2)", fontSize: 11 }}>
                <span>{stringValue(item.name)}</span>
                <strong style={{ color: "var(--gold)" }}>
                  {typeof item.price === "number" ? item.price.toFixed(0) : "—"} €/{stringValue(item.unit) || "période"}
                </strong>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "var(--grey-3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 12, color: "var(--white)", fontWeight: 600 }}>{children}</div>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: "8px 12px",
  background: "var(--black-3)",
  border: "1px solid var(--border-2)",
  color: "var(--grey-2)",
  borderRadius: 6,
  cursor: "pointer",
  fontFamily: "var(--font-sans)",
  fontSize: 12,
};
