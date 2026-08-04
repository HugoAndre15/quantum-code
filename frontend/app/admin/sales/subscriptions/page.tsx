"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import {
  ActionButton,
  Badge,
  Empty,
  ErrorMsg,
  Field,
  FormButtons,
  KpiCard,
  ListActions,
  ListRow,
  ListTable,
  Modal,
  PageHeader,
  TabBar,
  inputStyle,
} from "@/app/admin/components/SharedUI";

const API = "/api";

type SubType = "MAINTENANCE" | "HEBERGEMENT" | "MAINTENANCE_HEBERGEMENT";
type SubStatus = "ACTIF" | "EN_PAUSE" | "RESILIE";
type SubInterval = "MENSUEL" | "TRIMESTRIEL" | "ANNUEL";

interface Subscription {
  id: string;
  type: SubType;
  status: SubStatus;
  interval: SubInterval;
  amount: number;
  startDate: string;
  nextBillingAt?: string;
  notes?: string;
  client?: { id: string; company: string; contactName: string };
  createdAt: string;
}

const TYPE_COLORS: Record<SubType, string> = {
  MAINTENANCE: "var(--blue)",
  HEBERGEMENT: "var(--gold)",
  MAINTENANCE_HEBERGEMENT: "#9b8ef5",
};
const TYPE_LABELS: Record<SubType, string> = {
  MAINTENANCE: "Maintenance",
  HEBERGEMENT: "Hébergement",
  MAINTENANCE_HEBERGEMENT: "Maintenance + Hébergement",
};
const STATUS_COLORS: Record<SubStatus, string> = {
  ACTIF: "var(--green)",
  EN_PAUSE: "var(--gold)",
  RESILIE: "#ff6b6b",
};
const STATUS_LABELS: Record<SubStatus, string> = {
  ACTIF: "Actif",
  EN_PAUSE: "En pause",
  RESILIE: "Résilié",
};
const INTERVAL_LABELS: Record<SubInterval, string> = {
  MENSUEL: "/ mois",
  TRIMESTRIEL: "/ trim.",
  ANNUEL: "/ an",
};

const TABS = [
  { key: "all", label: "Tous" },
  { key: "ACTIF", label: "Actifs" },
  { key: "EN_PAUSE", label: "En pause" },
  { key: "RESILIE", label: "Résiliés" },
];

