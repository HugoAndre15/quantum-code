export const PROJECT_CHOICES = [
  {
    id: "launch",
    eyebrow: "Nouveau départ",
    title: "Créer mon premier site",
    description: "Présenter mon activité avec une image professionnelle.",
  },
  {
    id: "redesign",
    eyebrow: "Évolution",
    title: "Refondre un site existant",
    description: "Moderniser le design, les contenus et les performances.",
  },
  {
    id: "leads",
    eyebrow: "Acquisition",
    title: "Recevoir plus de demandes",
    description: "Transformer les visites en contacts et devis qualifiés.",
  },
  {
    id: "booking",
    eyebrow: "Réservation",
    title: "Prendre des rendez-vous",
    description: "Permettre aux clients de réserver simplement en ligne.",
  },
  {
    id: "shop",
    eyebrow: "Vente",
    title: "Vendre des produits en ligne",
    description: "Créer un catalogue, encaisser et gérer les commandes.",
  },
  {
    id: "custom",
    eyebrow: "Sur mesure",
    title: "Créer un projet spécifique",
    description: "Espace client, outil métier ou besoin plus avancé.",
  },
];

export const SECTOR_CHOICES = [
  { id: "artisan", label: "Artisan" },
  { id: "restaurant", label: "Restaurant" },
  { id: "commerce", label: "Commerce" },
  { id: "beauty", label: "Beauté & bien-être" },
  { id: "coach", label: "Coach / club" },
  { id: "liberal", label: "Profession libérale" },
  { id: "other", label: "Autre activité" },
];

export const CONTENT_CHOICES = [
  {
    id: "one",
    title: "Une page complète",
    description: "L’essentiel sur une page fluide et convaincante.",
    pageHint: "1 page",
  },
  {
    id: "standard",
    title: "Un site classique",
    description: "Une structure claire pour les services, preuves et contact.",
    pageHint: "4 à 5 pages",
    recommended: true,
  },
  {
    id: "complete",
    title: "Un site plus complet",
    description: "Davantage de contenus, de pages et d’objectifs.",
    pageHint: "6 à 8 pages",
  },
  {
    id: "advice",
    title: "Je préfère être conseillé",
    description: "Quantum Code compose la structure adaptée à votre métier.",
    pageHint: "Structure recommandée",
  },
];

export const FEATURE_DEFINITIONS = [
  {
    key: "quote",
    group: "Être contacté",
    title: "Demande de devis détaillée",
    description: "Un formulaire qui qualifie le besoin avant le premier échange.",
    optionNames: ["Formulaire avancé"],
  },
  {
    key: "whatsapp",
    group: "Être contacté",
    title: "WhatsApp ou appel direct",
    description: "Un accès immédiat au bon canal depuis les pages importantes.",
    optionNames: ["WhatsApp / appel direct"],
  },
  {
    key: "gallery",
    group: "Rassurer",
    title: "Galerie ou réalisations",
    description: "Mettre en scène les projets, plats, lieux ou prestations.",
    optionNames: ["Galerie"],
  },
  {
    key: "reviews",
    group: "Rassurer",
    title: "Avis Google",
    description: "Afficher les retours clients et faciliter la collecte d’avis.",
    optionNames: ["Google Reviews"],
  },
  {
    key: "booking",
    group: "Convertir",
    title: "Réservation ou rendez-vous",
    description: "Intégrer un parcours de réservation adapté à l’activité.",
    optionNames: ["Réservation"],
  },
  {
    key: "shop",
    group: "Vendre",
    title: "Boutique en ligne",
    description: "Catalogue, paiement sécurisé et administration des produits.",
    optionNames: ["Catalogue produits", "Paiement", "Admin"],
  },
  {
    key: "blog",
    group: "Gérer le contenu",
    title: "Blog administrable",
    description: "Publier des actualités ou conseils sans modifier le code.",
    optionNames: ["Blog"],
  },
  {
    key: "admin",
    group: "Gérer le contenu",
    title: "Administration personnalisée",
    description: "Modifier les contenus clés depuis un espace privé.",
    optionNames: ["Admin"],
  },
  {
    key: "seo",
    group: "Être visible",
    title: "SEO local renforcé",
    description: "Optimiser les pages et données locales pour Google.",
    optionNames: ["SEO"],
  },
  {
    key: "multilingual",
    group: "Être visible",
    title: "Une langue supplémentaire",
    description: "Ajouter une version traduite et un sélecteur de langue.",
    optionNames: ["Multilangue"],
  },
  {
    key: "animations",
    group: "Se démarquer",
    title: "Animations avancées",
    description: "Créer une expérience plus premium sans sacrifier la rapidité.",
    optionNames: ["Animations"],
  },
  {
    key: "copy",
    group: "Se démarquer",
    title: "Aide à la rédaction",
    description: "Structurer et améliorer les textes des pages principales.",
    optionNames: ["Rédaction de contenu"],
  },
];

