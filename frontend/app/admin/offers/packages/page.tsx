"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import {
  ActionButton,
  Badge,
  Empty,
  ErrorMsg,
  Field,
  FormButtons,
  ListActions,
  ListRow,
  ListTable,
  Modal,
  PageHeader,
  TabBar,
  inputStyle,
} from "@/app/admin/components/SharedUI";

const API = "/api";

type CatalogTab = "packs" | "options" | "subscriptions";

interface Pack {
  id: string;
  name: string;
  description?: string;
  price: number;
  devTime?: number;
  position: number;
  active: boolean;
  features: string[];
  includedPages: number;
  includedOptions?: Array<{
    serviceOptionId: string;
    serviceOption?: ServiceOption;
  }>;
}

interface ServiceOption {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  devTime?: number;
  active: boolean;
  recurring: boolean;
  recurringUnit?: string;
}

interface PackForm {
  name: string;
  description: string;
  price: string;
  devTime: string;
  position: string;
  active: boolean;
  features: string;
  includedPages: string;
  includedOptionIds: string[];
}

interface OptionForm {
  name: string;
  description: string;
  price: string;
  devTime: string;
  category: string;
  active: boolean;
  recurring: boolean;
  recurringUnit: string;
}

const EMPTY_PACK: PackForm = {
  name: "",
  description: "",
  price: "",
  devTime: "",
  position: "0",
  active: true,
  features: "",
  includedPages: "0",
  includedOptionIds: [],
};

function emptyOption(recurring: boolean): OptionForm {
  return {
    name: "",
    description: "",
    price: "",
    devTime: "",
    category: recurring ? "abonnement" : "general",
    active: true,
    recurring,
    recurringUnit: recurring ? "mois" : "",
  };
}

