"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import {
  Card,
  ErrorMsg,
  Field,
  Modal,
  PageHeader,
  inputStyle,
} from "@/app/admin/components/SharedUI";
import CommercialPanel from "@/app/admin/components/CommercialPanel";

const API = "/api";

type QuoteStatus = "BROUILLON" | "ENVOYE" | "ACCEPTE" | "REFUSE" | "EXPIRE";
type ItemKind = "catalog" | "custom";
type DiscountType = "PERCENTAGE" | "FIXED_VALUE";

interface Pack {
  id: string;
  name: string;
  description?: string;
  price: number;
  devTime: number;
  active: boolean;
}

interface ServiceOption {
  id: string;
  name: string;
  description?: string;
  price: number;
  devTime: number;
  recurring: boolean;
  recurringUnit?: string;
  active: boolean;
}

interface Promotion {
  id: string;
  code: string;
  name: string;
  discountType: DiscountType;
  discountValue: number;
  minAmount?: number | null;
  maxUses?: number | null;
  currentUses: number;
  startDate?: string | null;
  endDate?: string | null;
  active: boolean;
}

interface QuoteItem {
  key: string;
  id?: string;
  kind: ItemKind;
  label: string;
  description: string;
  quantity: number;
  unitPrice: number;
  devTime: number;
  recurring: boolean;
  recurringUnit: string;
  packId?: string;
  serviceOptionId?: string;
}

interface QuoteItemResponse extends Omit<QuoteItem, "key" | "kind"> {
  pack?: Pack | null;
  serviceOption?: ServiceOption | null;
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
  promoCode?: Promotion | null;
  items: QuoteItemResponse[];
  client: { id: string; company: string; contactName: string; email?: string };
  factures?: Array<{
    id: string;
    number: string;
    status: string;
    type: "ACOMPTE" | "SOLDE" | "COMPLETE";
    totalHT: number;
  }>;
  project?: { id: string; name: string; status: string };
}

const STATUS_LABELS: Record<QuoteStatus, string> = {
  BROUILLON: "Brouillon",
  ENVOYE: "Envoyé",
  ACCEPTE: "Accepté",
  REFUSE: "Refusé",
  EXPIRE: "Expiré",
};

let itemSequence = 0;

function createItem(kind: ItemKind, recurring = false): QuoteItem {
  itemSequence += 1;
  return {
    key: `quote-item-${itemSequence}`,
    kind,
    label: "",
    description: "",
    quantity: 1,
    unitPrice: 0,
    devTime: 0,
    recurring,
    recurringUnit: recurring ? "mois" : "",
  };
}

function mapResponseItem(item: QuoteItemResponse): QuoteItem {
  const packId = item.packId || item.pack?.id;
  const serviceOptionId = item.serviceOptionId || item.serviceOption?.id;
  return {
    key: item.id || createItem("custom").key,
    id: item.id,
    kind: packId || serviceOptionId ? "catalog" : "custom",
    label: item.label,
    description: item.description || "",
    quantity: item.quantity || 1,
    unitPrice: item.unitPrice,
    devTime: item.devTime || 0,
    recurring: Boolean(item.recurring),
    recurringUnit: item.recurringUnit || "",
    packId,
    serviceOptionId,
  };
}

function catalogValue(item: QuoteItem) {
  if (item.packId) return `pack:${item.packId}`;
  if (item.serviceOptionId) return `option:${item.serviceOptionId}`;
  return "";
}

function isPromotionAvailable(promotion: Promotion, currentCode: string) {
  if (!promotion.active) return false;
  const now = Date.now();
  if (promotion.startDate && new Date(promotion.startDate).getTime() > now)
    return false;
  if (promotion.endDate && new Date(promotion.endDate).getTime() < now)
    return false;
  if (
    promotion.maxUses != null &&
    promotion.currentUses >= promotion.maxUses &&
    promotion.code !== currentCode
  )
    return false;
  return true;
}

