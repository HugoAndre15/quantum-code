"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import {
  Card,
  ErrorMsg,
  Field,
  PageHeader,
  inputStyle,
} from "@/app/admin/components/SharedUI";

const API = "/api";

type QuoteStatus = "BROUILLON" | "ENVOYE" | "ACCEPTE" | "REFUSE" | "EXPIRE";

interface QuoteItem {
  id?: string;
  label: string;
  description: string;
  quantity: number;
  unitPrice: number;
  devTime: number;
  recurring: boolean;
  recurringUnit: string;
}

interface Quote {
  id: string;
  number: string;
  clientId: string;
  status: QuoteStatus;
  validUntil?: string;
  notes?: string;
  totalHT: number;
  discountAmount: number;
  items: QuoteItem[];
  client: { id: string; company: string; contactName: string; email?: string };
  facture?: { id: string; number: string; status: string };
}

const STATUS_LABELS: Record<QuoteStatus, string> = {
  BROUILLON: "Brouillon",
  ENVOYE: "Envoyé",
  ACCEPTE: "Accepté",
  REFUSE: "Refusé",
  EXPIRE: "Expiré",
};

const EMPTY_ITEM: QuoteItem = {
  label: "",
  description: "",
  quantity: 1,
  unitPrice: 0,
  devTime: 0,
  recurring: false,
  recurringUnit: "",
};

