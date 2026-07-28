"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { Card, Empty, PageHeader } from "@/app/admin/components/SharedUI";

const API = "/api";

interface FunnelStage {
  key: string;
  label: string;
  count: number;
  conversionFromPrevious: number | null;
  conversionFromVisit: number;
}

interface ConversionStats {
  periodDays: number;
  funnel: FunnelStage[];
  simulatorSteps: Array<{
    key: string;
    label: string;
    count: number;
    conversionFromStart: number;
  }>;
  sources: Array<{ name: string; sessions: number; leads: number; clients: number }>;
  recent: Array<{
    id: string;
    sessionId: string;
    source: string;
    campaign?: string;
    landingPage: string;
    device?: string;
    firstSeenAt: string;
    pageViews: number;
    simulatorStarted: boolean;
    lead: boolean;
    quote: boolean;
    client: boolean;
    company?: string;
  }>;
}

export default function ConversionsPage() {
  const { apiFetch } = useAuth();
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState<ConversionStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await apiFetch(`${API}/conversion/stats?days=${days}`);
    if (response.ok) setStats(await response.json());
    setLoading(false);
  }, [apiFetch, days]);

  useEffect(() => { load(); }, [load]);

  const maxCount = stats?.funnel[0]?.count || 1;

  return (
    <div>
      <PageHeader title="Conversions" subtitle="Du premier passage sur le site jusqu’au client signé" />

      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {[30, 90, 365].map((value) => (
          <button key={value} onClick={() => setDays(value)} style={{ padding: "7px 11px", borderRadius: 6, border: `1px solid ${days === value ? "var(--blue)" : "var(--border)"}`, background: days === value ? "rgba(45,111,255,.1)" : "var(--black-2)", color: days === value ? "#7ba8ff" : "var(--grey-3)", cursor: "pointer" }}>
            {value === 365 ? "1 an" : `${value} jours`}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 40, color: "var(--grey-3)" }}>Chargement...</div>
      ) : !stats ? (
        <Empty>Impossible de charger les conversions</Empty>
      ) : (
        <>
          <Card>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--white)", marginBottom: 20 }}>Entonnoir de conversion</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {stats.funnel.map((stage, index) => (
                <div key={stage.key}>
                  <div style={{ display: "grid", gridTemplateColumns: "170px 60px 1fr 150px", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 12, color: "var(--grey-2)", fontWeight: 600 }}>{stage.label}</span>
                    <span style={{ fontSize: 16, color: "var(--white)", fontWeight: 800 }}>{stage.count}</span>
                    <div style={{ height: 10, background: "var(--black-3)", borderRadius: 8, overflow: "hidden" }}>
                      <div style={{ width: `${Math.max((stage.count / maxCount) * 100, stage.count ? 2 : 0)}%`, height: "100%", background: index === stats.funnel.length - 1 ? "var(--green)" : "var(--blue)", borderRadius: 8 }} />
                    </div>
                    <span style={{ textAlign: "right", fontSize: 11, color: "var(--grey-3)" }}>
                      {stage.conversionFromPrevious === null ? "Point d’entrée" : `${stage.conversionFromPrevious}% depuis l’étape précédente`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div style={{ marginTop: 16 }}>
            <Card>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--white)", marginBottom: 5 }}>
                Progression dans le simulateur
              </div>
              <div style={{ fontSize: 11, color: "var(--grey-3)", marginBottom: 16 }}>
                Nombre de visiteurs ayant atteint chaque étape après avoir commencé.
              </div>
              {stats.simulatorSteps?.length ? (
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${stats.simulatorSteps.length}, minmax(110px, 1fr))`, gap: 8, overflowX: "auto" }}>
                  {stats.simulatorSteps.map((simulatorStep, index) => (
                    <div key={simulatorStep.key} style={{ minWidth: 110, padding: "14px 12px", borderRadius: 8, border: "1px solid var(--border)", background: index === stats.simulatorSteps.length - 1 ? "rgba(93,216,160,.06)" : "var(--black-3)" }}>
                      <div style={{ fontSize: 10, color: "var(--grey-3)", marginBottom: 6 }}>{index + 1}. {simulatorStep.label}</div>
                      <div style={{ fontSize: 21, fontWeight: 800, color: index === stats.simulatorSteps.length - 1 ? "var(--green)" : "var(--white)" }}>{simulatorStep.count}</div>
                      <div style={{ fontSize: 10, color: "var(--grey-4)", marginTop: 3 }}>{simulatorStep.conversionFromStart}% des départs</div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty>Aucune étape du simulateur enregistrée</Empty>
              )}
            </Card>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 16, marginTop: 16 }}>
            <Card>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--white)", marginBottom: 14 }}>Sources</div>
              {stats.sources.length === 0 ? <Empty>Aucune source</Empty> : stats.sources.map((source) => (
                <div key={source.name} style={{ display: "grid", gridTemplateColumns: "1fr 60px 60px 60px", gap: 8, padding: "9px 0", borderBottom: "1px solid var(--border)", fontSize: 12 }}>
                  <span style={{ color: "var(--grey-2)", overflow: "hidden", textOverflow: "ellipsis" }}>{source.name}</span>
                  <span style={{ color: "var(--white)", textAlign: "right" }}>{source.sessions} visites</span>
                  <span style={{ color: "var(--gold)", textAlign: "right" }}>{source.leads} leads</span>
                  <span style={{ color: "var(--green)", textAlign: "right" }}>{source.clients} signés</span>
                </div>
              ))}
            </Card>

            <Card>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--white)", marginBottom: 14 }}>Parcours récents</div>
              {stats.recent.length === 0 ? <Empty>Aucun parcours suivi</Empty> : (
                <div style={{ overflowX: "auto" }}>
                  <div style={{ minWidth: 690 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 70px 170px", gap: 10, padding: "0 8px 7px", color: "var(--grey-4)", fontSize: 10, textTransform: "uppercase" }}>
                      <span>Source</span><span>Parcours</span><span>Pages</span><span>Date</span>
                    </div>
                    {stats.recent.map((session) => (
                      <div key={session.id} style={{ display: "grid", gridTemplateColumns: "120px 1fr 70px 170px", gap: 10, alignItems: "center", padding: "9px 8px", borderTop: "1px solid var(--border)", fontSize: 11 }}>
                        <div>
                          <div style={{ color: "var(--white)" }}>{session.source}</div>
                          <div style={{ color: "var(--grey-4)", marginTop: 2 }}>{session.campaign || session.device || "—"}</div>
                        </div>
                        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                          <Step active label="Visite" />
                          <span style={{ color: "var(--grey-4)" }}>›</span>
                          <Step active={session.simulatorStarted} label="Sim." />
                          <span style={{ color: "var(--grey-4)" }}>›</span>
                          <Step active={session.lead} label="Lead" />
                          <span style={{ color: "var(--grey-4)" }}>›</span>
                          <Step active={session.quote} label="Devis" />
                          <span style={{ color: "var(--grey-4)" }}>›</span>
                          <Step active={session.client} label="Signé" />
                        </div>
                        <span style={{ color: "var(--grey-3)", textAlign: "center" }}>{session.pageViews}</span>
                        <div style={{ color: "var(--grey-3)" }}>
                          {new Date(session.firstSeenAt).toLocaleString("fr-FR")}
                          {session.company && <div style={{ color: "var(--green)", marginTop: 2 }}>{session.company}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Step({ active, label }: { active: boolean; label: string }) {
  return (
    <span style={{ padding: "3px 6px", borderRadius: 4, background: active ? "rgba(93,216,160,.1)" : "var(--black-3)", color: active ? "var(--green)" : "var(--grey-4)", border: `1px solid ${active ? "rgba(93,216,160,.25)" : "var(--border)"}` }}>
      {label}
    </span>
  );
}
