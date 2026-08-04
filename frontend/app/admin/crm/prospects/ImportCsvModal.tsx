"use client";

import { useMemo, useState } from "react";
import {
  ErrorMsg,
  Field,
  Modal,
  inputStyle,
} from "@/app/admin/components/SharedUI";
import { WEBSITE_STATUS_LABELS, WebsiteStatus } from "./prospect";

const API = "/api";

type FieldKey =
  | "company"
  | "name"
  | "email"
  | "phone"
  | "trade"
  | "city"
  | "website"
  | "websiteStatus"
  | "need"
  | "budget"
  | "delayMonths"
  | "notes";

type ImportResult = {
  total: number;
  created: number;
  skipped: number;
  skippedRows: Array<{ row: number; reason: string }>;
};

type Props = {
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onClose: () => void;
  onImported: () => void | Promise<void>;
};

const FIELDS: Array<{
  key: FieldKey;
  label: string;
  aliases: string[];
}> = [
  {
    key: "company",
    label: "Entreprise",
    aliases: ["entreprise", "societe", "company", "nom entreprise"],
  },
  {
    key: "name",
    label: "Contact",
    aliases: ["contact", "nom", "prenom", "name", "contact name"],
  },
  {
    key: "email",
    label: "Email",
    aliases: ["email", "e mail", "mail", "courriel"],
  },
  {
    key: "phone",
    label: "Téléphone",
    aliases: ["telephone", "tel", "phone", "mobile"],
  },
  {
    key: "trade",
    label: "Secteur / métier",
    aliases: [
      "secteur",
      "metier",
      "activite",
      "trade",
      "category",
      "categorie",
    ],
  },
  {
    key: "city",
    label: "Ville",
    aliases: ["ville", "city", "commune", "localite"],
  },
  {
    key: "website",
    label: "Site internet",
    aliases: ["site", "site internet", "website", "url"],
  },
  {
    key: "websiteStatus",
    label: "État du site",
    aliases: ["etat du site", "qualite site", "website status", "audit"],
  },
  {
    key: "need",
    label: "Besoin identifié",
    aliases: ["besoin", "opportunite", "probleme", "need"],
  },
  {
    key: "budget",
    label: "Budget",
    aliases: ["budget", "budget estime", "prix"],
  },
  {
    key: "delayMonths",
    label: "Délai (mois)",
    aliases: ["delai", "echeance", "delay", "mois"],
  },
  {
    key: "notes",
    label: "Notes",
    aliases: ["notes", "commentaire", "commentaires", "description"],
  },
];

