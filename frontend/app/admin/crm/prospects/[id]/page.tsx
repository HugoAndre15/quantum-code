"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CommercialPanel from "@/app/admin/components/CommercialPanel";
import { useAuth } from "@/app/context/AuthContext";
import ProspectFormModal from "../ProspectFormModal";
import {
  PIPELINE_COLUMNS,
  PipelineStatus,
  Prospect,
  SOURCE_LABELS,
  STATUS_LABELS,
  WEBSITE_STATUS_LABELS,
  canonicalStatus,
  scoreColor,
} from "../prospect";
import styles from "../prospects.module.css";

const API = "/api";

export default function ProspectDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const { apiFetch } = useAuth();
  const router = useRouter();
  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await apiFetch(`${API}/crm/leads/${params.id}`);
      if (!response.ok) throw new Error("Prospect introuvable.");
      setProspect(await response.json());
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Chargement impossible.",
      );
    } finally {
      setLoading(false);
    }
  }, [apiFetch, params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus(status: PipelineStatus) {
    if (!prospect || canonicalStatus(prospect.status) === status) return;
    setWorking(true);
    setError("");
    try {
      const response = await apiFetch(`${API}/crm/leads/${prospect.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(readError(data, "Mise à jour impossible."));
      setProspect((current) => (current ? { ...current, ...data } : data));
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Mise à jour impossible.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function createClient() {
    if (!prospect) return;
    setWorking(true);
    setError("");
    try {
      const response = await apiFetch(
        `${API}/crm/workflow/leads/${prospect.id}/convert`,
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(readError(data, "Création du client impossible."));
      router.push(`/admin/crm/clients/${data.clientId}`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Création du client impossible.",
      );
      setWorking(false);
    }
  }

  async function createQuote() {
    if (!prospect) return;
    setWorking(true);
    setError("");
    try {
      const response = await apiFetch(
        `${API}/crm/workflow/leads/${prospect.id}/quote`,
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(readError(data, "Création du devis impossible."));
      router.push(`/admin/sales/quotes/${data.quoteId}`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Création du devis impossible.",
      );
      setWorking(false);
    }
  }

  async function remove() {
    if (
      !prospect ||
      !window.confirm(
        `Supprimer le prospect « ${prospect.company || prospect.name} » ?`,
      )
    )
      return;
    setWorking(true);
    setError("");
    try {
      const response = await apiFetch(`${API}/crm/leads/${prospect.id}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(readError(data, "Suppression impossible."));
      router.push("/admin/crm/prospects");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Suppression impossible.",
      );
      setWorking(false);
    }
  }

  if (loading)
    return <div className={styles.loading}>Chargement du prospect…</div>;

  if (!prospect) {
    return (
      <div>
        <button
          className={styles.backButton}
          type="button"
          onClick={() => router.push("/admin/crm/prospects")}
        >
          ← Retour aux prospects
        </button>
        {error && <div className={styles.error}>{error}</div>}
      </div>
    );
  }

  const title = prospect.company || prospect.name;
  const firstQuote = prospect.devis?.find(
    (quote) => !["REFUSE", "EXPIRE"].includes(quote.status),
  );
  return (
    <div className={styles.page}>
      <button
        className={styles.backButton}
        type="button"
        onClick={() => router.push("/admin/crm/prospects")}
      >
        ← Retour aux prospects
      </button>
      <div className={styles.detailHeader}>
        <div>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>
            {[
              prospect.name !== title ? prospect.name : null,
              prospect.trade,
              prospect.city,
            ]
              .filter(Boolean)
              .join(" · ") || "Fiche de prospection"}
          </p>
        </div>
        <div className={styles.actions}>
          <button
            className={styles.buttonPrimary}
            type="button"
            disabled={working || canonicalStatus(prospect.status) === "PERDU"}
            onClick={() => void createQuote()}
          >
            {firstQuote ? `Ouvrir ${firstQuote.number}` : "Créer un devis"}
          </button>
          {prospect.convertedClient ? (
            <button
              className={styles.button}
              type="button"
              onClick={() =>
                router.push(
                  `/admin/crm/clients/${prospect.convertedClient?.id}`,
                )
              }
            >
              Voir le client
            </button>
          ) : (
            <button
              className={styles.button}
              type="button"
              disabled={working || canonicalStatus(prospect.status) === "PERDU"}
              onClick={() => void createClient()}
            >
              Créer la fiche client
            </button>
          )}
          <button
            className={styles.button}
            type="button"
            onClick={() => setEditing(true)}
          >
            Modifier
          </button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.detailGrid}>
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Qualification commerciale</h2>
          <div className={styles.infoGrid}>
            <Info label="Étape du pipeline">
              <select
                className={styles.stageSelect}
                disabled={working}
                value={canonicalStatus(prospect.status)}
                onChange={(event) =>
                  void updateStatus(event.target.value as PipelineStatus)
                }
              >
                {PIPELINE_COLUMNS.map((column) => (
                  <option key={column.status} value={column.status}>
                    {column.label}
                  </option>
                ))}
              </select>
            </Info>
            <Info label="Source">{SOURCE_LABELS[prospect.source]}</Info>
            <Info label="Campagne">
              {prospect.campaign || "Non renseignée"}
            </Info>
            <Info label="Budget estimé">
              {prospect.budget != null
                ? `${prospect.budget.toFixed(0)} €`
                : "Non renseigné"}
            </Info>
            <Info label="Échéance">
              {prospect.delayMonths != null
                ? `${prospect.delayMonths} mois`
                : "Non renseignée"}
            </Info>
            <Info label="Dernier contact">
              {prospect.lastContactAt
                ? formatLongDate(prospect.lastContactAt)
                : "Aucun contact enregistré"}
            </Info>
          </div>
          {prospect.need && (
            <div className={styles.textBlock}>
              <InfoLabel>Besoin identifié</InfoLabel>
              {prospect.need}
            </div>
          )}
          {prospect.lostReason && (
            <div className={styles.textBlock}>
              <InfoLabel>Motif de perte</InfoLabel>
              {prospect.lostReason}
            </div>
          )}
        </section>

        <ScorePanel prospect={prospect} />

        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Contact et présence en ligne</h2>
          <div className={styles.infoGrid}>
            <Info label="Contact">{prospect.name || "Non renseigné"}</Info>
            <Info label="Entreprise">
              {prospect.company || "Non renseignée"}
            </Info>
            <Info label="Email">
              {prospect.email ? (
                <a
                  className={styles.infoLink}
                  href={`mailto:${prospect.email}`}
                >
                  {prospect.email}
                </a>
              ) : (
                "Non renseigné"
              )}
            </Info>
            <Info label="Téléphone">
              {prospect.phone ? (
                <a className={styles.infoLink} href={`tel:${prospect.phone}`}>
                  {prospect.phone}
                </a>
              ) : (
                "Non renseigné"
              )}
            </Info>
            <Info label="Site internet">
              {prospect.website ? (
                <a
                  className={styles.infoLink}
                  href={externalUrl(prospect.website)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {prospect.website}
                </a>
              ) : (
                "Aucun site"
              )}
            </Info>
            <Info label="État du site">
              {WEBSITE_STATUS_LABELS[prospect.websiteStatus]}
            </Info>
          </div>
        </section>

        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Informations internes</h2>
          <div className={styles.infoGrid}>
            <Info label="Créé le">{formatLongDate(prospect.createdAt)}</Info>
            <Info label="Statut">{STATUS_LABELS[prospect.status]}</Info>
          </div>
          <div className={styles.textBlock}>
            {prospect.notes || "Aucune note interne."}
          </div>
          <div style={{ marginTop: 18 }}>
            <button
              className={`${styles.button} ${styles.dangerButton}`}
              type="button"
              disabled={working}
              onClick={() => void remove()}
            >
              Supprimer le prospect
            </button>
          </div>
        </section>

        {prospect.simulatorData && (
          <SimulatorBrief data={prospect.simulatorData} />
        )}
      </div>

      <CommercialPanel context={{ leadId: prospect.id }} />

      {editing && (
        <ProspectFormModal
          prospect={prospect}
          apiFetch={apiFetch}
          onClose={() => setEditing(false)}
          onSaved={load}
        />
      )}
    </div>
  );
}

