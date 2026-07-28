"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { Card, Field, inputStyle } from "./SharedUI";

type Context = {
  leadId?: string;
  clientId?: string;
  devisId?: string;
  projectId?: string;
  factureId?: string;
};

type Activity = {
  id: string;
  type: string;
  title: string;
  description?: string;
  createdAt: string;
};

type Task = {
  id: string;
  title: string;
  description?: string;
  type: string;
  priority: string;
  status: string;
  dueAt: string;
};

const API = "/api";

const TASK_TYPES = {
  APPEL: "Appel",
  EMAIL: "Email",
  RELANCE_DEVIS: "Relance devis",
  PAIEMENT: "Paiement",
  RENDEZ_VOUS: "Rendez-vous",
  CONTENU: "Contenus",
  AUTRE: "Autre",
};

export default function CommercialPanel({ context }: { context: Context }) {
  const { apiFetch } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [note, setNote] = useState("");
  const [showTask, setShowTask] = useState(false);
  const [saving, setSaving] = useState(false);
  const [task, setTask] = useState({
    title: "",
    type: "APPEL",
    priority: "NORMALE",
    dueAt: new Date().toISOString().slice(0, 10),
    description: "",
  });

  const query = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(context).forEach(([key, value]) => value && params.set(key, value));
    return params.toString();
  }, [context]);

  const load = useCallback(async () => {
    const [timelineResponse, tasksResponse] = await Promise.all([
      apiFetch(`${API}/crm/timeline?${query}`),
      apiFetch(`${API}/crm/tasks?status=A_FAIRE&${query}`),
    ]);
    if (timelineResponse.ok) setActivities(await timelineResponse.json());
    if (tasksResponse.ok) setTasks(await tasksResponse.json());
  }, [apiFetch, query]);

  useEffect(() => { load(); }, [load]);

  async function addNote() {
    if (!note.trim()) return;
    setSaving(true);
    const response = await apiFetch(`${API}/crm/timeline/notes`, {
      method: "POST",
      body: JSON.stringify({ ...context, body: note.trim() }),
    });
    setSaving(false);
    if (response.ok) {
      setNote("");
      await load();
    }
  }

  async function addTask(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const response = await apiFetch(`${API}/crm/tasks`, {
      method: "POST",
      body: JSON.stringify({
        ...context,
        ...task,
        description: task.description || undefined,
        dueAt: new Date(`${task.dueAt}T12:00:00`).toISOString(),
      }),
    });
    setSaving(false);
    if (response.ok) {
      setTask({ title: "", type: "APPEL", priority: "NORMALE", dueAt: new Date().toISOString().slice(0, 10), description: "" });
      setShowTask(false);
      await load();
    }
  }

  async function completeTask(id: string) {
    const response = await apiFetch(`${API}/crm/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "TERMINEE" }),
    });
    if (response.ok) await load();
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, .8fr) minmax(340px, 1.2fr)", gap: 16, marginTop: 18 }}>
      <Card>
        <div style={sectionHeader}>
          <div>
            <div style={sectionTitle}>Prochaines actions</div>
            <div style={sectionSub}>{tasks.length} tâche{tasks.length !== 1 ? "s" : ""} à faire</div>
          </div>
          <button style={smallButton} onClick={() => setShowTask((value) => !value)}>+ Tâche</button>
        </div>

        {showTask && (
          <form onSubmit={addTask} style={{ paddingBottom: 14, marginBottom: 14, borderBottom: "1px solid var(--border)" }}>
            <Field label="Action">
              <input required style={inputStyle} value={task.title} onChange={(event) => setTask({ ...task, title: event.target.value })} placeholder="Relancer le prospect…" />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Field label="Type">
                <select style={inputStyle} value={task.type} onChange={(event) => setTask({ ...task, type: event.target.value })}>
                  {Object.entries(TASK_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <Field label="Échéance">
                <input required type="date" style={inputStyle} value={task.dueAt} onChange={(event) => setTask({ ...task, dueAt: event.target.value })} />
              </Field>
            </div>
            <button disabled={saving} style={{ ...smallButton, background: "var(--blue)", color: "#fff", borderColor: "var(--blue)" }}>Créer la tâche</button>
          </form>
        )}

        {tasks.length === 0 ? (
          <div style={{ padding: "22px 0", color: "var(--grey-3)", fontSize: 12 }}>Aucune action en attente.</div>
        ) : tasks.map((item) => {
          const overdue = new Date(item.dueAt).getTime() < new Date().setHours(0, 0, 0, 0);
          return (
            <div key={item.id} style={{ display: "grid", gridTemplateColumns: "24px 1fr", gap: 8, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <button title="Marquer comme terminée" onClick={() => completeTask(item.id)} style={checkButton}>✓</button>
              <div>
                <div style={{ fontSize: 12, color: "var(--white)", fontWeight: 600 }}>{item.title}</div>
                <div style={{ fontSize: 10, color: overdue ? "#ff6b6b" : "var(--grey-3)", marginTop: 3 }}>
                  {TASK_TYPES[item.type as keyof typeof TASK_TYPES] || item.type} · {new Date(item.dueAt).toLocaleDateString("fr-FR")}{overdue ? " · En retard" : ""}
                </div>
              </div>
            </div>
          );
        })}
      </Card>

      <Card>
        <div style={sectionHeader}>
          <div>
            <div style={sectionTitle}>Chronologie</div>
            <div style={sectionSub}>Historique commercial centralisé</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input style={inputStyle} value={note} onChange={(event) => setNote(event.target.value)} onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), addNote())} placeholder="Ajouter une note…" />
          <button disabled={saving || !note.trim()} onClick={addNote} style={smallButton}>Ajouter</button>
        </div>
        <div style={{ maxHeight: 420, overflowY: "auto" }}>
          {activities.length === 0 ? (
            <div style={{ padding: "22px 0", color: "var(--grey-3)", fontSize: 12 }}>Aucun événement pour le moment.</div>
          ) : activities.map((activity) => (
            <div key={activity.id} style={{ display: "grid", gridTemplateColumns: "10px 1fr", gap: 10, padding: "9px 0" }}>
              <span style={{ width: 7, height: 7, marginTop: 5, borderRadius: "50%", background: activity.type === "NOTE" ? "var(--gold)" : "var(--blue)" }} />
              <div>
                <div style={{ fontSize: 12, color: "var(--white)", fontWeight: 600 }}>{activity.title}</div>
                {activity.description && <div style={{ fontSize: 11, lineHeight: 1.5, color: "var(--grey-3)", marginTop: 2 }}>{activity.description}</div>}
                <div style={{ fontSize: 10, color: "var(--grey-4)", marginTop: 3 }}>{new Date(activity.createdAt).toLocaleString("fr-FR")}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

const sectionHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 16,
};

const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: "var(--white)" };
const sectionSub: React.CSSProperties = { fontSize: 10, color: "var(--grey-3)", marginTop: 3 };

const smallButton: React.CSSProperties = {
  padding: "7px 10px",
  background: "var(--black-3)",
  border: "1px solid var(--border-2)",
  color: "var(--grey-2)",
  borderRadius: 6,
  cursor: "pointer",
  fontFamily: "var(--font-sans)",
  fontSize: 11,
  whiteSpace: "nowrap",
};

const checkButton: React.CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: "50%",
  border: "1px solid var(--border-2)",
  background: "var(--black-3)",
  color: "var(--green)",
  cursor: "pointer",
};