export default function QuoteEditor({ quoteId }: { quoteId?: string }) {
  const { apiFetch } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<Array<{ id: string; company: string; contactName: string }>>([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [clientId, setClientId] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<QuoteStatus>("BROUILLON");
  const [items, setItems] = useState<QuoteItem[]>([{ ...EMPTY_ITEM }]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const requests = [apiFetch(`${API}/clients`)];
    if (quoteId) requests.push(apiFetch(`${API}/devis/${quoteId}`));
    const [clientsResponse, quoteResponse] = await Promise.all(requests);
    if (clientsResponse.ok) setClients(await clientsResponse.json());
    if (quoteId && quoteResponse) {
      if (!quoteResponse.ok) {
        setError("Devis introuvable.");
      } else {
        const data: Quote = await quoteResponse.json();
        setQuote(data);
        setClientId(data.clientId);
        setValidUntil(data.validUntil ? data.validUntil.slice(0, 10) : "");
        setNotes(data.notes || "");
        setStatus(data.status);
        setItems(data.items.map((item) => ({
          ...item,
          description: item.description || "",
          devTime: item.devTime || 0,
          recurringUnit: item.recurringUnit || "",
        })));
      }
    } else {
      const date = new Date();
      date.setDate(date.getDate() + 30);
      setValidUntil(date.toISOString().slice(0, 10));
    }
    setLoading(false);
  }, [apiFetch, quoteId]);

  useEffect(() => {
    load();
  }, [load]);

  const total = useMemo(
    () => items.filter((item) => !item.recurring).reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [items],
  );

  function updateItem(index: number, patch: Partial<QuoteItem>) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!clientId || items.some((item) => !item.label.trim())) {
      setError("Choisissez un client et renseignez chaque ligne.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    const cleanItems = items.map(({ id: _id, ...item }) => ({
      ...item,
      description: item.description || undefined,
      recurringUnit: item.recurringUnit || undefined,
    }));
    const response = await apiFetch(quoteId ? `${API}/devis/${quoteId}` : `${API}/devis`, {
      method: quoteId ? "PUT" : "POST",
      body: JSON.stringify(quoteId
        ? { status, validUntil: validUntil || undefined, notes: notes || undefined, ...(status === "BROUILLON" && { items: cleanItems }) }
        : { clientId, validUntil: validUntil || undefined, notes: notes || undefined, items: cleanItems }),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setError(Array.isArray(data.message) ? data.message.join(", ") : data.message || "Enregistrement impossible.");
      return;
    }
    if (!quoteId) {
      router.push(`/admin/sales/quotes/${data.id}`);
      return;
    }
    setMessage("Devis enregistré.");
    await load();
  }

  async function action(path: string, success: string) {
    setError("");
    setMessage("");
    const response = await apiFetch(`${API}/devis/${quoteId}/${path}`, { method: "POST" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.message || "Action impossible.");
      return;
    }
    setMessage(success);
    await load();
  }

  async function remove() {
    if (!quoteId || !confirm("Supprimer définitivement ce devis ?")) return;
    const response = await apiFetch(`${API}/devis/${quoteId}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.message || "Suppression impossible.");
      return;
    }
    router.push("/admin/sales/quotes");
  }

  if (loading) return <div style={{ padding: 40, color: "var(--grey-3)" }}>Chargement...</div>;

  return (
    <div>
      <PageHeader
        title={quote ? quote.number : "Nouveau devis"}
        subtitle={quote ? `${quote.client.company} · ${quote.totalHT.toFixed(0)} € HT` : "Créer une proposition commerciale"}
      />
      {error && <ErrorMsg>{error}</ErrorMsg>}
      {message && <div style={{ color: "var(--green)", fontSize: 12, marginBottom: 14 }}>{message}</div>}

      {quote && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <a href={`${API}/devis/${quote.id}/pdf`} target="_blank" style={actionLink}>Télécharger le PDF</a>
          <button style={actionButton} onClick={() => action("send-email", "Devis envoyé par email.")}>Envoyer le PDF</button>
          <button style={actionButton} onClick={() => action("send-accept-token", "Lien d’acceptation envoyé.")}>Envoyer pour signature</button>
          {quote.status === "ACCEPTE" && !quote.facture && (
            <button style={actionButton} onClick={() => action("facture", "Facture créée.")}>Créer la facture</button>
          )}
          {quote.facture && (
            <button style={actionButton} onClick={() => router.push(`/admin/sales/invoices/${quote.facture?.id}`)}>
              Voir {quote.facture.number}
            </button>
          )}
        </div>
      )}

      <form onSubmit={save}>
        <Card>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 14 }}>
            <Field label="Client *">
              <select required disabled={Boolean(quoteId)} style={inputStyle} value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">-- Choisir un client --</option>
                {clients.map((client) => <option key={client.id} value={client.id}>{client.company} — {client.contactName}</option>)}
              </select>
            </Field>
            <Field label="Valide jusqu’au">
              <input type="date" style={inputStyle} value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </Field>
            <Field label="Statut">
              <select disabled={!quoteId} style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value as QuoteStatus)}>
                {(Object.keys(STATUS_LABELS) as QuoteStatus[]).map((value) => <option key={value} value={value}>{STATUS_LABELS[value]}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Notes">
            <textarea rows={3} style={{ ...inputStyle, resize: "vertical" }} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </Card>

        <div style={{ marginTop: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h2 style={{ margin: 0, fontSize: 15, color: "var(--white)" }}>Lignes du devis</h2>
            {(!quote || quote.status === "BROUILLON") && (
              <button type="button" style={actionButton} onClick={() => setItems([...items, { ...EMPTY_ITEM }])}>+ Ajouter une ligne</button>
            )}
          </div>
          {items.map((item, index) => (
            <div key={item.id || index} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 80px 110px 90px 34px", gap: 8, padding: 10, marginBottom: 8, border: "1px solid var(--border)", borderRadius: 8, background: "var(--black-2)" }}>
              <input disabled={Boolean(quote && quote.status !== "BROUILLON")} required style={inputStyle} value={item.label} onChange={(e) => updateItem(index, { label: e.target.value })} placeholder="Prestation" />
              <input disabled={Boolean(quote && quote.status !== "BROUILLON")} style={inputStyle} value={item.description} onChange={(e) => updateItem(index, { description: e.target.value })} placeholder="Description" />
              <input disabled={Boolean(quote && quote.status !== "BROUILLON")} type="number" min={1} style={inputStyle} value={item.quantity} onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })} />
              <input disabled={Boolean(quote && quote.status !== "BROUILLON")} type="number" min={0} step={0.01} style={inputStyle} value={item.unitPrice} onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value) })} />
              <div style={{ alignSelf: "center", textAlign: "right", fontSize: 13, fontWeight: 700, color: "var(--gold)" }}>{(item.quantity * item.unitPrice).toFixed(0)} €</div>
              <button disabled={Boolean(quote && quote.status !== "BROUILLON") || items.length === 1} type="button" onClick={() => setItems(items.filter((_, itemIndex) => itemIndex !== index))} style={{ background: "transparent", border: 0, color: "#ff6b6b", cursor: "pointer" }}>×</button>
            </div>
          ))}
          <div style={{ textAlign: "right", fontSize: 20, fontWeight: 800, color: "var(--white)", marginTop: 14 }}>Total : <span style={{ color: "var(--gold)" }}>{total.toFixed(0)} € HT</span></div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button disabled={saving} type="submit" style={{ ...actionButton, background: "var(--blue)", color: "#fff", borderColor: "var(--blue)" }}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
          <button type="button" style={actionButton} onClick={() => router.push("/admin/sales/quotes")}>Retour</button>
          {quoteId && <button type="button" style={{ ...actionButton, marginLeft: "auto", color: "#ff6b6b", borderColor: "rgba(255,107,107,.35)" }} onClick={remove}>Supprimer</button>}
        </div>
      </form>
    </div>
  );
}

const actionButton: React.CSSProperties = {
  padding: "8px 12px",
  background: "var(--black-3)",
  border: "1px solid var(--border-2)",
  color: "var(--grey-2)",
  borderRadius: 6,
  cursor: "pointer",
  fontFamily: "var(--font-sans)",
  fontSize: 12,
};

const actionLink: React.CSSProperties = {
  ...actionButton,
  display: "inline-flex",
  textDecoration: "none",
};