export const TIMELINE_CHOICES = [
  { id: "asap", label: "Dès que possible", detail: "Projet prioritaire" },
  { id: "1-2", label: "Sous 1 à 2 mois", detail: "Délai idéal" },
  { id: "3-4", label: "Sous 3 à 4 mois", detail: "Projet planifié" },
  { id: "explore", label: "Je me renseigne", detail: "Pas encore de date" },
];

export const READINESS_CHOICES = [
  { id: "ready", label: "Textes et images prêts" },
  { id: "partial", label: "Une partie est prête" },
  { id: "help", label: "J’ai besoin d’aide" },
];

export const SUPPORT_CHOICES = [
  {
    id: "autonomous",
    title: "Je reste autonome",
    description: "Aucun abonnement obligatoire après la livraison.",
    optionNames: [],
  },
  {
    id: "hosting",
    title: "Hébergement suivi",
    description: "Hébergement, certificat SSL et supervision.",
    optionNames: ["Hébergement & supervision", "Frais de domaine"],
  },
  {
    id: "essential",
    title: "Maintenance essentielle",
    description: "Hébergement, mises à jour et contrôle mensuel.",
    optionNames: [
      "Hébergement & supervision",
      "Frais de domaine",
      "Maintenance classic",
    ],
  },
  {
    id: "serenity",
    title: "Formule sérénité",
    description: "Suivi renforcé, sauvegardes et support prioritaire.",
    optionNames: [
      "Hébergement & supervision",
      "Frais de domaine",
      "Maintenance +",
    ],
  },
];

export const PROJECT_DEFAULT_FEATURES = {
  launch: [],
  redesign: ["seo"],
  leads: ["quote", "seo"],
  booking: ["booking", "reviews"],
  shop: ["shop"],
  custom: ["admin"],
};

export const PROJECT_LABELS = Object.fromEntries(
  PROJECT_CHOICES.map((choice) => [choice.id, choice.title]),
);

export const SECTOR_LABELS = Object.fromEntries(
  SECTOR_CHOICES.map((choice) => [choice.id, choice.label]),
);

export const PAGE_BLUEPRINTS = {
  artisan: ["Accueil", "Prestations", "Réalisations", "À propos", "Contact"],
  restaurant: ["Accueil", "Carte", "Le lieu", "Réservation", "Contact"],
  commerce: ["Accueil", "Produits", "À propos", "Infos pratiques", "Contact"],
  beauty: ["Accueil", "Prestations", "Tarifs", "Réservation", "Contact"],
  coach: ["Accueil", "Accompagnements", "Méthode", "Témoignages", "Contact"],
  liberal: ["Accueil", "Expertises", "À propos", "Ressources", "Contact"],
  other: ["Accueil", "Services", "À propos", "Réalisations", "Contact"],
};

