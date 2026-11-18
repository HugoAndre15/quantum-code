import { createHash } from 'node:crypto';

// This text is copied into the offer at issue time. Changing it never changes an existing offer.
export const CONTRACT_VERSION = 'QC-B2B-2026-11-18.1';
export const CONTRACT_ISSUER = { name: 'Hugo André EI — Quantum Code', siret: '102 934 916 00028', email: 'contact@quantum-code.fr' };
export const SCOPE_DECLARATION = 'Je commande pour mon activité professionnelle. Les échanges ayant conduit à cette commande ont eu lieu exclusivement à distance, sans démarchage physique.';
export const CONSENT = 'Je suis habilité à engager le client identifié au devis. Après vérification des prestations, des prix et des éventuels abonnements, je signe le devis et le contrat de création de site, CGV comprises, avec obligation de paiement.';

export const CLAUSES = [
  { title: '1. Parties et champ du contrat', text: 'Hugo André, entrepreneur individuel exerçant sous le nom Quantum Code (le prestataire), réalise le site pour le client professionnel identifié au devis. Le devis et ses annexes expressément acceptées fixent les conditions particulières ; elles priment sur les présentes CGV en cas de contradiction. Ce modèle est réservé aux affaires négociées entièrement à distance entre professionnels. Il ne convient ni aux consommateurs ni au démarchage physique, même suivi d’une signature en ligne. Aucune stipulation ne prive le client d’une protection légale impérative.' },
  { title: '2. Commande et périmètre', text: 'Le client vérifie les lignes du devis, leurs quantités, les prestations ponctuelles, les services récurrents et les précisions particulières. Une erreur peut être signalée au prestataire pour réédition avant signature. Seuls les livrables indiqués sont commandés. Sauf ligne contraire, rédaction de contenus, photographies, achats de licences, hébergement, maintenance continue et nouvelles fonctionnalités ne sont pas inclus. Tout ajout fait l’objet d’un prix et d’un délai acceptés par écrit avant réalisation.' },
  { title: '3. Prix et paiement', text: 'Les prix en euros, réductions éventuelles et périodicités figurent au devis. Aucun escompte pour paiement anticipé. Sauf échéancier particulier écrit, l’acompte est de 30 % du montant ponctuel, sur facture après signature. Le solde est facturé à la livraison pour recette et payable dans les 30 jours de la facture. Le paiement s’effectue par virement ou, lorsqu’il est proposé, par carte via un lien sécurisé. L’acompte s’impute sur le prix ; il n’est pas une faculté de dédit. La signature ne débite pas la carte du client.' },
  { title: '4. Retard de paiement', text: 'À compter du lendemain de l’échéance, des pénalités courent sans rappel sur le montant impayé, au taux annuel de trois fois le taux de l’intérêt légal applicable aux créances professionnelles. Une indemnité forfaitaire de 40 € est due par facture payée en retard. Les frais de recouvrement excédant ce montant peuvent être demandés sur justificatifs, dans les conditions légales. Ces dispositions ne s’appliquent pas lorsqu’une disposition impérative s’y oppose.' },
  { title: '5. Organisation de la réalisation', text: 'Le prestataire confirme le calendrier après réception de l’acompte et des contenus et accès nécessaires. Le client désigne un interlocuteur habilité et fournit textes, médias et validations aux dates convenues. Un retard de remise entraîne une replanification concertée. Sauf précision au devis, deux séries de retours consolidés sur la présentation sont comprises ; les corrections de non-conformités au devis ne sont pas décomptées de ces séries.' },
  { title: '6. Recette, livraison et corrections', text: 'Le prestataire communique un lien de prévisualisation. Le client dispose de dix jours ouvrés pour valider par écrit ou signaler les écarts au devis, avec la page et les étapes utiles. Après correction, les points signalés sont soumis à une nouvelle vérification. Le silence déclenche une relance, pas une validation automatique. La mise en ligne est convenue entre les parties. Quatorze jours calendaires de suivi après livraison sont inclus pour les anomalies du périmètre livré et les ajustements mineurs. Cette période ne limite pas les droits légaux du client.' },
  { title: '7. Droits sur les livrables', text: 'Après paiement intégral du prix de création, Quantum Code cède au client, à titre exclusif, les droits patrimoniaux qu’il détient sur le code et les créations graphiques originales réalisés spécifiquement pour le site désigné au devis. Le droit de reproduction couvre la copie, les sauvegardes et l’installation ; celui de représentation couvre la mise à disposition du public en ligne ; celui d’adaptation couvre les modifications, traductions, évolutions et migrations, y compris par un autre prestataire. La cession, comprise dans le prix convenu, vaut dans le monde entier, pour la durée légale de protection, pour l’exploitation et la promotion de ce site sur supports numériques. Les droits moraux demeurent réservés.' },
  { title: '8. Éléments réutilisables et contenus tiers', text: 'Les gabarits, composants génériques, outils et méthodes préexistants ne sont pas cédés en exclusivité. Dans la mesure nécessaire à l’exploitation, à la modification et au transfert du site, le client reçoit sur les éléments intégrés de Quantum Code une licence non exclusive, de même durée et territoire, comprise dans le prix, utilisable par son mainteneur. Les bibliothèques, polices, médias et services tiers restent soumis à leurs licences, signalées à la livraison. Le client conserve ses contenus et garantit disposer des autorisations nécessaires pour leur utilisation. Toute utilisation du nom ou des visuels du client comme référence publique requiert son accord.' },
  { title: '9. Domaine, hébergement et sortie', text: 'Par défaut, le domaine et le compte d’hébergement sont ouverts au nom du client, qui règle leur renouvellement. À la livraison et après paiement intégral, le prestataire remet les sources livrables, les instructions utiles et les accès administrateur du client par un canal adapté. Si un hébergement géré ou une maintenance sont retenus, une annexe acceptée avant activation précise prix, périodicité, limites, sauvegardes, intervention, résiliation et restitution des données. Aucun hébergement perpétuel ni abonnement non chiffré n’est inclus.' },
  { title: '10. Confidentialité et données', text: 'Chaque partie limite l’utilisation des informations et accès confidentiels à l’exécution du projet. Quantum Code traite les coordonnées professionnelles et les éléments de preuve de commande pour la relation contractuelle, la facturation et la défense de ses droits, avec un accès limité aux intervenants habilités. Contact pour les droits : contact@quantum-code.fr. Le client détermine les usages des données des visiteurs de son site. Avant tout traitement de ces données pour son compte, les parties concluent une annexe précisant notamment instructions, sécurité, prestataires ultérieurs, incidents et restitution ou suppression des données.' },
  { title: '11. Responsabilité et fin du projet', text: 'Chaque partie répond des dommages directs causés par ses manquements dans les conditions du droit commun. Aucun classement dans les moteurs de recherche, chiffre d’affaires ni disponibilité permanente d’un service tiers n’est garanti. En cas de manquement grave, l’autre partie peut demander sa correction par écrit puis, à défaut de régularisation sous quinze jours après mise en demeure indiquant la résolution envisagée, mettre fin au contrat selon la loi. Les travaux conformes effectivement réalisés et les frais tiers préalablement autorisés sont décomptés ; tout trop-perçu est restitué. En cas de force majeure, les effets sont ceux de l’article 1218 du Code civil.' },
  { title: '12. Accord et différends', text: 'Le client peut conserver le devis et les CGV avant de signer. En ligne, il renseigne son identité et sa qualité, confirme expressément son accord et peut télécharger son exemplaire. La version des conditions, le devis, l’empreinte du contenu accepté et la date de signature sont conservés avec cet exemplaire. Sur papier, les parties conservent chacune un exemplaire daté et signé et le devis annexé. Le droit français s’applique. Les parties chercheront d’abord une solution amiable, sans faire obstacle à une mesure urgente ; à défaut, le tribunal compétent est déterminé selon le droit commun.' },
];

