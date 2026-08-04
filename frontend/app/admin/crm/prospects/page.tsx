"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import {
  ActionButton,
  ListActions,
  ListRow,
  ListTable,
} from "@/app/admin/components/SharedUI";
import ImportCsvModal from "./ImportCsvModal";
import ProspectFormModal from "./ProspectFormModal";
import {
  PIPELINE_COLUMNS,
  PipelineStatus,
  Prospect,
  SOURCE_LABELS,
  STATUS_LABELS,
  WEBSITE_STATUS_LABELS,
  canonicalStatus,
  scoreColor,
} from "./prospect";
import styles from "./prospects.module.css";

const API = "/api";

type ViewMode = "pipeline" | "list";
type ScoreFilter = "all" | "priority" | "hot" | "work" | "low";

export default function ProspectsPage() {
  const { apiFetch } = useAuth();
  const router = useRouter();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [campaign, setCampaign] = useState("all");
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>("all");
  const [view, setView] = useState<ViewMode>("pipeline");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragTarget, setDragTarget] = useState<PipelineStatus | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState<Prospect | null | undefined>(
    undefined,
  );

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await apiFetch(`${API}/crm/leads`);
      if (!response.ok) throw new Error("Impossible de charger les prospects.");
      setProspects(await response.json());
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Chargement impossible.",
      );
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  const campaigns = useMemo(
    () =>
      [
        ...new Set(
          prospects.flatMap((prospect) =>
            prospect.campaign ? [prospect.campaign] : [],
          ),
        ),
      ].sort((a, b) => a.localeCompare(b, "fr")),
    [prospects],
  );

  const filtered = useMemo(() => {
    const normalizedQuery = normalize(query);
    return prospects.filter((prospect) => {
      if (campaign !== "all" && prospect.campaign !== campaign) return false;
      if (!matchesScore(prospect.score, scoreFilter)) return false;
      if (!normalizedQuery) return true;
      return normalize(
        [
          prospect.company,
          prospect.name,
          prospect.email,
          prospect.phone,
          prospect.trade,
          prospect.city,
          prospect.website,
          prospect.need,
        ]
          .filter(Boolean)
          .join(" "),
      ).includes(normalizedQuery);
    });
  }, [campaign, prospects, query, scoreFilter]);

  const activeCount = prospects.filter(
    (prospect) => !["GAGNE", "CONVERTI", "PERDU"].includes(prospect.status),
  ).length;
  const priorityCount = prospects.filter(
    (prospect) =>
      prospect.score >= 75 && canonicalStatus(prospect.status) !== "PERDU",
  ).length;
  const overdueCount = prospects.filter((prospect) =>
    isOverdue(prospect.tasks?.[0]?.dueAt),
  ).length;
  const wonCount = prospects.filter(
    (prospect) => canonicalStatus(prospect.status) === "GAGNE",
  ).length;

  async function moveProspect(id: string, status: PipelineStatus) {
    const current = prospects.find((prospect) => prospect.id === id);
    if (!current || canonicalStatus(current.status) === status || movingId)
      return;

    const previous = prospects;
    setMovingId(id);
    setError("");
    setProspects((items) =>
      items.map((item) => (item.id === id ? { ...item, status } : item)),
    );
    try {
      const response = await apiFetch(`${API}/crm/leads/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = Array.isArray(data.message)
          ? data.message.join(" · ")
          : data.message;
        throw new Error(message || "Déplacement impossible.");
      }
      setProspects((items) =>
        items.map((item) => (item.id === id ? { ...item, ...data } : item)),
      );
    } catch (caught) {
      setProspects(previous);
      setError(
        caught instanceof Error ? caught.message : "Déplacement impossible.",
      );
    } finally {
      setMovingId(null);
      setDraggedId(null);
      setDragTarget(null);
    }
  }

  function drop(status: PipelineStatus) {
    const id = draggedId;
    setDraggedId(null);
    setDragTarget(null);
    if (id) void moveProspect(id, status);
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Prospects</h1>
          <p className={styles.subtitle}>
            Qualification, priorisation et suivi de la prospection jusqu’au
            devis accepté.
          </p>
        </div>
        <div className={styles.actions}>
          <button
            className={styles.button}
            type="button"
            onClick={() => setShowImport(true)}
          >
            Importer un CSV
          </button>
          <button
            className={styles.buttonPrimary}
            type="button"
            onClick={() => setEditing(null)}
          >
            + Nouveau prospect
          </button>
        </div>
      </div>

      <div className={styles.kpis}>
        <Kpi
          label="Pipeline actif"
          value={activeCount}
          hint={`${prospects.length} prospect${prospects.length > 1 ? "s" : ""} au total`}
        />
        <Kpi
          label="Prioritaires"
          value={priorityCount}
          hint="Score supérieur ou égal à 75"
          color="var(--green)"
        />
        <Kpi
          label="Relances en retard"
          value={overdueCount}
          hint="Prochaine action dépassée"
          color={overdueCount ? "#ff8b8b" : "var(--white)"}
        />
        <Kpi
          label="Gagnés"
          value={wonCount}
          hint="Devis acceptés / anciens convertis"
          color="var(--gold)"
        />
      </div>

      <div className={styles.filters}>
        <input
          className={styles.control}
          aria-label="Rechercher un prospect"
          placeholder="Entreprise, contact, ville, métier…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          className={styles.control}
          aria-label="Filtrer par campagne"
          value={campaign}
          onChange={(event) => setCampaign(event.target.value)}
        >
          <option value="all">Toutes les campagnes</option>
          {campaigns.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select
          className={styles.control}
          aria-label="Filtrer par score"
          value={scoreFilter}
          onChange={(event) =>
            setScoreFilter(event.target.value as ScoreFilter)
          }
        >
          <option value="all">Tous les scores</option>
          <option value="priority">Prioritaire · 75–100</option>
          <option value="hot">Chaud · 55–74</option>
          <option value="work">À travailler · 35–54</option>
          <option value="low">Faible · 0–34</option>
        </select>
        <div className={styles.viewSwitch} aria-label="Mode d’affichage">
          <button
            className={`${styles.viewButton} ${view === "pipeline" ? styles.viewButtonActive : ""}`}
            type="button"
            aria-pressed={view === "pipeline"}
            onClick={() => setView("pipeline")}
          >
            Pipeline
          </button>
          <button
            className={`${styles.viewButton} ${view === "list" ? styles.viewButtonActive : ""}`}
            type="button"
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            Liste
          </button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <div className={styles.loading}>Chargement des prospects…</div>
      ) : view === "pipeline" ? (
        <div className={styles.board}>
          {PIPELINE_COLUMNS.map((column) => {
            const items = filtered.filter(
              (prospect) => canonicalStatus(prospect.status) === column.status,
            );
            return (
              <section
                key={column.status}
                className={`${styles.column} ${dragTarget === column.status ? styles.columnTarget : ""}`}
                onDragEnter={() => setDragTarget(column.status)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => drop(column.status)}
              >
                <div className={styles.columnHeader}>
                  <span
                    className={styles.columnDot}
                    style={{ background: column.color }}
                  />
                  <div>
                    <div className={styles.columnTitle}>{column.label}</div>
                    <div className={styles.columnDescription}>
                      {column.description}
                    </div>
                  </div>
                  <span className={styles.columnCount}>{items.length}</span>
                </div>
                <div className={styles.cards}>
                  {items.length ? (
                    items.map((prospect) => (
                      <ProspectCard
                        key={prospect.id}
                        prospect={prospect}
                        moving={movingId === prospect.id}
                        onDragStart={() => setDraggedId(prospect.id)}
                        onDragEnd={() => {
                          setDraggedId(null);
                          setDragTarget(null);
                        }}
                        onOpen={() =>
                          router.push(`/admin/crm/prospects/${prospect.id}`)
                        }
                        onEdit={() => setEditing(prospect)}
                        onMove={(status) =>
                          void moveProspect(prospect.id, status)
                        }
                      />
                    ))
                  ) : (
                    <div className={styles.emptyColumn}>
                      Dépose un prospect ici
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <ProspectList
          prospects={filtered}
          movingId={movingId}
          onOpen={(id) => router.push(`/admin/crm/prospects/${id}`)}
          onEdit={setEditing}
          onMove={(id, status) => void moveProspect(id, status)}
        />
      )}

      {!loading && !filtered.length && view === "list" && (
        <div className={styles.empty}>
          Aucun prospect ne correspond aux filtres.
        </div>
      )}

      {editing !== undefined && (
        <ProspectFormModal
          prospect={editing}
          apiFetch={apiFetch}
          onClose={() => setEditing(undefined)}
          onSaved={load}
        />
      )}
      {showImport && (
        <ImportCsvModal
          apiFetch={apiFetch}
          onClose={() => setShowImport(false)}
          onImported={load}
        />
      )}
    </div>
  );
}

function ProspectCard({
  prospect,
  moving,
  onDragStart,
  onDragEnd,
  onOpen,
  onEdit,
  onMove,
}: {
  prospect: Prospect;
  moving: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onOpen: () => void;
  onEdit: () => void;
  onMove: (status: PipelineStatus) => void;
}) {
  const task = prospect.tasks?.[0];
  const overdue = isOverdue(task?.dueAt);
  return (
    <article
      className={`${styles.prospectCard} ${moving ? styles.prospectCardMoving : ""}`}
      draggable={!moving}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className={styles.cardTop}>
        <div style={{ minWidth: 0 }}>
          <button className={styles.cardTitle} type="button" onClick={onOpen}>
            {prospect.company || prospect.name}
          </button>
          <div className={styles.cardContact}>{contactLine(prospect)}</div>
        </div>
        <span
          className={styles.score}
          style={{ color: scoreColor(prospect.score) }}
          title={prospect.scoreLabel}
        >
          {prospect.score}
        </span>
      </div>
      <div className={styles.tags}>
        {prospect.trade && <span className={styles.tag}>{prospect.trade}</span>}
        {prospect.city && <span className={styles.tag}>{prospect.city}</span>}
        <span className={styles.tag}>
          {WEBSITE_STATUS_LABELS[prospect.websiteStatus]}
        </span>
      </div>
      {prospect.need && <div className={styles.need}>{prospect.need}</div>}
      {task && (
        <div className={`${styles.nextTask} ${overdue ? styles.overdue : ""}`}>
          {overdue ? "En retard" : "À faire"} · {task.title} ·{" "}
          {formatDate(task.dueAt)}
        </div>
      )}
      <div className={styles.cardFooter}>
        <select
          className={styles.stageSelect}
          aria-label={`Déplacer ${prospect.company || prospect.name}`}
          disabled={moving}
          value={canonicalStatus(prospect.status)}
          onChange={(event) => onMove(event.target.value as PipelineStatus)}
        >
          {PIPELINE_COLUMNS.map((column) => (
            <option key={column.status} value={column.status}>
              {column.label}
            </option>
          ))}
        </select>
        <ListActions>
          <ActionButton onClick={onEdit}>Modifier</ActionButton>
          <ActionButton variant="primary" onClick={onOpen}>
            Ouvrir →
          </ActionButton>
        </ListActions>
      </div>
    </article>
  );
}

function ProspectList({
  prospects,
  movingId,
  onOpen,
  onEdit,
  onMove,
}: {
  prospects: Prospect[];
  movingId: string | null;
  onOpen: (id: string) => void;
  onEdit: (prospect: Prospect) => void;
  onMove: (id: string, status: PipelineStatus) => void;
}) {
  if (!prospects.length) return null;
  return (
    <ListTable
      columns="minmax(230px, 1.3fr) 130px 130px 85px minmax(180px, 1fr) 190px"
      minWidth={1000}
      header={
        <>
          <span>Entreprise / contact</span>
          <span>Étape</span>
          <span>Opportunité web</span>
          <span>Score</span>
          <span>Prochaine action</span>
          <span style={{ textAlign: "right" }}>Actions</span>
        </>
      }
    >
      {prospects.map((prospect) => {
        const task = prospect.tasks?.[0];
        return (
          <ListRow
            key={prospect.id}
            onOpen={() => onOpen(prospect.id)}
            openLabel={`Ouvrir le prospect ${prospect.company || prospect.name}`}
          >
            <div className={styles.tableMain}>
              <div className={styles.tableTitle}>
                {prospect.company || prospect.name}
              </div>
              <div className={styles.tableSub}>
                {contactLine(prospect)}
                {prospect.campaign ? ` · ${prospect.campaign}` : ""}
              </div>
            </div>
            <select
              className={styles.stageSelect}
              disabled={movingId === prospect.id}
              value={canonicalStatus(prospect.status)}
              onChange={(event) =>
                onMove(prospect.id, event.target.value as PipelineStatus)
              }
            >
              {PIPELINE_COLUMNS.map((column) => (
                <option key={column.status} value={column.status}>
                  {column.label}
                </option>
              ))}
            </select>
            <span className={styles.tableText}>
              {WEBSITE_STATUS_LABELS[prospect.websiteStatus]}
            </span>
            <span
              className={styles.score}
              style={{
                color: scoreColor(prospect.score),
                justifySelf: "start",
              }}
            >
              {prospect.score}/100
            </span>
            <span
              className={`${styles.tableText} ${isOverdue(task?.dueAt) ? styles.overdue : ""}`}
            >
              {task ? `${task.title} · ${formatDate(task.dueAt)}` : "Aucune"}
            </span>
            <ListActions>
              <ActionButton onClick={() => onEdit(prospect)}>
                Modifier
              </ActionButton>
              <ActionButton
                variant="primary"
                onClick={() => onOpen(prospect.id)}
              >
                Ouvrir →
              </ActionButton>
            </ListActions>
          </ListRow>
        );
      })}
    </ListTable>
  );
}

function Kpi({
  label,
  value,
  hint,
  color = "var(--white)",
}: {
  label: string;
  value: number;
  hint: string;
  color?: string;
}) {
  return (
    <div className={styles.kpi}>
      <div className={styles.kpiLabel}>{label}</div>
      <div className={styles.kpiValue} style={{ color }}>
        {value}
      </div>
      <div className={styles.kpiHint}>{hint}</div>
    </div>
  );
}

function contactLine(prospect: Prospect) {
  return (
    [
      prospect.name !== prospect.company ? prospect.name : null,
      prospect.email,
      prospect.phone,
    ]
      .filter(Boolean)
      .join(" · ") || SOURCE_LABELS[prospect.source]
  );
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function matchesScore(score: number, filter: ScoreFilter) {
  if (filter === "priority") return score >= 75;
  if (filter === "hot") return score >= 55 && score < 75;
  if (filter === "work") return score >= 35 && score < 55;
  if (filter === "low") return score < 35;
  return true;
}

function isOverdue(value?: string) {
  if (!value) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(value).getTime() < today.getTime();
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  });
}