export default function PackagesPage() {
  const { apiFetch } = useAuth();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [options, setOptions] = useState<ServiceOption[]>([]);
  const [tab, setTab] = useState<CatalogTab>("packs");
  const [showPackForm, setShowPackForm] = useState(false);
  const [editPack, setEditPack] = useState<string | null>(null);
  const [packForm, setPackForm] = useState<PackForm>(EMPTY_PACK);
  const [showOptionForm, setShowOptionForm] = useState(false);
  const [editOption, setEditOption] = useState<string | null>(null);
  const [optionForm, setOptionForm] = useState<OptionForm>(emptyOption(false));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const oneTimeOptions = useMemo(
    () => options.filter((option) => !option.recurring),
    [options],
  );
  const subscriptions = useMemo(
    () => options.filter((option) => option.recurring),
    [options],
  );
  const visibleServices =
    tab === "subscriptions" ? subscriptions : oneTimeOptions;
  const tabs = [
    { key: "packs", label: "Packs", count: packs.length },
    {
      key: "options",
      label: "Options ponctuelles",
      count: oneTimeOptions.length,
    },
    {
      key: "subscriptions",
      label: "Abonnements",
      count: subscriptions.length,
    },
  ];

  const load = useCallback(async () => {
    const [packResponse, optionResponse] = await Promise.all([
      apiFetch(`${API}/offers/packs`),
      apiFetch(`${API}/offers/options`),
    ]);
    if (packResponse.ok) setPacks(await packResponse.json());
    if (optionResponse.ok) setOptions(await optionResponse.json());
  }, [apiFetch]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreatePack() {
    setEditPack(null);
    setPackForm(EMPTY_PACK);
    setError("");
    setShowPackForm(true);
  }

  function openEditPack(pack: Pack) {
    setEditPack(pack.id);
    setPackForm({
      name: pack.name,
      description: pack.description || "",
      price: String(pack.price),
      devTime: pack.devTime != null ? String(pack.devTime) : "",
      position: String(pack.position),
      active: pack.active,
      features: (pack.features || []).join(", "),
      includedPages: String(pack.includedPages),
      includedOptionIds: (pack.includedOptions || []).map(
        (entry) => entry.serviceOption?.id || entry.serviceOptionId,
      ),
    });
    setError("");
    setShowPackForm(true);
  }

  function openCreateService(recurring: boolean) {
    setEditOption(null);
    setOptionForm(emptyOption(recurring));
    setError("");
    setShowOptionForm(true);
  }

  function openEditService(option: ServiceOption) {
    setEditOption(option.id);
    setOptionForm({
      name: option.name,
      description: option.description || "",
      price: String(option.price),
      devTime: option.devTime != null ? String(option.devTime) : "",
      category: option.category,
      active: option.active,
      recurring: option.recurring,
      recurringUnit: option.recurringUnit || (option.recurring ? "mois" : ""),
    });
    setError("");
    setShowOptionForm(true);
  }

  async function handlePackSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const body = {
      name: packForm.name,
      description: packForm.description || undefined,
      price: parseFloat(packForm.price),
      devTime: packForm.devTime ? parseFloat(packForm.devTime) : 0,
      position: parseInt(packForm.position) || 0,
      active: packForm.active,
      features: packForm.features
        ? packForm.features
            .split(",")
            .map((feature) => feature.trim())
            .filter(Boolean)
        : [],
      includedPages: parseInt(packForm.includedPages) || 0,
      includedOptionIds: packForm.includedOptionIds,
    };
    const response = await apiFetch(
      editPack ? `${API}/offers/packs/${editPack}` : `${API}/offers/packs`,
      {
        method: editPack ? "PUT" : "POST",
        body: JSON.stringify(body),
      },
    );
    if (response.ok) {
      await load();
      setShowPackForm(false);
    } else {
      const data = await response.json().catch(() => ({}));
      setError(data.message || "Enregistrement impossible.");
    }
    setSaving(false);
  }

  async function handleServiceSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const body = {
      name: optionForm.name,
      description: optionForm.description || undefined,
      price: parseFloat(optionForm.price),
      devTime: optionForm.devTime ? parseFloat(optionForm.devTime) : 0,
      category: optionForm.category,
      active: optionForm.active,
      recurring: optionForm.recurring,
      recurringUnit: optionForm.recurring
        ? optionForm.recurringUnit || "mois"
        : undefined,
    };
    const response = await apiFetch(
      editOption
        ? `${API}/offers/options/${editOption}`
        : `${API}/offers/options`,
      {
        method: editOption ? "PUT" : "POST",
        body: JSON.stringify(body),
      },
    );
    if (response.ok) {
      await load();
      setShowOptionForm(false);
    } else {
      const data = await response.json().catch(() => ({}));
      setError(data.message || "Enregistrement impossible.");
    }
    setSaving(false);
  }

  async function togglePack(id: string, active: boolean) {
    await apiFetch(`${API}/offers/packs/${id}`, {
      method: "PUT",
      body: JSON.stringify({ active: !active }),
    });
    await load();
  }

  async function toggleService(id: string, active: boolean) {
    await apiFetch(`${API}/offers/options/${id}`, {
      method: "PUT",
      body: JSON.stringify({ active: !active }),
    });
    await load();
  }

  const count =
    tab === "packs"
      ? packs.length
      : tab === "subscriptions"
        ? subscriptions.length
        : oneTimeOptions.length;
  const creatingSubscription = tab === "subscriptions";

  return (
    <div>
      <PageHeader
        title="Catalogue commercial"
        subtitle="Packs, options ponctuelles et abonnements sont gérés séparément"
        count={count}
        onAdd={
          tab === "packs"
            ? openCreatePack
            : () => openCreateService(creatingSubscription)
        }
        addLabel={
          tab === "packs"
            ? "Nouveau pack"
            : creatingSubscription
              ? "Nouvel abonnement"
              : "Nouvelle option"
        }
      />

      <TabBar
        tabs={tabs}
        activeTab={tab}
        onTabChange={(key) => setTab(key as CatalogTab)}
      />

      {tab === "packs" &&
        (packs.length === 0 ? (
          <Empty>Aucun pack défini</Empty>
        ) : (
          <ListTable
            columns="minmax(240px, 1fr) 150px minmax(200px, .9fr) 100px 100px 190px"
            minWidth={980}
            header={
              <>
                <span>Pack</span>
                <span>Contenu</span>
                <span>Options incluses</span>
                <span>Prix</span>
                <span>Statut</span>
                <span style={{ textAlign: "right" }}>Actions</span>
              </>
            }
          >
            {[...packs]
              .sort((a, b) => a.position - b.position)
              .map((pack) => (
                <ListRow
                  key={pack.id}
                  onOpen={() => openEditPack(pack)}
                  openLabel={`Modifier le pack ${pack.name}`}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        color: "var(--white)",
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      {pack.name}
                    </div>
                    <div
                      style={{
                        marginTop: 2,
                        overflow: "hidden",
                        color: "var(--grey-3)",
                        fontSize: 10,
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {pack.description || "Aucune description"}
                    </div>
                  </div>
                  <span style={{ color: "var(--grey-2)", fontSize: 11 }}>
                    {pack.includedPages} page{pack.includedPages > 1 ? "s" : ""}{" "}
                    · {pack.features?.length || 0} fonctionnalité
                    {pack.features?.length === 1 ? "" : "s"}
                  </span>
                  <span
                    style={{
                      overflow: "hidden",
                      color: (pack.includedOptions || []).length
                        ? "var(--grey-2)"
                        : "var(--grey-3)",
                      fontSize: 11,
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {(pack.includedOptions || []).length
                      ? (pack.includedOptions || [])
                          .map(
                            (entry) =>
                              entry.serviceOption?.name || "Option incluse",
                          )
                          .join(" · ")
                      : "Aucune"}
                  </span>
                  <span
                    style={{
                      color: "var(--gold)",
                      fontSize: 14,
                      fontWeight: 750,
                    }}
                  >
                    {pack.price} €
                  </span>
                  <Badge color={pack.active ? "var(--green)" : "#aaa"}>
                    {pack.active ? "Actif" : "Inactif"}
                  </Badge>
                  <ListActions>
                    <ActionButton
                      variant="primary"
                      onClick={() => openEditPack(pack)}
                    >
                      Modifier
                    </ActionButton>
                    <ActionButton
                      variant={pack.active ? "danger" : "positive"}
                      onClick={() => togglePack(pack.id, pack.active)}
                    >
                      {pack.active ? "Désactiver" : "Activer"}
                    </ActionButton>
                  </ListActions>
                </ListRow>
              ))}
          </ListTable>
        ))}

      {tab !== "packs" &&
        (visibleServices.length === 0 ? (
          <Empty>
            {creatingSubscription
              ? "Aucun abonnement défini"
              : "Aucune option ponctuelle définie"}
          </Empty>
        ) : (
          <ListTable
            columns="minmax(240px, 1fr) 120px 100px 190px"
            minWidth={760}
            header={
              <>
                <span>Option / abonnement</span>
                <span>Prix</span>
                <span>Statut</span>
                <span style={{ textAlign: "right" }}>Actions</span>
              </>
            }
          >
            {visibleServices.map((option) => (
              <ListRow
                key={option.id}
                onOpen={() => openEditService(option)}
                openLabel={`Modifier ${option.name}`}
                style={
                  option.recurring
                    ? { borderColor: "rgba(45,111,255,.28)" }
                    : undefined
                }
              >
                <div>
                  <div
                    style={{
                      color: "var(--white)",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {option.name}
                  </div>
                  <div
                    style={{
                      marginTop: 2,
                      color: "var(--grey-3)",
                      fontSize: 10,
                    }}
                  >
                    {option.description || option.category}
                  </div>
                </div>
                <span
                  style={{
                    color: option.recurring ? "var(--blue)" : "var(--gold)",
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  {option.price} €
                  {option.recurring && (
                    <small
                      style={{
                        display: "block",
                        color: "var(--grey-3)",
                        fontSize: 9,
                        fontWeight: 500,
                      }}
                    >
                      / {option.recurringUnit || "mois"}
                    </small>
                  )}
                </span>
                <Badge color={option.active ? "var(--green)" : "#aaa"}>
                  {option.active ? "Actif" : "Inactif"}
                </Badge>
                <ListActions>
                  <ActionButton
                    variant="primary"
                    onClick={() => openEditService(option)}
                  >
                    Modifier
                  </ActionButton>
                  <ActionButton
                    variant={option.active ? "danger" : "positive"}
                    onClick={() => toggleService(option.id, option.active)}
                  >
                    {option.active ? "Désactiver" : "Activer"}
                  </ActionButton>
                </ListActions>
              </ListRow>
            ))}
          </ListTable>
        ))}

      {showPackForm && (
        <Modal onClose={() => setShowPackForm(false)}>
          <h3
            style={{
              margin: "0 0 20px",
              color: "var(--white)",
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            {editPack ? "Modifier le pack" : "Nouveau pack"}
          </h3>
          {error && <ErrorMsg>{error}</ErrorMsg>}
          <form onSubmit={handlePackSubmit}>
            <Field label="Nom *">
              <input
                required
                style={inputStyle}
                value={packForm.name}
                onChange={(event) =>
                  setPackForm({ ...packForm, name: event.target.value })
                }
              />
            </Field>
            <Field label="Description">
              <textarea
                rows={2}
                style={{ ...inputStyle, resize: "vertical" }}
                value={packForm.description}
                onChange={(event) =>
                  setPackForm({ ...packForm, description: event.target.value })
                }
              />
            </Field>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 12,
              }}
            >
              <Field label="Prix final (€) *">
                <input
                  required
                  type="number"
                  min={0}
                  step="0.01"
                  style={inputStyle}
                  value={packForm.price}
                  onChange={(event) =>
                    setPackForm({ ...packForm, price: event.target.value })
                  }
                />
              </Field>
              <Field label="Production (h)">
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  style={inputStyle}
                  value={packForm.devTime}
                  onChange={(event) =>
                    setPackForm({ ...packForm, devTime: event.target.value })
                  }
                />
              </Field>
              <Field label="Pages incluses">
                <input
                  type="number"
                  min={0}
                  style={inputStyle}
                  value={packForm.includedPages}
                  onChange={(event) =>
                    setPackForm({
                      ...packForm,
                      includedPages: event.target.value,
                    })
                  }
                />
              </Field>
            </div>
            <Field label="Fonctionnalités (séparées par des virgules)">
              <input
                style={inputStyle}
                value={packForm.features}
                onChange={(event) =>
                  setPackForm({ ...packForm, features: event.target.value })
                }
                placeholder="Responsive, SEO, formulaire…"
              />
            </Field>
            <Field label="Options ponctuelles comprises dans le prix">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  padding: 12,
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  background: "var(--black-3)",
                }}
              >
                {oneTimeOptions.map((option) => {
                  const checked = packForm.includedOptionIds.includes(
                    option.id,
                  );
                  return (
                    <label
                      key={option.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        color: checked ? "var(--white)" : "var(--grey-3)",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setPackForm((current) => ({
                            ...current,
                            includedOptionIds: checked
                              ? current.includedOptionIds.filter(
                                  (id) => id !== option.id,
                                )
                              : [...current.includedOptionIds, option.id],
                          }))
                        }
                      />
                      {option.name}
                    </label>
                  );
                })}
              </div>
            </Field>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
                color: "var(--grey-2)",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={packForm.active}
                onChange={(event) =>
                  setPackForm({ ...packForm, active: event.target.checked })
                }
              />
              Pack actif et visible dans le simulateur
            </label>
            <FormButtons
              saving={saving}
              onCancel={() => setShowPackForm(false)}
              submitLabel={editPack ? "Enregistrer" : "Créer le pack"}
            />
          </form>
        </Modal>
      )}

      {showOptionForm && (
        <Modal onClose={() => setShowOptionForm(false)}>
          <h3
            style={{
              margin: "0 0 6px",
              color: "var(--white)",
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            {editOption
              ? `Modifier ${optionForm.recurring ? "l’abonnement" : "l’option"}`
              : optionForm.recurring
                ? "Nouvel abonnement"
                : "Nouvelle option ponctuelle"}
          </h3>
          <p
            style={{
              margin: "0 0 20px",
              color: "var(--grey-3)",
              fontSize: 11,
            }}
          >
            {optionForm.recurring
              ? "Le tarif sera présenté à part dans les devis et facturé selon sa périodicité."
              : "Cette prestation sera ajoutée au montant ponctuel du projet."}
          </p>
          {error && <ErrorMsg>{error}</ErrorMsg>}
          <form onSubmit={handleServiceSubmit}>
            <Field label="Nom *">
              <input
                required
                style={inputStyle}
                value={optionForm.name}
                onChange={(event) =>
                  setOptionForm({ ...optionForm, name: event.target.value })
                }
              />
            </Field>
            <Field label="Description">
              <textarea
                rows={2}
                style={{ ...inputStyle, resize: "vertical" }}
                value={optionForm.description}
                onChange={(event) =>
                  setOptionForm({
                    ...optionForm,
                    description: event.target.value,
                  })
                }
              />
            </Field>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: optionForm.recurring
                  ? "1fr 1fr"
                  : "1fr 1fr 1fr",
                gap: 12,
              }}
            >
              <Field label="Prix final (€) *">
                <input
                  required
                  type="number"
                  min={0}
                  step="0.01"
                  style={inputStyle}
                  value={optionForm.price}
                  onChange={(event) =>
                    setOptionForm({
                      ...optionForm,
                      price: event.target.value,
                    })
                  }
                />
              </Field>
              {optionForm.recurring ? (
                <Field label="Périodicité *">
                  <select
                    required
                    style={inputStyle}
                    value={optionForm.recurringUnit}
                    onChange={(event) =>
                      setOptionForm({
                        ...optionForm,
                        recurringUnit: event.target.value,
                      })
                    }
                  >
                    <option value="mois">Mensuelle</option>
                    <option value="trimestre">Trimestrielle</option>
                    <option value="an">Annuelle</option>
                  </select>
                </Field>
              ) : (
                <Field label="Production (h)">
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    style={inputStyle}
                    value={optionForm.devTime}
                    onChange={(event) =>
                      setOptionForm({
                        ...optionForm,
                        devTime: event.target.value,
                      })
                    }
                  />
                </Field>
              )}
              {!optionForm.recurring && (
                <Field label="Catégorie">
                  <input
                    style={inputStyle}
                    value={optionForm.category}
                    onChange={(event) =>
                      setOptionForm({
                        ...optionForm,
                        category: event.target.value,
                      })
                    }
                    placeholder="seo, design, contenu…"
                  />
                </Field>
              )}
            </div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                margin: "4px 0 16px",
                color: "var(--grey-2)",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={optionForm.active}
                onChange={(event) =>
                  setOptionForm({
                    ...optionForm,
                    active: event.target.checked,
                  })
                }
              />
              {optionForm.recurring ? "Abonnement actif" : "Option active"}
            </label>
            <FormButtons
              saving={saving}
              onCancel={() => setShowOptionForm(false)}
              submitLabel={
                editOption
                  ? "Enregistrer"
                  : optionForm.recurring
                    ? "Créer l’abonnement"
                    : "Créer l’option"
              }
            />
          </form>
        </Modal>
      )}
    </div>
  );
}