function promotionLabel(promotion: Promotion) {
  const reduction =
    promotion.discountType === "PERCENTAGE"
      ? `${promotion.discountValue}%`
      : `${promotion.discountValue.toFixed(0)} €`;
  return `${promotion.code} — ${promotion.name} (${reduction})`;
}

export default function QuoteEditor({ quoteId }: { quoteId?: string }) {
  const { apiFetch } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<
    Array<{ id: string; company: string; contactName: string }>
  >([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [options, setOptions] = useState<ServiceOption[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [clientId, setClientId] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<QuoteStatus>("BROUILLON");
  const [promoCode, setPromoCode] = useState("");
  const [items, setItems] = useState<QuoteItem[]>([createItem("catalog")]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showFinalize, setShowFinalize] = useState(false);
  const [depositPercentage, setDepositPercentage] = useState("30");
  const [projectName, setProjectName] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [
      clientsResponse,
      packsResponse,
      optionsResponse,
      promotionsResponse,
      quoteResponse,
    ] = await Promise.all([
      apiFetch(`${API}/clients`),
      apiFetch(`${API}/offers/packs`),
      apiFetch(`${API}/offers/options`),
      apiFetch(`${API}/promo-codes`),
      quoteId ? apiFetch(`${API}/devis/${quoteId}`) : Promise.resolve(null),
    ]);

    if (clientsResponse.ok) setClients(await clientsResponse.json());
    if (packsResponse.ok) setPacks(await packsResponse.json());
    if (optionsResponse.ok) setOptions(await optionsResponse.json());
    if (promotionsResponse.ok) setPromotions(await promotionsResponse.json());

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
        setPromoCode(data.promoCode?.code || "");
        setItems(data.items.map(mapResponseItem));
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

  const readOnly = Boolean(quote && quote.status !== "BROUILLON");
  const selectedPromotion = promotions.find(
    (promotion) => promotion.code === promoCode,
  );
  const oneTimeSubtotal = useMemo(
    () =>
      items
        .filter((item) => !item.recurring)
        .reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [items],
  );
  const promotionEligible = Boolean(
    selectedPromotion &&
    isPromotionAvailable(selectedPromotion, quote?.promoCode?.code || "") &&
    (!selectedPromotion.minAmount ||
      oneTimeSubtotal >= selectedPromotion.minAmount),
  );
  const discountAmount = useMemo(() => {
    if (!selectedPromotion || !promotionEligible) return 0;
    return selectedPromotion.discountType === "PERCENTAGE"
      ? Math.round(
          oneTimeSubtotal * (selectedPromotion.discountValue / 100) * 100,
        ) / 100
      : Math.min(selectedPromotion.discountValue, oneTimeSubtotal);
  }, [oneTimeSubtotal, promotionEligible, selectedPromotion]);
  const oneTimeTotal = Math.max(
    0,
    Math.round((oneTimeSubtotal - discountAmount) * 100) / 100,
  );
  const recurringTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const item of items.filter((entry) => entry.recurring)) {
      const unit = item.recurringUnit || "mois";
      totals.set(
        unit,
        (totals.get(unit) || 0) + item.quantity * item.unitPrice,
      );
    }
    return [...totals.entries()];
  }, [items]);
  const recurringSummary = recurringTotals
    .map(([unit, amount]) => `${amount.toFixed(0)} €/${unit}`)
    .join(" + ");
  const selectedCatalogValues = new Set(
    items.map(catalogValue).filter(Boolean),
  );
  const oneTimeEntries = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !item.recurring);
  const subscriptionEntries = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.recurring);

  function updateItem(index: number, patch: Partial<QuoteItem>) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  }

  function selectCatalogItem(
    index: number,
    value: string,
    recurringSection = false,
  ) {
    if (!value) {
      const empty = createItem("catalog", recurringSection);
      updateItem(index, { ...empty, key: items[index].key });
      return;
    }

    const separator = value.indexOf(":");
    const type = value.slice(0, separator);
    const id = value.slice(separator + 1);
    if (type === "pack") {
      const pack = packs.find((entry) => entry.id === id);
      if (!pack) return;
      updateItem(index, {
        kind: "catalog",
        label: `Pack ${pack.name}`,
        description: pack.description || "",
        unitPrice: pack.price,
        devTime: pack.devTime || 0,
        recurring: false,
        recurringUnit: "",
        packId: pack.id,
        serviceOptionId: undefined,
      });
      return;
    }

    const option = options.find((entry) => entry.id === id);
    if (!option) return;
    updateItem(index, {
      kind: "catalog",
      label: option.name,
      description: option.description || "",
      unitPrice: option.price,
      devTime: option.devTime || 0,
      recurring: option.recurring,
      recurringUnit: option.recurring ? option.recurringUnit || "mois" : "",
      packId: undefined,
      serviceOptionId: option.id,
    });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!clientId || oneTimeEntries.length === 0) {
      setError("Choisissez un client et ajoutez au moins une prestation.");
      return;
    }
    if (items.some((item) => item.kind === "catalog" && !catalogValue(item))) {
      setError(
        "Sélectionnez un pack ou une option pour chaque ligne catalogue.",
      );
      return;
    }
    if (items.some((item) => !item.label.trim())) {
      setError("Renseignez le nom de chaque ligne personnalisée.");
      return;
    }
    if (selectedPromotion && !promotionEligible) {
      setError(
        selectedPromotion.minAmount &&
          oneTimeSubtotal < selectedPromotion.minAmount
          ? `La promotion ${selectedPromotion.code} nécessite un montant minimum de ${selectedPromotion.minAmount} €.`
          : "Cette promotion n’est plus disponible.",
      );
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    const cleanItems = items.map((item) => ({
      label: item.label.trim(),
      ...(item.description.trim() && { description: item.description.trim() }),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      devTime: item.devTime,
      recurring: item.recurring,
      ...(item.recurring && { recurringUnit: item.recurringUnit || "mois" }),
      ...(item.packId && { packId: item.packId }),
      ...(item.serviceOptionId && { serviceOptionId: item.serviceOptionId }),
    }));
    const editablePricing = !quote || quote.status === "BROUILLON";
    const response = await apiFetch(
      quoteId ? `${API}/devis/${quoteId}` : `${API}/devis`,
      {
        method: quoteId ? "PUT" : "POST",
        body: JSON.stringify(
          quoteId
            ? {
                status,
                validUntil: validUntil || undefined,
                notes: notes || undefined,
                ...(editablePricing && {
                  items: cleanItems,
                  promoCode: promoCode || null,
                }),
              }
            : {
                clientId,
                validUntil: validUntil || undefined,
                notes: notes || undefined,
                items: cleanItems,
                promoCode: promoCode || undefined,
              },
        ),
      },
    );
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setError(
        Array.isArray(data.message)
          ? data.message.join(", ")
          : data.message || "Enregistrement impossible.",
      );
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
    const response = await apiFetch(`${API}/devis/${quoteId}/${path}`, {
      method: "POST",
    });
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
    const response = await apiFetch(`${API}/devis/${quoteId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.message || "Suppression impossible.");
      return;
    }
    router.push("/admin/sales/quotes");
  }

  async function finalizeQuote(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const response = await apiFetch(
      `${API}/crm/workflow/quotes/${quoteId}/finalize`,
      {
        method: "POST",
        body: JSON.stringify({
          depositPercentage: Number(depositPercentage),
          projectName: projectName.trim() || undefined,
        }),
      },
    );
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setError(data.message || "Finalisation impossible.");
      return;
    }
    setShowFinalize(false);
    setMessage("Projet, acompte et première tâche créés.");
    await load();
  }

  if (loading)
    return (
      <div style={{ padding: 40, color: "var(--grey-3)" }}>Chargement...</div>
    );

  return (
    <div>
      <PageHeader
        title={quote ? quote.number : "Nouveau devis"}
        subtitle={
          quote
            ? `${quote.client.company} · ${quote.totalHT.toFixed(0)} € ponctuel${recurringSummary ? ` · ${recurringSummary}` : ""}`
            : "Créer une proposition commerciale"
        }
      />
      {error && <ErrorMsg>{error}</ErrorMsg>}
      {message && (
        <div style={{ color: "var(--green)", fontSize: 12, marginBottom: 14 }}>
          {message}
        </div>
      )}

      {quote && (
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          <a
            href={`${API}/devis/${quote.id}/pdf`}
            target="_blank"
            style={actionLink}
          >
            Télécharger le PDF
          </a>
          <button
            type="button"
            style={actionButton}
            onClick={() => action("send-email", "Devis PDF envoyé par email.")}
          >
            Envoyer le PDF
          </button>
          <button
            type="button"
            title="Envoie le PDF avec un lien permettant au client d’accepter le devis"
            style={actionButton}
            onClick={() =>
              action(
                "send-accept-token",
                "Devis et lien d’acceptation envoyés.",
              )
            }
          >
            Envoyer avec acceptation
          </button>
          {quote.status === "ACCEPTE" && !quote.project && (
            <button
              type="button"
              style={{
                ...actionButton,
                background: "rgba(93,216,160,.12)",
                color: "var(--green)",
                borderColor: "rgba(93,216,160,.35)",
              }}
              onClick={() => {
                setProjectName(`Site web — ${quote.client.company}`);
                setShowFinalize(true);
              }}
            >
              Finaliser le parcours
            </button>
          )}
          {quote.project && (
            <button
              type="button"
              style={actionButton}
              onClick={() =>
                router.push(`/admin/crm/projects/${quote.project?.id}`)
              }
            >
              Voir le projet
            </button>
          )}
          {quote.factures?.map((invoice) => (
            <button
              type="button"
              key={invoice.id}
              style={actionButton}
              onClick={() => router.push(`/admin/sales/invoices/${invoice.id}`)}
            >
              {invoice.type === "ACOMPTE"
                ? "Acompte"
                : invoice.type === "SOLDE"
                  ? "Solde"
                  : "Facture"}{" "}
              {invoice.number}
            </button>
          ))}
          {quote.status === "ACCEPTE" &&
            quote.factures?.some((invoice) => invoice.type === "ACOMPTE") &&
            !quote.factures?.some((invoice) => invoice.type === "SOLDE") && (
              <button
                type="button"
                style={actionButton}
                onClick={() => action("facture", "Facture de solde créée.")}
              >
                Créer la facture de solde
              </button>
            )}
        </div>
      )}

      <form onSubmit={save}>
        <Card>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 14,
            }}
          >
            <Field label="Client *">
              <select
                required
                disabled={Boolean(quoteId)}
                style={inputStyle}
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
              >
                <option value="">-- Choisir un client --</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.company} — {client.contactName}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Valide jusqu’au">
              <input
                type="date"
                style={inputStyle}
                value={validUntil}
                onChange={(event) => setValidUntil(event.target.value)}
              />
            </Field>
            <Field label="Statut">
              <select
                disabled={!quoteId}
                style={inputStyle}
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as QuoteStatus)
                }
              >
                {(Object.keys(STATUS_LABELS) as QuoteStatus[]).map((value) => (
                  <option key={value} value={value}>
                    {STATUS_LABELS[value]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Promotion">
              <select
                disabled={readOnly}
                style={inputStyle}
                value={promoCode}
                onChange={(event) => setPromoCode(event.target.value)}
              >
                <option value="">Aucune promotion</option>
                {promotions.map((promotion) => (
                  <option
                    key={promotion.id}
                    value={promotion.code}
                    disabled={
                      !isPromotionAvailable(
                        promotion,
                        quote?.promoCode?.code || "",
                      )
                    }
                  >
                    {promotionLabel(promotion)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Notes">
            <textarea
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </Field>
        </Card>

        <div style={{ marginTop: 18 }}>
          <QuoteLinesSection
            title="Prestations ponctuelles"
            description="Packs et options facturés une seule fois. Les tarifs du catalogue restent verrouillés sur la grille active."
            emptyLabel="Ajoutez un pack, une option ou une prestation personnalisée."
            entries={oneTimeEntries}
            readOnly={readOnly}
            recurring={false}
            packs={packs}
            options={options}
            selectedCatalogValues={selectedCatalogValues}
            onAddCatalog={() =>
              setItems((current) => [...current, createItem("catalog")])
            }
            onAddCustom={() =>
              setItems((current) => [...current, createItem("custom")])
            }
            onSelectCatalog={selectCatalogItem}
            onUpdate={updateItem}
            onRemove={(key) =>
              setItems((current) =>
                current.filter((entry) => entry.key !== key),
              )
            }
          />

          <QuoteLinesSection
            title="Abonnements"
            description="Maintenance, hébergement et autres services facturés selon leur propre périodicité."
            emptyLabel="Aucun abonnement ajouté à ce devis."
            entries={subscriptionEntries}
            readOnly={readOnly}
            recurring
            packs={packs}
            options={options}
            selectedCatalogValues={selectedCatalogValues}
            onAddCatalog={() =>
              setItems((current) => [...current, createItem("catalog", true)])
            }
            onAddCustom={() =>
              setItems((current) => [...current, createItem("custom", true)])
            }
            onSelectCatalog={selectCatalogItem}
            onUpdate={updateItem}
            onRemove={(key) =>
              setItems((current) =>
                current.filter((entry) => entry.key !== key),
              )
            }
          />

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: 14,
            }}
          >
            <div
              style={{
                width: "min(100%, 390px)",
                padding: 16,
                border: "1px solid var(--border)",
                borderRadius: 8,
                background: "var(--black-2)",
              }}
            >
              {discountAmount > 0 && (
                <>
                  <SummaryRow
                    label="Sous-total ponctuel"
                    value={`${oneTimeSubtotal.toFixed(2)} €`}
                  />
                  <SummaryRow
                    label={`Promotion ${selectedPromotion?.code}`}
                    value={`−${discountAmount.toFixed(2)} €`}
                    color="var(--green)"
                  />
                </>
              )}
              <SummaryRow
                label="Prix final ponctuel"
                value={`${oneTimeTotal.toFixed(2)} €`}
                strong
              />
              {recurringTotals.map(([unit, amount]) => (
                <SummaryRow
                  key={unit}
                  label={`Abonnement / ${unit}`}
                  value={`${amount.toFixed(2)} €`}
                  color="var(--blue)"
                />
              ))}
              {selectedPromotion?.minAmount &&
                oneTimeSubtotal < selectedPromotion.minAmount && (
                  <div
                    style={{ marginTop: 10, color: "#ffb86b", fontSize: 10 }}
                  >
                    Montant minimum requis pour {selectedPromotion.code} :{" "}
                    {selectedPromotion.minAmount.toFixed(0)} €.
                  </div>
                )}
              {recurringTotals.length > 0 && (
                <div
                  style={{
                    marginTop: 10,
                    paddingTop: 10,
                    borderTop: "1px solid var(--border)",
                    color: "var(--grey-3)",
                    fontSize: 10,
                    lineHeight: 1.45,
                  }}
                >
                  Les abonnements sont affichés séparément du montant payé une
                  seule fois.
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button
            disabled={saving}
            type="submit"
            style={{
              ...actionButton,
              background: "var(--blue)",
              color: "#fff",
              borderColor: "var(--blue)",
            }}
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
          <button
            type="button"
            style={actionButton}
            onClick={() => router.push("/admin/sales/quotes")}
          >
            Retour
          </button>
          {quoteId && (
            <button
              type="button"
              style={{
                ...actionButton,
                marginLeft: "auto",
                color: "#ff6b6b",
                borderColor: "rgba(255,107,107,.35)",
              }}
              onClick={remove}
            >
              Supprimer
            </button>
          )}
        </div>
      </form>

      {quote && (
        <CommercialPanel
          context={{ clientId: quote.clientId, devisId: quote.id }}
        />
      )}

      {showFinalize && quote && (
        <Modal onClose={() => setShowFinalize(false)} maxWidth={520}>
          <h3
            style={{ fontSize: 17, color: "var(--white)", margin: "0 0 6px" }}
          >
            Finaliser le devis accepté
          </h3>
          <p
            style={{
              fontSize: 12,
              lineHeight: 1.6,
              color: "var(--grey-3)",
              margin: "0 0 20px",
            }}
          >
            Le CRM va créer le projet, préparer la facture d&apos;acompte et
            planifier le rendez-vous de lancement. Cette action est réutilisable
            sans créer de doublons.
          </p>
          <form onSubmit={finalizeQuote}>
            <Field label="Nom du projet">
              <input
                required
                style={inputStyle}
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
              />
            </Field>
            <Field label="Acompte (%)">
              <input
                required
                type="number"
                min={0}
                max={100}
                step={1}
                style={inputStyle}
                value={depositPercentage}
                onChange={(event) => setDepositPercentage(event.target.value)}
              />
            </Field>
            <div
              style={{
                padding: 12,
                background: "var(--black-3)",
                border: "1px solid var(--border)",
                borderRadius: 7,
                color: "var(--grey-2)",
                fontSize: 12,
              }}
            >
              Facture prévue :{" "}
              <strong style={{ color: "var(--gold)" }}>
                {(
                  quote.totalHT *
                  (Number(depositPercentage || 0) / 100)
                ).toFixed(2)}{" "}
                €
              </strong>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 18,
              }}
            >
              <button
                type="button"
                style={actionButton}
                onClick={() => setShowFinalize(false)}
              >
                Annuler
              </button>
              <button
                disabled={saving}
                style={{
                  ...actionButton,
                  background: "var(--green)",
                  borderColor: "var(--green)",
                  color: "#111",
                }}
              >
                {saving ? "Finalisation…" : "Confirmer"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function QuoteLinesSection({
  title,
  description,
  emptyLabel,
  entries,
  readOnly,
  recurring,
  packs,
  options,
  selectedCatalogValues,
  onAddCatalog,
  onAddCustom,
  onSelectCatalog,
  onUpdate,
  onRemove,
}: {
  title: string;
  description: string;
  emptyLabel: string;
  entries: Array<{ item: QuoteItem; index: number }>;
  readOnly: boolean;
  recurring: boolean;
  packs: Pack[];
  options: ServiceOption[];
  selectedCatalogValues: Set<string>;
  onAddCatalog: () => void;
  onAddCustom: () => void;
  onSelectCatalog: (
    index: number,
    value: string,
    recurringSection?: boolean,
  ) => void;
  onUpdate: (index: number, patch: Partial<QuoteItem>) => void;
  onRemove: (key: string) => void;
}) {
  const catalogOptions = options.filter(
    (option) => option.recurring === recurring,
  );

  return (
    <section
      style={{
        marginBottom: recurring ? 0 : 20,
        padding: 16,
        border: `1px solid ${
          recurring ? "rgba(45,111,255,.22)" : "var(--border)"
        }`,
        borderRadius: 10,
        background: recurring
          ? "linear-gradient(120deg, rgba(45,111,255,.055), transparent 45%)"
          : "transparent",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 15, color: "var(--white)" }}>
              {title}
            </h2>
            {recurring && (
              <span
                style={{
                  padding: "2px 7px",
                  borderRadius: 999,
                  color: "var(--blue)",
                  background: "rgba(45,111,255,.1)",
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                À part
              </span>
            )}
          </div>
          <div
            style={{
              maxWidth: 660,
              marginTop: 4,
              color: "var(--grey-3)",
              fontSize: 11,
              lineHeight: 1.45,
            }}
          >
            {description}
          </div>
        </div>
        {!readOnly && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" style={actionButton} onClick={onAddCatalog}>
              {recurring ? "+ Ajouter un abonnement" : "+ Ajouter du catalogue"}
            </button>
            <button type="button" style={actionButton} onClick={onAddCustom}>
              {recurring
                ? "+ Abonnement personnalisé"
                : "+ Prestation personnalisée"}
            </button>
          </div>
        )}
      </div>

      {entries.length === 0 ? (
        <div
          style={{
            padding: 22,
            border: "1px dashed var(--border-2)",
            borderRadius: 8,
            color: "var(--grey-3)",
            textAlign: "center",
            fontSize: 11,
          }}
        >
          {emptyLabel}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          {entries.map(({ item, index }) => {
            const value = catalogValue(item);
            return (
              <div
                key={item.key}
                style={{
                  minWidth: 920,
                  display: "grid",
                  gridTemplateColumns:
                    "minmax(190px,2fr) minmax(200px,2fr) 70px 105px 115px 95px 34px",
                  gap: 8,
                  alignItems: "center",
                  padding: 10,
                  marginBottom: 8,
                  border: `1px solid ${
                    recurring ? "rgba(45,111,255,.18)" : "var(--border)"
                  }`,
                  borderRadius: 8,
                  background: "var(--black-2)",
                }}
              >
                {item.kind === "catalog" ? (
                  <select
                    disabled={readOnly}
                    required
                    style={inputStyle}
                    value={value}
                    onChange={(event) =>
                      onSelectCatalog(index, event.target.value, recurring)
                    }
                  >
                    <option value="">
                      {recurring
                        ? "-- Choisir un abonnement --"
                        : "-- Choisir un pack ou une option --"}
                    </option>
                    {!recurring && (
                      <optgroup label="Packs">
                        {packs.map((pack) => {
                          const optionValue = `pack:${pack.id}`;
                          return (
                            <option
                              key={pack.id}
                              value={optionValue}
                              disabled={
                                !pack.active ||
                                (selectedCatalogValues.has(optionValue) &&
                                  value !== optionValue)
                              }
                            >
                              {pack.name} — {pack.price.toFixed(0)} €
                            </option>
                          );
                        })}
                      </optgroup>
                    )}
                    <optgroup
                      label={recurring ? "Abonnements" : "Options ponctuelles"}
                    >
                      {catalogOptions.map((option) => {
                        const optionValue = `option:${option.id}`;
                        return (
                          <option
                            key={option.id}
                            value={optionValue}
                            disabled={
                              !option.active ||
                              (selectedCatalogValues.has(optionValue) &&
                                value !== optionValue)
                            }
                          >
                            {option.name} — {option.price.toFixed(0)} €
                            {recurring
                              ? `/${option.recurringUnit || "mois"}`
                              : ""}
                          </option>
                        );
                      })}
                    </optgroup>
                  </select>
                ) : (
                  <input
                    disabled={readOnly}
                    required
                    style={inputStyle}
                    value={item.label}
                    onChange={(event) =>
                      onUpdate(index, { label: event.target.value })
                    }
                    placeholder={
                      recurring
                        ? "Abonnement personnalisé"
                        : "Prestation personnalisée"
                    }
                  />
                )}

                {item.kind === "catalog" ? (
                  <div
                    style={{
                      padding: "0 6px",
                      color: "var(--grey-3)",
                      fontSize: 11,
                      lineHeight: 1.4,
                    }}
                  >
                    {item.description ||
                      (recurring
                        ? "Sélectionnez un abonnement."
                        : "Sélectionnez une prestation.")}
                  </div>
                ) : (
                  <input
                    disabled={readOnly}
                    style={inputStyle}
                    value={item.description}
                    onChange={(event) =>
                      onUpdate(index, { description: event.target.value })
                    }
                    placeholder="Description"
                  />
                )}

                <input
                  aria-label={`Quantité ${index + 1}`}
                  disabled={readOnly}
                  type="number"
                  min={1}
                  step={1}
                  style={inputStyle}
                  value={item.quantity}
                  onChange={(event) =>
                    onUpdate(index, {
                      quantity: Math.max(1, Number(event.target.value)),
                    })
                  }
                />

                {item.kind === "catalog" ? (
                  <div
                    style={{
                      padding: "8px 10px",
                      color: "var(--white)",
                      fontSize: 12,
                      textAlign: "right",
                    }}
                  >
                    {item.unitPrice.toFixed(2)} €
                  </div>
                ) : (
                  <input
                    aria-label={`Prix unitaire ${index + 1}`}
                    disabled={readOnly}
                    type="number"
                    min={0}
                    step={0.01}
                    style={inputStyle}
                    value={item.unitPrice}
                    onChange={(event) =>
                      onUpdate(index, {
                        unitPrice: Math.max(0, Number(event.target.value)),
                      })
                    }
                  />
                )}

                {recurring && item.kind === "custom" ? (
                  <select
                    aria-label={`Périodicité ${index + 1}`}
                    disabled={readOnly}
                    style={inputStyle}
                    value={item.recurringUnit || "mois"}
                    onChange={(event) =>
                      onUpdate(index, {
                        recurring: true,
                        recurringUnit: event.target.value,
                      })
                    }
                  >
                    <option value="mois">Mensuel</option>
                    <option value="trimestre">Trimestriel</option>
                    <option value="an">Annuel</option>
                  </select>
                ) : (
                  <div
                    style={{
                      color: recurring ? "var(--blue)" : "var(--grey-3)",
                      fontSize: 11,
                      textAlign: "center",
                    }}
                  >
                    {recurring
                      ? `/${item.recurringUnit || "mois"}`
                      : "Ponctuel"}
                  </div>
                )}

                <div
                  style={{
                    color: recurring ? "var(--blue)" : "var(--gold)",
                    fontSize: 13,
                    fontWeight: 700,
                    textAlign: "right",
                  }}
                >
                  {(item.quantity * item.unitPrice).toFixed(0)} €
                  {recurring && (
                    <span
                      style={{
                        display: "block",
                        color: "var(--grey-3)",
                        fontSize: 9,
                      }}
                    >
                      / {item.recurringUnit || "mois"}
                    </span>
                  )}
                </div>

                <button
                  aria-label={`Supprimer la ligne ${index + 1}`}
                  disabled={readOnly}
                  type="button"
                  onClick={() => onRemove(item.key)}
                  style={{
                    border: 0,
                    color: "#ff6b6b",
                    background: "transparent",
                    cursor: readOnly ? "not-allowed" : "pointer",
                    fontSize: 18,
                  }}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SummaryRow({
  label,
  value,
  color = "var(--white)",
  strong = false,
}: {
  label: string;
  value: string;
  color?: string;
  strong?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 16,
        padding: strong ? "9px 0" : "5px 0",
        borderTop: strong ? "1px solid var(--border)" : undefined,
      }}
    >
      <span
        style={{
          color: strong ? "var(--white)" : "var(--grey-3)",
          fontSize: strong ? 13 : 11,
          fontWeight: strong ? 700 : 400,
        }}
      >
        {label}
      </span>
      <strong style={{ color, fontSize: strong ? 16 : 12 }}>{value}</strong>
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
