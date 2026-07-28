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

          <CommercialPanel context={{ leadId: lead.id }} />
        </>
      )}
    </div>
  );
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
