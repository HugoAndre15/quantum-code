// ──────────────────────────────────────────────
//  Quantum Code — Données centralisées du site
// ──────────────────────────────────────────────

// ─── Infos générales ─────────────────────────
export const siteConfig = {
  name: "Quantum Code",
  url: "https://quantumcode.dev",
  email: "hello@quantumcode.dev",
  phone: "+33 6 XX XX XX XX",
  location: "Oise, Hauts-de-France",
  locationShort: "l'Oise et les Hauts-de-France",
  available: true,
  availableText: "Disponible — réponse sous 24h",
  copyright: `© ${new Date().getFullYear()} Quantum Code`,
};

// ─── SEO / Meta ──────────────────────────────
export const seo = {
  title:
    "Développeur Web Freelance Oise & Hauts-de-France | Quantum Code — Création de Sites Internet",
  description:
    "Développeur web freelance dans l'Oise et les Hauts-de-France. Création de sites internet, sites vitrines, e-commerces et applications web sur mesure. Développement moderne, SEO optimisé. Devis gratuit sous 24h.",
  keywords:
    "développeur web, développeur freelance, création site web, site internet, développement web, site vitrine, e-commerce, Oise, Hauts-de-France, Picardie, Beauvais, Compiègne, Chantilly, Senlis, Creil, Next.js, React, refonte site web, SEO, application web",
  ogImage: "https://quantumcode.dev/og-image.jpg",
  jsonLd: {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "Quantum Code",
    description:
      "Développeur web freelance — création de sites internet, sites vitrines, e-commerces et applications web sur mesure dans l'Oise et les Hauts-de-France.",
    url: "https://quantumcode.dev",
    areaServed: [
      { "@type": "AdministrativeArea", name: "Oise" },
      { "@type": "AdministrativeArea", name: "Hauts-de-France" },
      { "@type": "Country", name: "France" },
    ],
    serviceType: [
      "Création de sites web",
      "Développement web",
      "Site vitrine",
      "E-commerce",
      "Application web",
      "Refonte de site internet",
    ],
    priceRange: "€€",
    knowsAbout: [
      "Next.js",
      "React",
      "Node.js",
      "TypeScript",
      "SEO",
      "Tailwind CSS",
    ],
  },
};

// ─── Navigation ──────────────────────────────
export const navLinks = [
  { href: "#apropos", label: "À propos" },
  { href: "#portfolio", label: "Portfolio" },
  { href: "#tarifs", label: "Tarifs" },
  { href: "#simulateur", label: "Simulateur" },
  { href: "#faq", label: "FAQ" },
  { href: "#contact", label: "Contact" },
];

// ─── Hero — Pourquoi me choisir ──────────────
// Les éléments ci-dessous sont vérifiables : l'expérience est réelle,
// la réactivité est un engagement, et le sur-mesure correspond à la
// méthode de travail (pas de template revendu).
export const heroReasons = [
  {
    title: "4 ans",
    label: "D'expérience en développement",
  },
  {
    title: "24h",
    label: "Réponse garantie à chaque demande",
  },
  {
    title: "100%",
    label: "Sur mesure, sans abonnement caché",
  },
];

// ─── Ticker (bandeau défilant) ───────────────
export const tickerItems = [
  "Next.js",
  "React",
  "TypeScript",
  "Node.js",
  "Stripe",
  "Tailwind CSS",
  "Figma",
  "PostgreSQL",
  "Vercel",
  "Prisma",
  "SEO Technique",
  "Framer Motion",
];

// ─── À propos — IDE panels ──────────────────
export const skills = {
  frontend: ["Next.js", "React", "TypeScript", "Tailwind CSS", "Framer Motion"],
  backend: ["Node.js", "PostgreSQL", "Prisma ORM", "Stripe API"],
  perfScore: 99,
};

export const stack = {
  design: "Figma",
  deploy: "Vercel",
  cms: "Sanity",
  auth: "Clerk",
  email: "Resend",
};

// ─── Portfolio ───────────────────────────────
export const gradients = [
  "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
  "linear-gradient(135deg, #2d1b69 0%, #11998e 100%)",
  "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)",
  "linear-gradient(135deg, #0c0c1d 0%, #1a1a3e 50%, #2d6fff22 100%)",
  "linear-gradient(135deg, #141e30 0%, #243b55 100%)",
  "linear-gradient(135deg, #1f1c2c 0%, #928dab 100%)",
  "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
  "linear-gradient(135deg, #200122 0%, #6f0000 100%)",
  "linear-gradient(135deg, #1d2b64 0%, #f8cdda 100%)",
];

// ─── Tarifs ──────────────────────────────────
export const packs = [
  {
    name: "Essentiel",
    price: "500",
    popular: false,
    features: [
      "Site one page",
      "Responsive mobile / tablette",
      "Formulaire de contact",
      "Design propre et moderne",
      "Mise en ligne rapide",
    ],
  },
  {
    name: "Standard",
    price: "800",
    popular: true,
    features: [
      "3 à 4 pages",
      "Galerie simple",
      "Google Maps",
      "Formulaire avancé",
      "Structure pensée pour convertir",
    ],
  },
  {
    name: "Pro",
    price: "1200",
    popular: false,
    features: [
      "5 à 6 pages",
      "Blog",
      "Réservation via Calendly",
      "Paiement via Stripe",
      "Mini interface d'administration",
    ],
  },
];

