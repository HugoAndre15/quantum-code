export type LeadStatus =
  | "NOUVEAU"
  | "A_CONTACTER"
  | "CONTACTE"
  | "QUALIFIE"
  | "REPONSE_RECUE"
  | "RENDEZ_VOUS"
  | "DEVIS_ENVOYE"
  | "GAGNE"
  | "CONVERTI"
  | "PERDU";

export type PipelineStatus =
  | "NOUVEAU"
  | "A_CONTACTER"
  | "CONTACTE"
  | "REPONSE_RECUE"
  | "RENDEZ_VOUS"
  | "DEVIS_ENVOYE"
  | "GAGNE"
  | "PERDU";

export type LeadSource =
  | "SIMULATOR"
  | "CONTACT"
  | "MANUEL"
  | "IMPORT_CSV"
  | "GOOGLE_MAPS"
  | "ANNUAIRE"
  | "RECOMMANDATION"
  | "RESEAUX_SOCIAUX";

export type WebsiteStatus =
  | "INCONNU"
  | "ABSENT"
  | "OBSOLETE"
  | "NON_RESPONSIVE"
  | "LIMITE"
  | "CORRECT";

export type ScorePart = {
  key: string;
  label: string;
  score: number;
  max: number;
  details: string[];
};

export type Prospect = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  trade?: string;
  city?: string;
  website?: string;
  websiteStatus: WebsiteStatus;
  need?: string;
  campaign?: string;
  lostReason?: string;
  budget?: number;
  delayMonths?: number;
  pageCount?: number;
  source: LeadSource;
  status: LeadStatus;
  score: number;
  scoreLabel: string;
  scoreBreakdown?: ScorePart[];
  notes?: string;
  lastContactAt?: string;
  createdAt: string;
  tasks?: Array<{
    id: string;
    title: string;
    dueAt: string;
    priority: string;
  }>;
  convertedClient?: { id: string; company: string };
  devis?: Array<{
    id: string;
    number: string;
    status: string;
    totalHT: number;
  }>;
  simulatorData?: Record<string, unknown>;
};

export const PIPELINE_COLUMNS: Array<{
  status: PipelineStatus;
  label: string;
  description: string;
  color: string;
}> = [
  {
    status: "NOUVEAU",
    label: "À qualifier",
    description: "Informations à vérifier",
    color: "#8a8a8a",
  },
  {
    status: "A_CONTACTER",
    label: "À contacter",
    description: "Cible validée",
    color: "#9b8cff",
  },
  {
    status: "CONTACTE",
    label: "Contacté",
    description: "Premier message envoyé",
    color: "#2d6fff",
  },
  {
    status: "REPONSE_RECUE",
    label: "Réponse reçue",
    description: "Échange engagé",
    color: "#46a6ff",
  },
  {
    status: "RENDEZ_VOUS",
    label: "Rendez-vous",
    description: "Besoin à cadrer",
    color: "#f0c040",
  },
  {
    status: "DEVIS_ENVOYE",
    label: "Devis envoyé",
    description: "Décision en attente",
    color: "#f59e42",
  },
  {
    status: "GAGNE",
    label: "Gagné",
    description: "Devis accepté",
    color: "#5dd8a0",
  },
  {
    status: "PERDU",
    label: "Perdu",
    description: "Opportunité clôturée",
    color: "#ff6b6b",
  },
];

export const STATUS_LABELS: Record<LeadStatus, string> = {
  NOUVEAU: "À qualifier",
  A_CONTACTER: "À contacter",
  QUALIFIE: "À contacter",
  CONTACTE: "Contacté",
  REPONSE_RECUE: "Réponse reçue",
  RENDEZ_VOUS: "Rendez-vous",
  DEVIS_ENVOYE: "Devis envoyé",
  GAGNE: "Gagné",
  CONVERTI: "Gagné",
  PERDU: "Perdu",
};

export const SOURCE_LABELS: Record<LeadSource, string> = {
  SIMULATOR: "Simulateur",
  CONTACT: "Formulaire contact",
  MANUEL: "Ajout manuel",
  IMPORT_CSV: "Import CSV",
  GOOGLE_MAPS: "Google Maps",
  ANNUAIRE: "Annuaire",
  RECOMMANDATION: "Recommandation",
  RESEAUX_SOCIAUX: "Réseaux sociaux",
};

export const WEBSITE_STATUS_LABELS: Record<WebsiteStatus, string> = {
  INCONNU: "À auditer",
  ABSENT: "Aucun site",
  OBSOLETE: "Site obsolète",
  NON_RESPONSIVE: "Non responsive",
  LIMITE: "Présence limitée",
  CORRECT: "Site correct",
};

export const CANONICAL_STATUSES: PipelineStatus[] = PIPELINE_COLUMNS.map(
  (column) => column.status,
);

export function canonicalStatus(status: LeadStatus): PipelineStatus {
  if (status === "QUALIFIE") return "A_CONTACTER";
  if (status === "CONVERTI") return "GAGNE";
  return status;
}

export function scoreColor(score: number) {
  if (score >= 75) return "var(--green)";
  if (score >= 55) return "var(--gold)";
  if (score >= 35) return "#7ba8ff";
  return "var(--grey-3)";
}
