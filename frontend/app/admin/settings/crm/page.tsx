"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import {
  Card,
  ErrorMsg,
  Modal,
  PageHeader,
  inputStyle,
} from "@/app/admin/components/SharedUI";

const API = "/api";

interface CrmSummary {
  leads: number;
  clients: number;
  quotes: number;
  invoices: number;
  projects: number;
  payments: number;
  subscriptions: number;
  visitors: number;
}

interface DestructiveAction {
  key: "leads" | "quotes" | "clients" | "reset";
  title: string;
  description: string;
  detail: string;
  confirmation: string;
  accent: string;
}

const ACTIONS: DestructiveAction[] = [
  {
    key: "leads",
    title: "Supprimer tous les leads",
    description: "Vide la liste des prospects, y compris les leads déjà convertis.",
    detail: "Les clients déjà créés sont conservés.",
    confirmation: "SUPPRIMER LES LEADS",
    accent: "#f0a94b",
  },
  {
    key: "quotes",
    title: "Supprimer les devis",
    description: "Supprime tous les devis, leurs lignes, factures et paiements de facture.",
    detail: "Les clients et projets sont conservés. Les projets sont détachés de leur devis.",
    confirmation: "SUPPRIMER LES DEVIS",
    accent: "#f07d2d",
  },
  {
    key: "clients",
    title: "Supprimer tous les clients",
    description: "Supprime les clients et toutes leurs données commerciales liées.",
    detail: "Les leads sont conservés et repassent à l’état qualifié.",
    confirmation: "SUPPRIMER LES CLIENTS",
    accent: "#ef6666",
  },
  {
    key: "reset",
    title: "Réinitialiser le CRM",
    description: "Efface les leads, clients, devis, factures, projets, paiements et parcours de conversion.",
    detail: "Le portfolio, les avis manuels, les packs, options et codes promo sont conservés.",
    confirmation: "RÉINITIALISER LE CRM",
    accent: "#dc3d55",
  },
];