export const options = [
  { label: "Page supplémentaire", price: "70" },
  { label: "Galerie avancée", price: "150" },
  { label: "Blog", price: "200" },
  { label: "Réservation", price: "100" },
  { label: "Paiement en ligne", price: "100" },
  { label: "Avis Google", price: "50" },
  { label: "Multilangue", price: "150" },
  { label: "Animations", price: "150" },
  { label: "Admin", price: "200" },
];

export const steps = [
  {
    num: "01",
    title: "On échange sur votre besoin",
    desc: "Vous m'expliquez votre activité, vos services et l'objectif du site.",
  },
  {
    num: "02",
    title: "Je prépare votre site",
    desc: "Je pars d'une base solide et je personnalise le design, les textes et les sections.",
  },
  {
    num: "03",
    title: "Mise en ligne rapide",
    desc: "Votre site est livré rapidement, responsive et prêt à être partagé à vos clients.",
  },
];

// ─── Budgets indicatifs (homepage) ───────────
// Exemples concrets pour aider le visiteur à se projeter.
// Le simulateur reste la référence pour un prix précis.
export const budgetExamples = [
  {
    icon: "💇",
    title: "Site coiffeur avec prise de RDV",
    desc: "Site vitrine élégant, présentation des prestations et réservation en ligne.",
    price: "≈ 750 €",
    note: "Site vitrine + module de réservation",
  },
  {
    icon: "🥖",
    title: "Site boulangerie / commerce de proximité",
    desc: "Vitrine simple et claire pour présenter vos produits, horaires et localisation.",
    price: "≈ 500 €",
    note: "Site vitrine one-page optimisé local",
  },
  {
    icon: "🛒",
    title: "Boutique en ligne",
    desc: "Catalogue produits, paiement sécurisé et gestion des commandes.",
    price: "à partir de 1 500 €",
    note: "E-commerce avec paiement Stripe",
  },
];

// ─── FAQ ─────────────────────────────────────
export const faqItems = [
  {
    q: "Quels sont les délais de livraison ?",
    a: "Pour un site vitrine, comptez en général 2 à 3 semaines entre la validation du devis et la mise en ligne. Pour un projet plus complexe (e-commerce, application sur mesure), on définit ensemble un planning réaliste lors du premier échange.",
  },
  {
    q: "Mon site sera-t-il vraiment personnalisé ?",
    a: "Oui. Je ne revends pas de templates. Le design, les textes et les sections sont pensés pour votre activité et votre image. Vous validez chaque étape avant la mise en ligne.",
  },
  {
    q: "Quel accompagnement après la livraison ?",
    a: "Une fois le site en ligne, je reste disponible pour vous accompagner : formation rapide pour être autonome si besoin, corrections, et option de maintenance mensuelle pour les mises à jour techniques et la sécurité.",
  },
  {
    q: "Comment se passe le paiement ?",
    a: "Un acompte de 30 % à la signature pour démarrer le projet, puis le solde à la livraison, une fois le site validé et mis en ligne. Pas d'abonnement obligatoire ni de frais cachés.",
  },
  {
    q: "Suis-je propriétaire de mon site ?",
    a: "Oui, à 100 %. Le code, les contenus, le nom de domaine et l'hébergement sont à votre nom. Vous restez libre à tout moment de le faire évoluer ou de le confier à quelqu'un d'autre.",
  },
  {
    q: "Le site sera-t-il responsive et optimisé SEO ?",
    a: "Oui. Tous mes sites sont responsives (mobile, tablette, ordinateur), rapides, et conçus avec les bonnes pratiques SEO techniques (structure, performances, balises) pour être bien référencés sur Google.",
  },
  {
    q: "Et si j'ai besoin de modifications plus tard ?",
    a: "Aucun problème. On peut convenir d'un forfait ponctuel pour des évolutions, ou d'un suivi mensuel si vous préférez. Vous n'êtes jamais bloqué.",
  },
  {
    q: "Comment connaître le prix exact pour mon projet ?",
    a: "Le simulateur de prix sur cette page vous donne une estimation précise en quelques clics, selon vos besoins. Pour un chiffrage définitif, on en discute ensemble lors d'un premier échange gratuit.",
  },
];

// ─── Contact ─────────────────────────────────
export const contactInfo = [
  {
    ico: "✉️",
    label: "Email",
    value: "contact@quantum-code.fr",
  },
  {
    ico: "📞",
    label: "Téléphone",
    value: "+33 6 03 68 11 98",
  },
  {
    ico: "📍",
    label: "Localisation",
    value: "Oise, Hauts-de-France",
  },
];

export const projectTypes = [
  "Site Essentiel (one-page)",
  "Site Signature (vitrine)",
  "Évolution (refonte)",
  "E-commerce",
  "Application web",
];

export const budgetRanges = [
  "200 — 500 €",
  "500 — 1 500 €",
  "1 500 — 4 000 €",
  "> 4 000 €",
];
