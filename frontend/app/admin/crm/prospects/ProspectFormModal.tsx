"use client";

import { useState } from "react";
import {
  ErrorMsg,
  Field,
  FormButtons,
  Modal,
  inputStyle,
} from "@/app/admin/components/SharedUI";
import {
  CANONICAL_STATUSES,
  LeadSource,
  Prospect,
  SOURCE_LABELS,
  STATUS_LABELS,
  WEBSITE_STATUS_LABELS,
  WebsiteStatus,
  canonicalStatus,
} from "./prospect";

const API = "/api";

type Props = {
  prospect?: Prospect | null;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

export default function ProspectFormModal({
  prospect,
  apiFetch,
  onClose,
  onSaved,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    company: prospect?.company || "",
    name: prospect?.name || "",
    email: prospect?.email || "",
    phone: prospect?.phone || "",
    trade: prospect?.trade || "",
    city: prospect?.city || "",
    website: prospect?.website || "",
    websiteStatus: prospect?.websiteStatus || ("INCONNU" as WebsiteStatus),
    need: prospect?.need || "",
    campaign: prospect?.campaign || "",
    budget: prospect?.budget?.toString() || "",
    delayMonths: prospect?.delayMonths?.toString() || "",
    source: prospect?.source || ("MANUEL" as LeadSource),
    status: prospect ? canonicalStatus(prospect.status) : ("NOUVEAU" as const),
    lostReason: prospect?.lostReason || "",
    notes: prospect?.notes || "",
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!form.company.trim() && !form.name.trim()) {
      setError("Renseigne au moins l’entreprise ou le nom du contact.");
      return;
    }
    if (!form.email.trim() && !form.phone.trim() && !form.website.trim()) {
      setError("Ajoute au moins un email, un téléphone ou un site internet.");
      return;
    }

    const optionalText = (value: string) => {
      const clean = value.trim();
      return clean || (prospect ? null : undefined);
    };
    const payload: Record<string, unknown> = {
      company: optionalText(form.company),
      name: optionalText(form.name),
      email: optionalText(form.email),
      phone: optionalText(form.phone),
      trade: optionalText(form.trade),
      city: optionalText(form.city),
      website: optionalText(form.website),
      websiteStatus: form.websiteStatus,
      need: optionalText(form.need),
      campaign: optionalText(form.campaign),
      budget: form.budget ? Number(form.budget) : prospect ? null : undefined,
      delayMonths: form.delayMonths
        ? Number(form.delayMonths)
        : prospect
          ? null
          : undefined,
      status: form.status,
      lostReason:
        form.status === "PERDU" ? optionalText(form.lostReason) : undefined,
      notes: optionalText(form.notes),
    };
    if (!prospect) payload.source = form.source;

    setSaving(true);
    try {
      const response = await apiFetch(
        prospect ? `${API}/crm/leads/${prospect.id}` : `${API}/crm/leads`,
        {
          method: prospect ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = Array.isArray(data.message)
          ? data.message.join(" · ")
          : data.message;
        throw new Error(message || "Enregistrement impossible.");
      }
      await onSaved();
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Enregistrement impossible.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose} maxWidth={860}>
      <h3
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: "var(--white)",
          marginBottom: 4,
        }}
      >
        {prospect ? "Modifier le prospect" : "Nouveau prospect"}
      </h3>
      <p style={{ fontSize: 12, color: "var(--grey-3)", marginBottom: 22 }}>
        Le score est calculé automatiquement à partir des informations
        renseignées.
      </p>
      {error && <ErrorMsg>{error}</ErrorMsg>}
      <form onSubmit={submit}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "0 14px",
          }}
        >
          <Field label="Entreprise">
            <input
              style={inputStyle}
              value={form.company}
              onChange={(event) => set("company", event.target.value)}
            />
          </Field>
          <Field label="Contact">
            <input
              style={inputStyle}
              value={form.name}
              onChange={(event) => set("name", event.target.value)}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              style={inputStyle}
              value={form.email}
              onChange={(event) => set("email", event.target.value)}
            />
          </Field>
          <Field label="Téléphone">
            <input
              style={inputStyle}
              value={form.phone}
              onChange={(event) => set("phone", event.target.value)}
            />
          </Field>
          <Field label="Secteur / métier">
            <input
              style={inputStyle}
              value={form.trade}
              placeholder="Ex. Plombier"
              onChange={(event) => set("trade", event.target.value)}
            />
          </Field>
          <Field label="Ville">
            <input
              style={inputStyle}
              value={form.city}
              onChange={(event) => set("city", event.target.value)}
            />
          </Field>
          <Field label="Site internet">
            <input
              style={inputStyle}
              value={form.website}
              placeholder="https://..."
              onChange={(event) => set("website", event.target.value)}
            />
          </Field>
          <Field label="État du site">
            <select
              style={inputStyle}
              value={form.websiteStatus}
              onChange={(event) => set("websiteStatus", event.target.value)}
            >
              {Object.entries(WEBSITE_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Budget estimé (€)">
            <input
              min="0"
              type="number"
              style={inputStyle}
              value={form.budget}
              onChange={(event) => set("budget", event.target.value)}
            />
          </Field>
          <Field label="Échéance (mois)">
            <input
              min="0"
              type="number"
              style={inputStyle}
              value={form.delayMonths}
              onChange={(event) => set("delayMonths", event.target.value)}
            />
          </Field>
          <Field label="Campagne / liste">
            <input
              style={inputStyle}
              value={form.campaign}
              placeholder="Ex. Artisans Oise — août"
              onChange={(event) => set("campaign", event.target.value)}
            />
          </Field>
          <Field label="Source">
            <select
              disabled={Boolean(prospect)}
              style={inputStyle}
              value={form.source}
              onChange={(event) => set("source", event.target.value)}
            >
              {Object.entries(SOURCE_LABELS)
                .filter(
                  ([value]) => Boolean(prospect) || value !== "IMPORT_CSV",
                )
                .map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Étape du pipeline">
            <select
              style={inputStyle}
              value={form.status}
              onChange={(event) => set("status", event.target.value)}
            >
              {CANONICAL_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Besoin identifié">
          <textarea
            rows={3}
            style={{ ...inputStyle, resize: "vertical" }}
            value={form.need}
            placeholder="Observation concrète et opportunité détectée"
            onChange={(event) => set("need", event.target.value)}
          />
        </Field>
        {form.status === "PERDU" && (
          <Field label="Motif de perte">
            <input
              style={inputStyle}
              value={form.lostReason}
              onChange={(event) => set("lostReason", event.target.value)}
            />
          </Field>
        )}
        <Field label="Notes internes">
          <textarea
            rows={3}
            style={{ ...inputStyle, resize: "vertical" }}
            value={form.notes}
            onChange={(event) => set("notes", event.target.value)}
          />
        </Field>
        <FormButtons
          saving={saving}
          onCancel={onClose}
          submitLabel={prospect ? "Enregistrer" : "Créer le prospect"}
        />
      </form>
    </Modal>
  );
}