const fallbackOptions = [
  { id: "fallback-multilingual", name: "Multilangue", price: 250, category: "visibilité", devTime: 4, recurring: false },
  { id: "fallback-animations", name: "Animations", price: 190, category: "design", devTime: 3, recurring: false },
  { id: "fallback-booking", name: "Réservation", price: 290, category: "conversion", devTime: 5, recurring: false },
  { id: "fallback-blog", name: "Blog", price: 390, category: "contenu", devTime: 7, recurring: false },
  { id: "fallback-gallery", name: "Galerie", price: 160, category: "preuve", devTime: 2.5, recurring: false },
  { id: "fallback-payment", name: "Paiement", price: 350, category: "vente", devTime: 7, recurring: false },
  { id: "fallback-admin", name: "Admin", price: 590, category: "gestion", devTime: 11, recurring: false },
  { id: "fallback-reviews", name: "Google Reviews", price: 80, category: "preuve", devTime: 1, recurring: false },
  { id: "fallback-seo", name: "SEO", price: 190, category: "visibilité", devTime: 3.5, recurring: false },
  { id: "fallback-copy", name: "Rédaction de contenu", price: 250, category: "contenu", devTime: 4, recurring: false },
  { id: "fallback-form", name: "Formulaire avancé", price: 120, category: "conversion", devTime: 2, recurring: false },
  { id: "fallback-catalog", name: "Catalogue produits", price: 490, category: "vente", devTime: 9, recurring: false },
  { id: "fallback-whatsapp", name: "WhatsApp / appel direct", price: 60, category: "conversion", devTime: 1, recurring: false },
  { id: "fallback-maintenance", name: "Maintenance classic", price: 19, category: "récurrent", recurring: true, recurringUnit: "mois" },
  { id: "fallback-maintenance-plus", name: "Maintenance +", price: 39, category: "récurrent", recurring: true, recurringUnit: "mois" },
  { id: "fallback-hosting", name: "Hébergement & supervision", price: 15, category: "récurrent", recurring: true, recurringUnit: "mois" },
  { id: "fallback-domain", name: "Frais de domaine", price: 20, category: "récurrent", recurring: true, recurringUnit: "an" },
];

function fallbackIncluded(names) {
  return names
    .map((name) => fallbackOptions.find((option) => option.name === name))
    .filter(Boolean)
    .map((serviceOption) => ({
      serviceOptionId: serviceOption.id,
      serviceOption,
    }));
}

export const FALLBACK_PRICING = {
  base: {
    id: "fallback-base",
    name: "Socle site professionnel",
    basePrice: 590,
    pagePrice: 90,
    basePages: 1,
    devTimeBase: 8,
    devTimePage: 1.5,
  },
  packs: [
    {
      id: "fallback-launch",
      name: "Lancement",
      description: "Une page complète pour présenter l’activité et être contacté.",
      price: 590,
      includedPages: 1,
      devTime: 8,
      position: 0,
      features: ["Page personnalisée", "Formulaire", "SEO technique", "Mise en ligne"],
      includedOptions: [],
    },
    {
      id: "fallback-showcase",
      name: "Vitrine",
      description: "Un site structuré pour présenter les services et générer des contacts.",
      price: 890,
      includedPages: 4,
      devTime: 16,
      position: 1,
      features: ["4 pages", "Galerie", "Formulaire avancé", "SEO technique"],
      includedOptions: fallbackIncluded(["Galerie", "Formulaire avancé"]),
    },
    {
      id: "fallback-signature",
      name: "Signature",
      description: "Une expérience plus ambitieuse pour se différencier et convertir.",
      price: 1390,
      includedPages: 6,
      devTime: 28,
      position: 2,
      features: ["6 pages", "Animations", "Galerie", "Avis Google", "SEO local"],
      includedOptions: fallbackIncluded([
        "Galerie",
        "Formulaire avancé",
        "Animations",
        "Google Reviews",
        "SEO",
      ]),
    },
    {
      id: "fallback-shop",
      name: "Boutique",
      description: "Une boutique avec catalogue, paiement et gestion des contenus.",
      price: 2490,
      includedPages: 8,
      devTime: 50,
      position: 3,
      features: ["Catalogue", "Paiement", "Administration", "SEO technique"],
      includedOptions: fallbackIncluded([
        "Catalogue produits",
        "Paiement",
        "Admin",
        "SEO",
      ]),
    },
  ],
  options: fallbackOptions,
};