interface QuoteSource {
  number: string; createdAt: Date; notes: string | null; totalHT: number; discountAmount: number;
  promoCode: { code: string } | null;
  client: { company: string; contactName: string; address: string | null; email: string | null };
  items: { label: string; description: string | null; quantity: number; unitPrice: number; recurring: boolean; recurringUnit: string | null }[];
}

export function freezeOffer(q: QuoteSource, issuerAddress: string, expiresAt: Date) {
  return JSON.stringify({
    version: CONTRACT_VERSION, issuer: { ...CONTRACT_ISSUER, address: issuerAddress },
    number: q.number, createdAt: q.createdAt.toISOString(), validUntil: expiresAt.toISOString(),
    client: { company: q.client.company, contactName: q.client.contactName, address: q.client.address, email: q.client.email! },
    items: q.items.map(({ label, description, quantity, unitPrice, recurring, recurringUnit }) => ({ label, description, quantity, unitPrice, recurring, recurringUnit })),
    notes: q.notes, totalHT: q.totalHT, discountAmount: q.discountAmount, promoCode: q.promoCode?.code ?? null,
    tax: 'TVA non applicable (franchise en base).',
    scope: SCOPE_DECLARATION, consent: CONSENT, clauses: CLAUSES,
  } satisfies ContractOffer);
}

export interface ContractOffer {
  version: string; issuer: { name: string; siret: string; email: string; address: string };
  number: string; createdAt: string; validUntil: string;
  client: { company: string; contactName: string; address: string | null; email: string };
  items: QuoteSource['items']; notes: string | null; totalHT: number; discountAmount: number; promoCode: string | null;
  tax: string; scope: string; consent: string; clauses: {title: string; text: string}[];
}

export function offerDigest(snapshot: string) {
  return createHash('sha256').update(snapshot, 'utf8').digest('hex');
}

export type Signer = { signerName: string; signerRole: string; signedAt: Date };

// validUntil is entered as a French calendar date, not a midnight-UTC cutoff.
export function signatureDeadline(validUntil: Date | null, now: Date) {
  if (!validUntil) return new Date(now.getTime() + 30 * 86_400_000);
  const day = validUntil.toISOString().slice(0, 10);
  const utcEnd = new Date(day + 'T23:59:59.999Z');
  const localHour = Number(new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(utcEnd).find(part => part.type === 'hour')!.value);
  return new Date(utcEnd.getTime() - ((localHour - 23 + 24) % 24) * 3_600_000);
}
