import { LeadSource, LeadStatus, ProspectWebsiteStatus } from '@prisma/client';

export type LeadScoreInput = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  trade?: string | null;
  city?: string | null;
  website?: string | null;
  websiteStatus?: ProspectWebsiteStatus | null;
  need?: string | null;
  budget?: number | null;
  delayMonths?: number | null;
  pageCount?: number | null;
  source?: LeadSource | null;
  status?: LeadStatus | null;
};

export type ScorePart = {
  key: 'opportunity' | 'intent' | 'contact' | 'fit' | 'engagement';
  label: string;
  score: number;
  max: number;
  details: string[];
};

export type LeadScore = {
  total: number;
  label: string;
  parts: ScorePart[];
};

const WEBSITE_POINTS: Record<ProspectWebsiteStatus, number> = {
  INCONNU: 5,
  ABSENT: 25,
  OBSOLETE: 22,
  NON_RESPONSIVE: 22,
  LIMITE: 14,
  CORRECT: 2,
};

const WEBSITE_DETAILS: Record<ProspectWebsiteStatus, string> = {
  INCONNU: 'Site à auditer',
  ABSENT: 'Aucun site identifié',
  OBSOLETE: 'Site ancien ou obsolète',
  NON_RESPONSIVE: 'Site peu adapté au mobile',
  LIMITE: 'Présence web perfectible',
  CORRECT: 'Site déjà satisfaisant',
};

const STATUS_POINTS: Partial<Record<LeadStatus, number>> = {
  A_CONTACTER: 2,
  QUALIFIE: 2,
  CONTACTE: 3,
  REPONSE_RECUE: 5,
  RENDEZ_VOUS: 7,
  DEVIS_ENVOYE: 7,
  GAGNE: 7,
  CONVERTI: 7,
};

function hasText(value?: string | null) {
  return Boolean(value?.trim());
}

export function getScoreLabel(score: number) {
  if (score >= 75) return 'Prioritaire';
  if (score >= 55) return 'Chaud';
  if (score >= 35) return 'À travailler';
  return 'Faible';
}

export function calculateLeadScore(data: LeadScoreInput): LeadScore {
  const websiteStatus = data.websiteStatus || ProspectWebsiteStatus.INCONNU;
  const opportunity = WEBSITE_POINTS[websiteStatus];

  let intent = 0;
  const intentDetails: string[] = [];
  if (data.budget !== undefined && data.budget !== null) {
    if (data.budget >= 1500) intent += 12;
    else if (data.budget >= 1000) intent += 10;
    else if (data.budget >= 700) intent += 8;
    else if (data.budget >= 400) intent += 5;
    else if (data.budget > 0) intent += 2;
    intentDetails.push(`Budget estimé : ${Math.round(data.budget)} €`);
  }
  if (data.delayMonths !== undefined && data.delayMonths !== null) {
    if (data.delayMonths <= 1) intent += 10;
    else if (data.delayMonths <= 3) intent += 8;
    else if (data.delayMonths <= 6) intent += 5;
    else intent += 2;
    intentDetails.push(
      data.delayMonths <= 1
        ? 'Projet rapide'
        : `Échéance : ${data.delayMonths} mois`,
    );
  }
  if (hasText(data.need)) {
    intent += 5;
    intentDetails.push('Besoin identifié');
  }
  if (data.pageCount) {
    intent += data.pageCount >= 5 ? 3 : 2;
    intentDetails.push(`${data.pageCount} page(s) envisagée(s)`);
  }

  let contact = 0;
  const contactDetails: string[] = [];
  if (hasText(data.email)) {
    contact += 7;
    contactDetails.push('Email disponible');
  }
  if (hasText(data.phone)) {
    contact += 7;
    contactDetails.push('Téléphone disponible');
  }
  if (hasText(data.company)) {
    contact += 3;
    contactDetails.push('Entreprise identifiée');
  }
  if (
    hasText(data.name) &&
    data.name?.trim().toLocaleLowerCase('fr-FR') !==
      data.company?.trim().toLocaleLowerCase('fr-FR')
  ) {
    contact += 2;
    contactDetails.push('Interlocuteur identifié');
  }
  if (hasText(data.website)) {
    contact += 1;
    contactDetails.push('Site connu');
  }

  let fit = 0;
  const fitDetails: string[] = [];
  if (hasText(data.trade)) {
    fit += 5;
    fitDetails.push('Secteur renseigné');
  }
  if (hasText(data.city)) {
    fit += 5;
    fitDetails.push('Zone géographique renseignée');
  }

  let engagement = 0;
  const engagementDetails: string[] = [];
  if (data.source === LeadSource.SIMULATOR) {
    engagement += 8;
    engagementDetails.push('Demande via le simulateur');
  } else if (data.source === LeadSource.CONTACT) {
    engagement += 6;
    engagementDetails.push('Formulaire de contact envoyé');
  } else if (data.source === LeadSource.RECOMMANDATION) {
    engagement += 6;
    engagementDetails.push('Prospect recommandé');
  } else if (data.source) {
    engagement += 2;
    const sourceDetails: Partial<Record<LeadSource, string>> = {
      IMPORT_CSV: 'Import de prospection',
      GOOGLE_MAPS: 'Prospection Google Maps',
      ANNUAIRE: 'Prospection via un annuaire',
      RESEAUX_SOCIAUX: 'Prospection via les réseaux sociaux',
      MANUEL: 'Ajout manuel',
    };
    engagementDetails.push(
      sourceDetails[data.source] || 'Prospection sortante',
    );
  }
  const statusPoints = data.status ? STATUS_POINTS[data.status] || 0 : 0;
  if (statusPoints) {
    engagement += statusPoints;
    engagementDetails.push('Avancement commercial confirmé');
  }

  const parts: ScorePart[] = [
    {
      key: 'opportunity',
      label: 'Opportunité web',
      score: opportunity,
      max: 25,
      details: [WEBSITE_DETAILS[websiteStatus]],
    },
    {
      key: 'intent',
      label: 'Intention et projet',
      score: Math.min(intent, 30),
      max: 30,
      details: intentDetails,
    },
    {
      key: 'contact',
      label: 'Joignabilité',
      score: Math.min(contact, 20),
      max: 20,
      details: contactDetails,
    },
    {
      key: 'fit',
      label: 'Adéquation cible',
      score: fit,
      max: 10,
      details: fitDetails,
    },
    {
      key: 'engagement',
      label: 'Engagement',
      score: Math.min(engagement, 15),
      max: 15,
      details: engagementDetails,
    },
  ];
  const total = Math.min(
    100,
    parts.reduce((sum, part) => sum + part.score, 0),
  );

  return { total, label: getScoreLabel(total), parts };
}