export default function SubscriptionsPage() {
  const { apiFetch } = useAuth();
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [clients, setClients] = useState<{ id: string; company: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("ACTIF");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    clientId: "",
    type: "MAINTENANCE" as SubType,
    interval: "MENSUEL" as SubInterval,
    amount: "",
    startDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const load = useCallback(async () => {
    const [subRes, clientRes] = await Promise.all([
      apiFetch(`${API}/sales/subscriptions`),
      apiFetch(`${API}/clients`),
    ]);
    if (subRes.ok) setSubscriptions(await subRes.json());
    if (clientRes.ok) setClients(await clientRes.json());
    setLoading(false);
  }, [apiFetch]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered =
    tab === "all"
      ? subscriptions
      : subscriptions.filter((s) => s.status === tab);
  const tabsWithCounts = TABS.map((t) => ({
    ...t,
    count:
      t.key === "all"
        ? subscriptions.length
        : subscriptions.filter((s) => s.status === t.key).length,
  }));

  const actifs = subscriptions.filter((s) => s.status === "ACTIF");
  const mrr =
    actifs
      .filter((s) => s.interval === "MENSUEL")
      .reduce((sum, s) => sum + s.amount, 0) +
    actifs
      .filter((s) => s.interval === "TRIMESTRIEL")
      .reduce((sum, s) => sum + s.amount / 3, 0) +
    actifs
      .filter((s) => s.interval === "ANNUEL")
      .reduce((sum, s) => sum + s.amount / 12, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = { ...form, amount: Number(form.amount) };
      const res = await apiFetch(`${API}/sales/subscriptions`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Erreur");
      }
      await load();
      setShowModal(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string, status: SubStatus) {
    await apiFetch(`${API}/sales/subscriptions/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Abonnements"
        subtitle="Contrats de maintenance et hébergement récurrents"
        count={actifs.length}
        onAdd={() => {
          setError("");
          setShowModal(true);
        }}
        addLabel="Nouvel abonnement"
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <KpiCard
          label="MRR (revenus mensuels)"
          value={`${mrr.toFixed(0)}€`}
          color="var(--green)"
          sub="Estimé toutes périodes confondues"
        />
        <KpiCard
          label="Abonnements actifs"
          value={actifs.length}
          color="var(--green)"
        />
        <KpiCard
          label="Maintenance"
          value={actifs.filter((s) => s.type !== "HEBERGEMENT").length}
          color="var(--blue)"
        />
        <KpiCard
          label="Hébergement"
          value={actifs.filter((s) => s.type !== "MAINTENANCE").length}
          color="var(--gold)"
        />
      </div>

      <TabBar tabs={tabsWithCounts} activeTab={tab} onTabChange={setTab} />

      {loading ? (
        <div
          style={{ padding: 40, textAlign: "center", color: "var(--grey-3)" }}
        >
          Chargement...
        </div>
      ) : filtered.length === 0 ? (
        <Empty>Aucun abonnement</Empty>
      ) : (
        <ListTable
          columns="minmax(220px, 1fr) minmax(180px, .9fr) 100px 110px 150px 250px"
          minWidth={1050}
          header={
            <>
              <span>Client</span>
              <span>Abonnement</span>
              <span>Statut</span>
              <span>Montant</span>
              <span>Prochaine échéance</span>
              <span style={{ textAlign: "right" }}>Actions</span>
            </>
          }
        >
          {filtered.map((sub) => (
            <ListRow
              key={sub.id}
              onOpen={
                sub.client
                  ? () => router.push(`/admin/crm/clients/${sub.client?.id}`)
                  : undefined
              }
              openLabel={
                sub.client
                  ? `Ouvrir le client ${sub.client.company}`
                  : undefined
              }
            >
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--white)",
                  }}
                >
                  {sub.client?.company || "—"}
                </div>
                <div
                  style={{ fontSize: 11, color: "var(--grey-3)", marginTop: 2 }}
                >
                  {sub.client?.contactName}
                </div>
              </div>
              <Badge color={TYPE_COLORS[sub.type]}>
                {TYPE_LABELS[sub.type]}
              </Badge>
              <Badge color={STATUS_COLORS[sub.status]}>
                {STATUS_LABELS[sub.status]}
              </Badge>
              <span
                style={{ fontSize: 13, fontWeight: 750, color: "var(--green)" }}
              >
                {sub.amount}€{" "}
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: "var(--grey-3)",
                  }}
                >
                  {INTERVAL_LABELS[sub.interval]}
                </span>
              </span>
              <span style={{ fontSize: 11, color: "var(--grey-2)" }}>
                {sub.nextBillingAt
                  ? new Date(sub.nextBillingAt).toLocaleDateString("fr-FR")
                  : "—"}
              </span>
              <ListActions>
                {sub.client && (
                  <ActionButton
                    variant="primary"
                    onClick={() =>
                      router.push(`/admin/crm/clients/${sub.client?.id}`)
                    }
                  >
                    Ouvrir →
                  </ActionButton>
                )}
                {sub.status === "ACTIF" && (
                  <>
                    <ActionButton
                      variant="warning"
                      onClick={() => updateStatus(sub.id, "EN_PAUSE")}
                    >
                      Pause
                    </ActionButton>
                    <ActionButton
                      variant="danger"
                      onClick={() => {
                        if (confirm("Résilier cet abonnement ?"))
                          void updateStatus(sub.id, "RESILIE");
                      }}
                    >
                      Résilier
                    </ActionButton>
                  </>
                )}
                {sub.status === "EN_PAUSE" && (
                  <ActionButton
                    variant="positive"
                    onClick={() => updateStatus(sub.id, "ACTIF")}
                  >
                    Réactiver
                  </ActionButton>
                )}
              </ListActions>
            </ListRow>
          ))}
        </ListTable>
      )}

      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <h3
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "var(--white)",
              marginBottom: 20,
            }}
          >
            Nouvel abonnement
          </h3>
          {error && <ErrorMsg>{error}</ErrorMsg>}
          <form onSubmit={handleSubmit}>
            <Field label="Client *">
              <select
                required
                style={inputStyle}
                value={form.clientId}
                onChange={(e) => setForm({ ...form, clientId: e.target.value })}
              >
                <option value="">-- Choisir un client --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company}
                  </option>
                ))}
              </select>
            </Field>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <Field label="Type *">
                <select
                  style={inputStyle}
                  value={form.type}
                  onChange={(e) =>
                    setForm({ ...form, type: e.target.value as SubType })
                  }
                >
                  {(Object.keys(TYPE_LABELS) as SubType[]).map((k) => (
                    <option key={k} value={k}>
                      {TYPE_LABELS[k]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Fréquence *">
                <select
                  style={inputStyle}
                  value={form.interval}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      interval: e.target.value as SubInterval,
                    })
                  }
                >
                  {(Object.keys(INTERVAL_LABELS) as SubInterval[]).map((k) => (
                    <option key={k} value={k}>
                      {INTERVAL_LABELS[k]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Montant (€) *">
                <input
                  required
                  type="number"
                  min={0}
                  step={0.01}
                  style={inputStyle}
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </Field>
              <Field label="Date de début *">
                <input
                  required
                  type="date"
                  style={inputStyle}
                  value={form.startDate}
                  onChange={(e) =>
                    setForm({ ...form, startDate: e.target.value })
                  }
                />
              </Field>
            </div>
            <Field label="Notes">
              <textarea
                rows={2}
                style={{ ...inputStyle, resize: "vertical" }}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
            <FormButtons
              saving={saving}
              onCancel={() => setShowModal(false)}
              submitLabel="Créer l'abonnement"
            />
          </form>
        </Modal>
      )}
    </div>
  );
}