export default function ImportCsvModal({
  apiFetch,
  onClose,
  onImported,
}: Props) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] =
    useState<Record<FieldKey, string>>(emptyMapping());
  const [filename, setFilename] = useState("");
  const [campaign, setCampaign] = useState("");
  const [defaultWebsiteStatus, setDefaultWebsiteStatus] =
    useState<WebsiteStatus>("INCONNU");
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const preview = useMemo(() => rows.slice(0, 5), [rows]);

  async function selectFile(file?: File) {
    if (!file) return;
    setError("");
    setResult(null);
    if (file.size > 2 * 1024 * 1024) {
      setError("Le fichier CSV ne doit pas dépasser 2 Mo.");
      return;
    }
    const parsed = parseCsv(await file.text());
    if (parsed.length < 2) {
      setError(
        "Le fichier doit contenir une ligne d’en-têtes et au moins un prospect.",
      );
      return;
    }
    const nextHeaders = parsed[0].map(
      (header, index) => header.trim() || `Colonne ${index + 1}`,
    );
    const nextRows = parsed
      .slice(1)
      .filter((row) => row.some((value) => value.trim()))
      .slice(0, 501);
    if (nextRows.length > 500) {
      setError(
        "Un import est limité à 500 prospects. Scinde le fichier en deux listes.",
      );
      return;
    }
    setFilename(file.name);
    setHeaders(nextHeaders);
    setRows(nextRows);
    setMapping(autoMap(nextHeaders));
  }

  async function importRows() {
    setError("");
    if (!rows.length) return;
    if (!mapping.company && !mapping.name) {
      setError("Associe au moins une colonne Entreprise ou Contact.");
      return;
    }
    if (!mapping.email && !mapping.phone && !mapping.website) {
      setError(
        "Associe au moins une colonne Email, Téléphone ou Site internet.",
      );
      return;
    }

    const mappedRows = rows.map((row) => {
      const value = (key: FieldKey) => {
        const index = mapping[key] === "" ? -1 : Number(mapping[key]);
        return index >= 0 ? row[index]?.trim() || undefined : undefined;
      };
      return {
        company: value("company"),
        name: value("name"),
        email: value("email"),
        phone: value("phone"),
        trade: value("trade"),
        city: value("city"),
        website: value("website"),
        websiteStatus:
          parseWebsiteStatus(value("websiteStatus")) || defaultWebsiteStatus,
        need: value("need"),
        budget: parseNumber(value("budget")),
        delayMonths: parseInteger(value("delayMonths")),
        notes: value("notes"),
      };
    });

    setImporting(true);
    try {
      const response = await apiFetch(`${API}/crm/leads/import`, {
        method: "POST",
        body: JSON.stringify({
          rows: mappedRows,
          campaign: campaign.trim() || undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = Array.isArray(data.message)
          ? data.message.join(" · ")
          : data.message;
        throw new Error(message || "Import impossible.");
      }
      setResult(data as ImportResult);
      await onImported();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Import impossible.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <Modal onClose={onClose} maxWidth={980}>
      <h3 style={{ fontSize: 18, color: "var(--white)", marginBottom: 4 }}>
        Importer des prospects
      </h3>
      <p style={{ color: "var(--grey-3)", fontSize: 12, marginBottom: 20 }}>
        Les doublons sont ignorés par email, téléphone ou domaine du site.
        Maximum 500 lignes par import.
      </p>
      {error && <ErrorMsg>{error}</ErrorMsg>}

      {result ? (
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 10,
              marginBottom: 18,
            }}
          >
            <ResultCard label="Lignes lues" value={result.total} />
            <ResultCard
              label="Prospects créés"
              value={result.created}
              color="var(--green)"
            />
            <ResultCard
              label="Lignes ignorées"
              value={result.skipped}
              color="var(--gold)"
            />
          </div>
          {result.skippedRows.length > 0 && (
            <div
              style={{ fontSize: 12, color: "var(--grey-3)", marginBottom: 18 }}
            >
              {result.skippedRows.slice(0, 8).map((item) => (
                <div key={`${item.row}-${item.reason}`}>
                  Ligne {item.row} : {item.reason}
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={primaryButton}>
              Terminer
            </button>
          </div>
        </div>
      ) : (
        <>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 18,
              padding: "16px 18px",
              border: "1px dashed var(--border-2)",
              borderRadius: 8,
              background: "var(--black-3)",
              cursor: "pointer",
              marginBottom: 18,
            }}
          >
            <span>
              <strong
                style={{
                  display: "block",
                  color: "var(--white)",
                  fontSize: 13,
                }}
              >
                {filename || "Choisir un fichier CSV"}
              </strong>
              <span style={{ color: "var(--grey-3)", fontSize: 11 }}>
                Virgule, point-virgule et tabulation acceptés
              </span>
            </span>
            <span style={secondaryButton}>Parcourir</span>
            <input
              type="file"
              accept=".csv,text/csv,text/plain"
              style={{ display: "none" }}
              onChange={(event) => selectFile(event.target.files?.[0])}
            />
          </label>

          {headers.length > 0 && (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                  gap: "0 12px",
                }}
              >
                <Field label="Nom de la campagne / liste">
                  <input
                    style={inputStyle}
                    value={campaign}
                    placeholder="Ex. Artisans Oise — août"
                    onChange={(event) => setCampaign(event.target.value)}
                  />
                </Field>
                <Field label="État du site par défaut">
                  <select
                    style={inputStyle}
                    value={defaultWebsiteStatus}
                    onChange={(event) =>
                      setDefaultWebsiteStatus(
                        event.target.value as WebsiteStatus,
                      )
                    }
                  >
                    {Object.entries(WEBSITE_STATUS_LABELS).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </Field>
              </div>

              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--white)",
                  margin: "8px 0 12px",
                }}
              >
                Associer les colonnes
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                  gap: "0 12px",
                }}
              >
                {FIELDS.map((field) => (
                  <Field key={field.key} label={field.label}>
                    <select
                      style={inputStyle}
                      value={mapping[field.key]}
                      onChange={(event) =>
                        setMapping((current) => ({
                          ...current,
                          [field.key]: event.target.value,
                        }))
                      }
                    >
                      <option value="">Ne pas importer</option>
                      {headers.map((header, index) => (
                        <option key={`${header}-${index}`} value={index}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </Field>
                ))}
              </div>

              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--white)",
                  margin: "8px 0 10px",
                }}
              >
                Aperçu · {rows.length} ligne{rows.length > 1 ? "s" : ""}
              </div>
              <div
                style={{
                  overflowX: "auto",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: 680,
                  }}
                >
                  <thead>
                    <tr>
                      {headers.map((header, index) => (
                        <th key={`${header}-${index}`} style={cellHeader}>
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {headers.map((_, columnIndex) => (
                          <td key={columnIndex} style={cell}>
                            {row[columnIndex] || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 22,
            }}
          >
            <button type="button" onClick={onClose} style={secondaryButton}>
              Annuler
            </button>
            <button
              type="button"
              disabled={!rows.length || importing}
              onClick={importRows}
              style={{
                ...primaryButton,
                opacity: !rows.length || importing ? 0.5 : 1,
              }}
            >
              {importing
                ? "Import en cours..."
                : `Importer ${rows.length || 0} prospect${rows.length > 1 ? "s" : ""}`}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

function ResultCard({
  label,
  value,
  color = "var(--white)",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 8,
        border: "1px solid var(--border)",
        background: "var(--black-3)",
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: "var(--grey-3)",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div style={{ color, fontSize: 26, fontWeight: 800 }}>{value}</div>
    </div>
  );
}

function emptyMapping(): Record<FieldKey, string> {
  return Object.fromEntries(FIELDS.map((field) => [field.key, ""])) as Record<
    FieldKey,
    string
  >;
}

function autoMap(headers: string[]) {
  const result = emptyMapping();
  const normalized = headers.map(normalizeHeader);
  FIELDS.forEach((field) => {
    const aliases = field.aliases.map(normalizeHeader);
    const index = normalized.findIndex((header) => aliases.includes(header));
    if (index >= 0) result[field.key] = String(index);
  });
  return result;
}

function normalizeHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumber(value?: string) {
  if (!value) return undefined;
  const parsed = Number(
    value
      .replace(/\s/g, "")
      .replace(",", ".")
      .replace(/[^0-9.-]/g, ""),
  );
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseInteger(value?: string) {
  const parsed = parseNumber(value);
  return parsed === undefined ? undefined : Math.max(0, Math.round(parsed));
}

function parseWebsiteStatus(value?: string): WebsiteStatus | undefined {
  if (!value) return undefined;
  const normalized = normalizeHeader(value);
  if (/aucun|absent|sans site/.test(normalized)) return "ABSENT";
  if (/obsolete|ancien|vieill/.test(normalized)) return "OBSOLETE";
  if (/non responsive|mobile/.test(normalized)) return "NON_RESPONSIVE";
  if (/limite|faible|facebook/.test(normalized)) return "LIMITE";
  if (/correct|bon|moderne/.test(normalized)) return "CORRECT";
  return "INCONNU";
}

export function parseCsv(content: string): string[][] {
  const clean = content.replace(/^\uFEFF/, "");
  const delimiter = detectDelimiter(clean);
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < clean.length; index += 1) {
    const character = clean[index];
    if (character === '"') {
      if (quoted && clean[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && clean[index + 1] === "\n") index += 1;
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }
  if (value.length || row.length) {
    row.push(value);
    rows.push(row);
  }
  return rows.filter((current) => current.some((cell) => cell.trim()));
}

function detectDelimiter(content: string) {
  const firstLine = content.split(/\r?\n/, 1)[0] || "";
  const candidates = [";", ",", "\t"];
  return candidates.reduce((best, candidate) => {
    const count = firstLine.split(candidate).length;
    const bestCount = firstLine.split(best).length;
    return count > bestCount ? candidate : best;
  }, ";");
}

const primaryButton: React.CSSProperties = {
  padding: "9px 16px",
  borderRadius: 6,
  background: "var(--blue)",
  color: "#fff",
  fontSize: 12,
  fontWeight: 700,
};

const secondaryButton: React.CSSProperties = {
  padding: "9px 14px",
  borderRadius: 6,
  border: "1px solid var(--border-2)",
  background: "var(--black-3)",
  color: "var(--grey-2)",
  fontSize: 12,
  fontWeight: 600,
};

const cellHeader: React.CSSProperties = {
  padding: "8px 10px",
  textAlign: "left",
  background: "var(--black-3)",
  color: "var(--grey-2)",
  fontSize: 10,
  whiteSpace: "nowrap",
  borderBottom: "1px solid var(--border)",
};

const cell: React.CSSProperties = {
  padding: "7px 10px",
  color: "var(--grey-3)",
  fontSize: 11,
  whiteSpace: "nowrap",
  borderBottom: "1px solid var(--border)",
};
