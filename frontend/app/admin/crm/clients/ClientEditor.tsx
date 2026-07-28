"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import {
  Card,
  ErrorMsg,
  Field,
  FormButtons,
  PageHeader,
  inputStyle,
} from "@/app/admin/components/SharedUI";

const API = "/api";

type ClientStatus =
  | "A_CONTACTER"
  | "CONTACTE"
  | "DEVIS"
  | "FACTURE"
  | "EN_COURS"
  | "TERMINE"
  | "REFUSE";

interface ClientForm {
  company: string;
  trade: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  status: ClientStatus;
  budget: string;
  notes: string;
}

interface ClientDetails extends Omit<ClientForm, "budget"> {
  id: string;
  budget?: number;
  devis?: Array<{ id: string; number: string; status: string; totalHT: number }>;
  factures?: Array<{ id: string; number: string; status: string; totalHT: number }>;
}

const EMPTY: ClientForm = {
  company: "",
  trade: "",
  contactName: "",
  email: "",
  phone: "",
  address: "",
  website: "",
  status: "A_CONTACTER",
  budget: "",
  notes: "",
};

const STATUS_LABELS: Record<ClientStatus, string> = {
  A_CONTACTER: "À contacter",
  CONTACTE: "Contacté",
  DEVIS: "Devis",
  FACTURE: "Facturé",
  EN_COURS: "En cours",
  TERMINE: "Terminé",
  REFUSE: "Refusé",
};

export default function ClientEditor({ clientId }: { clientId?: string }) {
  const { apiFetch } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<ClientForm>(EMPTY);
  const [details, setDetails] = useState<ClientDetails | null>(null);
  const [loading, setLoading] = useState(Boolean(clientId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!clientId) return;
    const response = await apiFetch(`${API}/clients/${clientId}`);
    if (!response.ok) {
      setError("Client introuvable.");
      setLoading(false);
      return;
    }
    const client: ClientDetails = await response.json();
    setDetails(client);
    setForm({
      company: client.company || "",
      trade: client.trade || "",
      contactName: client.contactName || "",
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || "",
      website: client.website || "",
      status: client.status || "A_CONTACTER",
      budget: client.budget ? String(client.budget) : "",
      notes: client.notes || "",
    });
    setLoading(false);
  }, [apiFetch, clientId]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      ...form,
      email: form.email || undefined,
      phone: form.phone || undefined,
      address: form.address || undefined,
      website: form.website || undefined,
      notes: form.notes || undefined,
      budget: form.budget ? Number(form.budget) : undefined,
    };
    const response = await apiFetch(
      clientId ? `${API}/clients/${clientId}` : `${API}/clients`,
      {
        method: clientId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      },
    );
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setError(Array.isArray(data.message) ? data.message.join(", ") : data.message || "Enregistrement impossible.");
      return;
    }
    router.push(`/admin/crm/clients/${data.id}`);
    router.refresh();
  }

  async function remove() {
    if (!clientId || !confirm("Supprimer ce client et ses données commerciales liées ?")) return;
    const response = await apiFetch(`${API}/clients/${clientId}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.message || "Suppression impossible.");
      return;
    }
    router.push("/admin/crm/clients");
  }

  if (loading) {
    return <div style={{ padding: 40, color: "var(--grey-3)" }}>Chargement...</div>;
  }

  return (
    <div>
      <PageHeader
        title={clientId ? form.company || "Client" : "Nouveau client"}
        subtitle={clientId ? "Fiche client et historique commercial" : "Créer une fiche dans le CRM"}
      />
      {error && <ErrorMsg>{error}</ErrorMsg>}
      <Card>
        <form onSubmit={submit}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
            <Field label="Entreprise *">
              <input required style={inputStyle} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </Field>
            <Field label="Secteur *">
              <input required style={inputStyle} value={form.trade} onChange={(e) => setForm({ ...form, trade: e.target.value })} placeholder="Restaurant, artisan, association…" />
            </Field>
            <Field label="Nom du contact *">
              <input required style={inputStyle} value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
            </Field>
            <Field label="Statut">
              <select style={inputStyle} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ClientStatus })}>
                {(Object.keys(STATUS_LABELS) as ClientStatus[]).map((status) => (
                  <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                ))}
              </select>
            </Field>
            <Field label="Email">
              <input type="email" style={inputStyle} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Téléphone">
              <input style={inputStyle} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Site actuel">
              <input type="url" style={inputStyle} value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://…" />
            </Field>
            <Field label="Budget estimé (€)">
              <input type="number" min={0} style={inputStyle} value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
            </Field>
          </div>
          <Field label="Adresse">
            <input style={inputStyle} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </Field>
          <Field label="Notes">
            <textarea rows={4} style={{ ...inputStyle, resize: "vertical" }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <FormButtons saving={saving} onCancel={() => router.push("/admin/crm/clients")} submitLabel={clientId ? "Enregistrer" : "Créer le client"} />
        </form>
      </Card>

      {clientId && details && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 18 }}>
          <Card>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--white)", marginBottom: 12 }}>Devis</div>
            {details.devis?.length ? details.devis.map((quote) => (
              <button key={quote.id} onClick={() => router.push(`/admin/sales/quotes/${quote.id}`)} style={{ display: "flex", width: "100%", justifyContent: "space-between", padding: "9px 10px", marginBottom: 6, background: "var(--black-3)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--grey-2)", cursor: "pointer" }}>
                <span>{quote.number}</span><span>{quote.totalHT.toFixed(0)} €</span>
              </button>
            )) : <div style={{ fontSize: 12, color: "var(--grey-3)" }}>Aucun devis</div>}
          </Card>
          <Card>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--white)", marginBottom: 12 }}>Factures</div>
            {details.factures?.length ? details.factures.map((invoice) => (
              <button key={invoice.id} onClick={() => router.push(`/admin/sales/invoices/${invoice.id}`)} style={{ display: "flex", width: "100%", justifyContent: "space-between", padding: "9px 10px", marginBottom: 6, background: "var(--black-3)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--grey-2)", cursor: "pointer" }}>
                <span>{invoice.number}</span><span>{invoice.totalHT.toFixed(0)} €</span>
              </button>
            )) : <div style={{ fontSize: 12, color: "var(--grey-3)" }}>Aucune facture</div>}
          </Card>
        </div>
      )}

      {clientId && (
        <button onClick={remove} style={{ marginTop: 20, padding: "9px 14px", border: "1px solid rgba(255,107,107,.35)", background: "rgba(255,107,107,.08)", color: "#ff6b6b", borderRadius: 6, cursor: "pointer" }}>
          Supprimer le client
        </button>
      )}
    </div>
  );
}
