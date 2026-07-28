"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { Badge, Empty, PageHeader, TabBar } from "@/app/admin/components/SharedUI";

const API = "/api";

type Task = {
  id: string;
  title: string;
  description?: string;
  type: string;
  priority: "BASSE" | "NORMALE" | "HAUTE" | "URGENTE";
  status: "A_FAIRE" | "TERMINEE" | "ANNULEE";
  dueAt: string;
  client?: { id: string; company: string };
  lead?: { id: string; name: string; company?: string };
  devis?: { id: string; number: string };
  project?: { id: string; name: string };
  facture?: { id: string; number: string };
};

const TABS = [
  { key: "A_FAIRE", label: "À faire" },
  { key: "TERMINEE", label: "Terminées" },
  { key: "ANNULEE", label: "Annulées" },
];

const TYPE_LABELS: Record<string, string> = {
  APPEL: "Appel",
  EMAIL: "Email",
  RELANCE_DEVIS: "Relance devis",
  PAIEMENT: "Paiement",
  RENDEZ_VOUS: "Rendez-vous",
  CONTENU: "Contenus",
  AUTRE: "Autre",
};

const PRIORITY_COLORS: Record<string, string> = {
  BASSE: "var(--grey-3)",
  NORMALE: "var(--blue)",
  HAUTE: "var(--gold)",
  URGENTE: "#ff6b6b",
};

export default function TasksPage() {
  const { apiFetch } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tab, setTab] = useState("A_FAIRE");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const response = await apiFetch(`${API}/crm/tasks?status=${tab}`);
    if (response.ok) setTasks(await response.json());
    setLoading(false);
  }, [apiFetch, tab]);

  useEffect(() => { load(); }, [load]);

  async function setStatus(id: string, status: Task["status"]) {
    const response = await apiFetch(`${API}/crm/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (response.ok) await load();
  }

  function openContext(task: Task) {
    if (task.project) return router.push(`/admin/crm/projects/${task.project.id}`);
    if (task.devis) return router.push(`/admin/sales/quotes/${task.devis.id}`);
    if (task.facture) return router.push(`/admin/sales/invoices/${task.facture.id}`);
    if (task.client) return router.push(`/admin/crm/clients/${task.client.id}`);
    if (task.lead) return router.push(`/admin/crm/leads/${task.lead.id}`);
  }

  const overdueCount = tasks.filter((task) => new Date(task.dueAt).getTime() < new Date().setHours(0, 0, 0, 0)).length;

  return (
    <div>
      <PageHeader title="Tâches & relances" subtitle={tab === "A_FAIRE" ? `${overdueCount} action${overdueCount !== 1 ? "s" : ""} en retard` : "Historique des actions commerciales"} count={tasks.length} />
      <TabBar tabs={TABS} activeTab={tab} onTabChange={setTab} />

      {loading ? (
        <div style={{ padding: 40, color: "var(--grey-3)", textAlign: "center" }}>Chargement...</div>
      ) : tasks.length === 0 ? (
        <Empty>Aucune tâche dans cette catégorie.</Empty>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {tasks.map((task) => {
            const overdue = task.status === "A_FAIRE" && new Date(task.dueAt).getTime() < new Date().setHours(0, 0, 0, 0);
            const context = task.client?.company || task.lead?.company || task.lead?.name || task.project?.name || "Tâche générale";
            return (
              <div key={task.id} style={{ display: "grid", gridTemplateColumns: "32px 1fr 130px 110px 110px", gap: 12, alignItems: "center", padding: "13px 16px", background: "var(--black-2)", border: `1px solid ${overdue ? "rgba(255,107,107,.35)" : "var(--border)"}`, borderRadius: 8 }}>
                {task.status === "A_FAIRE" ? (
                  <button onClick={() => setStatus(task.id, "TERMINEE")} style={checkButton} title="Terminer">✓</button>
                ) : <span style={{ color: task.status === "TERMINEE" ? "var(--green)" : "var(--grey-3)", textAlign: "center" }}>{task.status === "TERMINEE" ? "✓" : "—"}</span>}
                <button onClick={() => openContext(task)} style={{ background: "none", border: 0, padding: 0, textAlign: "left", cursor: "pointer" }}>
                  <div style={{ fontSize: 13, color: "var(--white)", fontWeight: 650 }}>{task.title}</div>
                  <div style={{ fontSize: 11, color: "var(--grey-3)", marginTop: 3 }}>{context}{task.devis ? ` · ${task.devis.number}` : ""}{task.facture ? ` · ${task.facture.number}` : ""}</div>
                </button>
                <Badge color="var(--blue)">{TYPE_LABELS[task.type] || task.type}</Badge>
                <Badge color={PRIORITY_COLORS[task.priority]}>{task.priority.toLowerCase()}</Badge>
                <span style={{ fontSize: 11, color: overdue ? "#ff6b6b" : "var(--grey-2)", fontWeight: overdue ? 700 : 500 }}>
                  {new Date(task.dueAt).toLocaleDateString("fr-FR")}{overdue ? " · retard" : ""}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const checkButton: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: "50%",
  border: "1px solid var(--border-2)",
  background: "var(--black-3)",
  color: "var(--green)",
  cursor: "pointer",
};