export default function CrmSettingsPage() {
  const { apiFetch } = useAuth();
  const [summary, setSummary] = useState<CrmSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeAction, setActiveAction] = useState<DestructiveAction | null>(
    null,
  );
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const response = await apiFetch(`${API}/settings/crm/summary`);
    if (response.ok) {
      setSummary(await response.json());
      setError("");
    } else {
      setError("Impossible de charger l’état du CRM.");
    }
    setLoading(false);
  }, [apiFetch]);

  useEffect(() => {
    load();
  }, [load]);

  function openAction(action: DestructiveAction) {
    setActiveAction(action);
    setConfirmation("");
    setError("");
    setSuccess("");
  }

  function closeAction() {
    if (deleting) return;
    setActiveAction(null);
    setConfirmation("");
  }

  async function executeAction() {
    if (!activeAction || confirmation !== activeAction.confirmation) return;

    setDeleting(true);
    setError("");
    const response = await apiFetch(
      `${API}/settings/crm/${activeAction.key}`,
      {
        method: "DELETE",
        body: JSON.stringify({ confirmation }),
      },
    );
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(data.message || "La suppression a échoué.");
      setDeleting(false);
      return;
    }

    setSuccess(data.message || "Nettoyage terminé.");
    setActiveAction(null);
    setConfirmation("");
    setDeleting(false);
    await load();
  }

  const metrics = summary
    ? [
        { label: "Leads", value: summary.leads },
        { label: "Clients", value: summary.clients },
        { label: "Devis", value: summary.quotes },
        { label: "Factures", value: summary.invoices },
        { label: "Projets", value: summary.projects },
        { label: "Paiements", value: summary.payments },
        { label: "Abonnements", value: summary.subscriptions },
        { label: "Parcours suivis", value: summary.visitors },
      ]
    : [];

  return (
    <div>
      <PageHeader
        title="Paramètres CRM"
        subtitle="Nettoyage et réinitialisation des données commerciales"
      />

      {error && !activeAction && <ErrorMsg>{error}</ErrorMsg>}
      {success && (
        <div
          style={{
            fontSize: 12,
            color: "var(--green)",
            marginBottom: 20,
            padding: "10px 14px",
            background: "rgba(93,216,160,.1)",
            border: "1px solid rgba(93,216,160,.2)",
            borderRadius: "var(--r)",
          }}
        >
          {success}
        </div>
      )}

      <Card>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--white)",
            marginBottom: 14,
          }}
        >
          État actuel
        </div>
        {loading ? (
          <div style={{ color: "var(--grey-3)", fontSize: 12 }}>
            Chargement...
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
              gap: 10,
            }}
          >
            {metrics.map((metric) => (
              <div
                key={metric.label}
                style={{
                  background: "var(--black-3)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "12px 14px",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--grey-3)",
                    textTransform: "uppercase",
                    letterSpacing: ".05em",
                  }}
                >
                  {metric.label}
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: "var(--white)",
                    marginTop: 3,
                  }}
                >
                  {metric.value}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div style={{ marginTop: 24, marginBottom: 12 }}>
        <h3
          style={{
            margin: 0,
            fontSize: 15,
            color: "var(--white)",
            fontWeight: 700,
          }}
        >
          Zone de nettoyage
        </h3>
        <p
          style={{
            margin: "5px 0 0",
            fontSize: 12,
            color: "var(--grey-3)",
          }}
        >
          Chaque action est définitive et demande une confirmation explicite.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 12,
        }}
      >
        {ACTIONS.map((action) => (
          <div
            key={action.key}
            style={{
              background: "var(--black-2)",
              border: `1px solid ${action.accent}35`,
              borderRadius: "var(--r-m)",
              padding: 20,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "var(--white)",
              }}
            >
              {action.title}
            </div>
            <p
              style={{
                fontSize: 12,
                color: "var(--grey-2)",
                lineHeight: 1.55,
                margin: "8px 0 4px",
              }}
            >
              {action.description}
            </p>
            <p
              style={{
                fontSize: 11,
                color: "var(--grey-3)",
                lineHeight: 1.5,
                margin: "0 0 18px",
              }}
            >
              {action.detail}
            </p>
            <button
              type="button"
              onClick={() => openAction(action)}
              style={{
                marginTop: "auto",
                alignSelf: "flex-start",
                fontSize: 11,
                fontWeight: 600,
                padding: "7px 12px",
                color: action.accent,
                background: `${action.accent}12`,
                border: `1px solid ${action.accent}55`,
                borderRadius: "var(--r)",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
              }}
            >
              Ouvrir la confirmation
            </button>
          </div>
        ))}
      </div>

      {activeAction && (
        <Modal onClose={closeAction} maxWidth={520}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              background: `${activeAction.accent}18`,
              color: activeAction.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              marginBottom: 14,
            }}
          >
            !
          </div>
          <h3
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: "var(--white)",
              margin: "0 0 8px",
            }}
          >
            {activeAction.title}
          </h3>
          <p
            style={{
              fontSize: 12,
              lineHeight: 1.6,
              color: "var(--grey-2)",
              margin: "0 0 18px",
            }}
          >
            Cette opération ne peut pas être annulée. Saisissez exactement{" "}
            <strong style={{ color: "var(--white)" }}>
              {activeAction.confirmation}
            </strong>{" "}
            pour continuer.
          </p>
          {error && <ErrorMsg>{error}</ErrorMsg>}
          <input
            autoFocus
            style={inputStyle}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={activeAction.confirmation}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 20,
            }}
          >
            <button
              type="button"
              onClick={closeAction}
              disabled={deleting}
              style={{
                fontSize: 12,
                padding: "8px 16px",
                background: "var(--black-3)",
                border: "1px solid var(--border-2)",
                borderRadius: "var(--r)",
                color: "var(--grey-2)",
                cursor: "pointer",
              }}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={executeAction}
              disabled={
                deleting || confirmation !== activeAction.confirmation
              }
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "8px 16px",
                background: activeAction.accent,
                border: "none",
                borderRadius: "var(--r)",
                color: "#fff",
                cursor: "pointer",
                opacity:
                  deleting || confirmation !== activeAction.confirmation
                    ? 0.45
                    : 1,
              }}
            >
              {deleting ? "Suppression..." : "Confirmer la suppression"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