function ScorePanel({ prospect }: { prospect: Prospect }) {
  return (
    <section className={styles.panel}>
      <div className={styles.scoreHeader}>
        <div>
          <h2 className={styles.panelTitle} style={{ marginBottom: 0 }}>
            Score de priorité
          </h2>
          <div
            className={styles.scoreLabel}
            style={{ color: scoreColor(prospect.score) }}
          >
            {prospect.scoreLabel}
          </div>
        </div>
        <div className={styles.scoreTotal}>
          {prospect.score}
          <span style={{ color: "var(--grey-4)", fontSize: 11 }}>/100</span>
        </div>
      </div>
      {prospect.scoreBreakdown?.map((part) => (
        <div className={styles.scorePart} key={part.key}>
          <div className={styles.scorePartHeader}>
            <span>{part.label}</span>
            <strong>
              {part.score}/{part.max}
            </strong>
          </div>
          <div className={styles.scoreTrack}>
            <div
              className={styles.scoreFill}
              style={{ width: `${Math.round((part.score / part.max) * 100)}%` }}
            />
          </div>
          <div className={styles.scoreDetails}>
            {part.details.length
              ? part.details.join(" · ")
              : "Information à compléter"}
          </div>
        </div>
      ))}
    </section>
  );
}

function SimulatorBrief({ data }: { data: Record<string, unknown> }) {
  const features = Array.isArray(data.selectedFeatures)
    ? data.selectedFeatures.filter(
        (value): value is string => typeof value === "string",
      )
    : [];
  return (
    <section className={`${styles.panel} ${styles.panelWide}`}>
      <h2 className={styles.panelTitle}>Brief issu du simulateur</h2>
      <div className={styles.infoGrid}>
        <Info label="Objectif">
          {stringValue(data.primaryGoal) ||
            stringValue(data.projectType) ||
            "Non renseigné"}
        </Info>
        <Info label="Secteur">
          {stringValue(data.trade) ||
            stringValue(data.sector) ||
            "Non renseigné"}
        </Info>
        <Info label="Site actuel">{stringValue(data.website) || "Aucun"}</Info>
        <Info label="Contenus">
          {stringValue(data.contentReadiness) || "Non renseigné"}
        </Info>
      </div>
      {features.length > 0 && (
        <div className={styles.briefTags}>
          {features.map((feature) => (
            <span className={styles.tag} key={feature}>
              {feature}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

function Info({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className={styles.infoLabel}>{label}</div>
      <div className={styles.infoValue}>{children}</div>
    </div>
  );
}

function InfoLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className={styles.infoLabel} style={{ display: "block" }}>
      {children}
    </span>
  );
}

function readError(data: Record<string, unknown>, fallback: string) {
  if (Array.isArray(data.message)) return data.message.join(" · ");
  return typeof data.message === "string" ? data.message : fallback;
}

function externalUrl(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function formatLongDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}
