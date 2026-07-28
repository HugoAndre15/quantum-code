import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  // ─── Admin user ─────────────────────────────
  const email = process.env.ADMIN_EMAIL ?? 'admin@quantumcode.dev';
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? 'Admin Quantum Code';

  const exists = await prisma.user.findUnique({ where: { email } });

  if (!exists) {
    if (!password) {
      throw new Error(
        'ADMIN_PASSWORD doit être défini pour créer le premier compte administrateur.',
      );
    }
    const hash = await bcrypt.hash(password, 12);
    const admin = await prisma.user.create({
      data: {
        email,
        password: hash,
        name,
        role: 'SUPER_ADMIN',
      },
    });
    console.log('✅ Admin created:', admin.email);
  } else {
    console.log('ℹ️  Admin already exists:', email);
  }

  // ─── Base tarifaire ─────────────────────────
  // La migration ne remplace que l'ancienne grille connue. Une modification
  // manuelle faite ensuite depuis l'administration reste donc prioritaire.
  console.log('\n🌱 Seeding pricing base...');
  const existingPricingBase = await prisma.pricingBase.findFirst();
  const pricingBaseData = {
    name: 'Socle site professionnel',
    basePrice: 590,
    pagePrice: 90,
    basePages: 1,
    devTimeBase: 8,
    devTimePage: 1.5,
    description:
      'Conception, développement responsive, socle SEO technique et mise en ligne.',
  };
  if (!existingPricingBase) {
    await prisma.pricingBase.create({ data: pricingBaseData });
  } else if (
    existingPricingBase.basePrice <= 690 &&
    existingPricingBase.pagePrice <= 140
  ) {
    await prisma.pricingBase.update({
      where: { id: existingPricingBase.id },
      data: pricingBaseData,
    });
  }
  console.log('  ✅ Base — 590€ · page supplémentaire — 90€');

  // ─── Packs ──────────────────────────────────
  console.log('\n🌱 Seeding packs...');
  const packs = [
    {
      name: 'Lancement',
      legacyNames: ['Présence en ligne'],
      legacyPrices: [200, 500, 690],
      description:
        'Une page complète pour présenter l’activité, rassurer et être contacté.',
      price: 590,
      type: 'CLASSIQUE' as const,
      devTime: 8,
      position: 0,
      includedPages: 1,
      features: [
        'Page longue personnalisée',
        'Formulaire de contact',
        'Google Maps',
        'SEO technique',
        'Design responsive',
        'Mise en ligne',
      ],
    },
    {
      name: 'Vitrine',
      legacyNames: ['Site Vitrine'],
      legacyPrices: [400, 800, 1190],
      description:
        'Un site structuré pour présenter les services et générer des contacts.',
      price: 890,
      type: 'CLASSIQUE' as const,
      devTime: 16,
      position: 1,
      includedPages: 4,
      features: [
        '4 pages personnalisées',
        'Galerie ou réalisations',
        'Formulaire avancé',
        'SEO technique et local',
        'Design responsive',
      ],
    },
    {
      name: 'Signature',
      legacyNames: ['Business'],
      legacyPrices: [600, 1200, 1890],
      description:
        'Une expérience plus ambitieuse pour se différencier et convertir.',
      price: 1390,
      type: 'ADMIN_INTEGRE' as const,
      devTime: 28,
      position: 2,
      includedPages: 6,
      features: [
        '6 pages personnalisées',
        'Direction artistique avancée',
        'Animations',
        'Galerie ou réalisations',
        'Avis Google',
        'SEO local renforcé',
      ],
    },
    {
      name: 'Boutique',
      legacyNames: ['E-Commerce'],
      legacyPrices: [1000, 1500, 3490],
      description:
        'Une boutique complète avec catalogue, paiement et gestion des contenus.',
      price: 2490,
      type: 'ADMIN_INTEGRE' as const,
      devTime: 50,
      position: 3,
      includedPages: 8,
      features: [
        'Catalogue produits',
        'Paiement sécurisé',
        'Gestion des commandes',
        'Administration',
        'Design premium',
        'SEO technique',
      ],
    },
  ];

  const packIds = new Map<string, string>();
  const packsNeedingDefaultInclusions = new Set<string>();
  for (const pack of packs) {
    const { legacyNames, legacyPrices, ...data } = pack;
    const current =
      (await prisma.pack.findUnique({ where: { name: data.name } })) ||
      (await prisma.pack.findFirst({
        where: { name: { in: legacyNames } },
      }));
    const shouldMigrate =
      Boolean(current && legacyNames.includes(current.name)) ||
      Boolean(current && legacyPrices.includes(current.price));
    const saved = current
      ? shouldMigrate
        ? await prisma.pack.update({
            where: { id: current.id },
            data,
          })
        : current
      : await prisma.pack.create({ data });
    packIds.set(data.name, saved.id);
    if (!current || shouldMigrate) {
      packsNeedingDefaultInclusions.add(data.name);
    }
    console.log(`  ✅ Pack "${saved.name}" — ${saved.price}€`);
  }

  // ─── Options (one-time) ─────────────────────
  console.log('\n🌱 Seeding options...');
  const options = [
    { name: 'Page supplémentaire', description: 'Conception et intégration d’une page supplémentaire', price: 90, legacyPrices: [50, 70, 140], category: 'contenu', devTime: 1.5 },
    { name: 'Multilangue', description: 'Une langue supplémentaire et son sélecteur', price: 250, legacyPrices: [150, 390], category: 'visibilité', devTime: 4 },
    { name: 'Animations', description: 'Animations et transitions avancées sur les sections clés', price: 190, legacyPrices: [75, 150, 290], category: 'design', devTime: 3 },
    { name: 'Réservation', description: 'Prise de rendez-vous ou réservation en ligne', price: 290, legacyPrices: [100, 180, 390], category: 'conversion', devTime: 5 },
    { name: 'Blog', description: 'Blog administrable avec liste et pages d’articles', price: 390, legacyPrices: [200, 590], category: 'contenu', devTime: 7 },
    { name: 'Galerie', description: 'Galerie photo ou réalisations avec mise en valeur', price: 160, legacyPrices: [100, 150, 240], category: 'preuve', devTime: 2.5 },
    { name: 'Paiement', description: 'Paiement en ligne sécurisé et parcours de confirmation', price: 350, legacyPrices: [100, 200, 490], category: 'vente', devTime: 7 },
    { name: 'Admin', description: 'Back-office personnalisé pour gérer les contenus', price: 590, legacyPrices: [200, 250, 790], category: 'gestion', devTime: 11 },
    { name: 'Google Reviews', description: 'Affichage d’avis Google et lien de collecte', price: 80, legacyPrices: [50, 120], category: 'preuve', devTime: 1 },
    { name: 'SEO', description: 'Optimisation SEO locale renforcée et données structurées', price: 190, legacyPrices: [100, 290], category: 'visibilité', devTime: 3.5 },
    { name: 'Rédaction de contenu', description: 'Aide assistée par IA, réécriture et validation des textes jusqu’à 5 pages', price: 250, legacyPrices: [100, 350], category: 'contenu', devTime: 4 },
    { name: 'Formulaire avancé', description: 'Formulaire de devis qualifiant avec champs conditionnels', price: 120, legacyPrices: [50, 190], category: 'conversion', devTime: 2 },
    { name: 'Catalogue produits', description: 'Catalogue structuré avec catégories et fiches produits', price: 490, legacyPrices: [690], category: 'vente', devTime: 9 },
    { name: 'WhatsApp / appel direct', description: 'Contact immédiat depuis les pages stratégiques', price: 60, legacyPrices: [90], category: 'conversion', devTime: 1 },
  ];

  const optionIds = new Map<string, string>();
  for (const opt of options) {
    const { legacyPrices, ...data } = opt;
    const current = await prisma.serviceOption.findUnique({
      where: { name: data.name },
    });
    const saved = current
      ? legacyPrices.includes(current.price)
        ? await prisma.serviceOption.update({
            where: { id: current.id },
            data: { ...data, recurring: false, active: true },
          })
        : current
      : await prisma.serviceOption.create({
          data: { ...data, recurring: false },
        });
    optionIds.set(data.name, saved.id);
    console.log(`  ✅ Option "${saved.name}" — ${saved.price}€`);
  }

  // ─── Options récurrentes ────────────────────
  console.log('\n🌱 Seeding récurrents...');
  const recurring = [
    { name: 'Maintenance classic', description: 'Mises à jour, contrôle mensuel et petites corrections', price: 19, legacyPrices: [10, 29], category: 'récurrent', devTime: 0, recurring: true, recurringUnit: 'mois' },
    { name: 'Maintenance +', description: 'Suivi renforcé, sauvegardes et support prioritaire', price: 39, legacyPrices: [20, 59], category: 'récurrent', devTime: 0, recurring: true, recurringUnit: 'mois' },
    { name: 'Hébergement & supervision', description: 'Hébergement, SSL et surveillance de disponibilité', price: 15, legacyPrices: [], category: 'récurrent', devTime: 0, recurring: true, recurringUnit: 'mois' },
    { name: 'Frais de domaine', description: 'Nom de domaine (.fr, .com, etc.)', price: 20, legacyPrices: [15], category: 'récurrent', devTime: 0, recurring: true, recurringUnit: 'an' },
  ];

  for (const rec of recurring) {
    const { legacyPrices, ...data } = rec;
    const current = await prisma.serviceOption.findUnique({
      where: { name: data.name },
    });
    const saved = current
      ? legacyPrices.includes(current.price)
        ? await prisma.serviceOption.update({
            where: { id: current.id },
            data: { ...data, active: true },
          })
        : current
      : await prisma.serviceOption.create({ data });
    optionIds.set(data.name, saved.id);
    console.log(`  ✅ Récurrent "${saved.name}" — ${saved.price}€/${saved.recurringUnit}`);
  }

  // Les relations sont ajoutées sans supprimer d'éventuelles personnalisations.
  const packInclusions: Record<string, string[]> = {
    Vitrine: ['Galerie', 'Formulaire avancé'],
    Signature: ['Galerie', 'Formulaire avancé', 'Animations', 'Google Reviews', 'SEO'],
    Boutique: ['Catalogue produits', 'Paiement', 'Admin', 'SEO'],
  };
  for (const [packName, includedNames] of Object.entries(packInclusions)) {
    const packId = packIds.get(packName);
    if (!packId || !packsNeedingDefaultInclusions.has(packName)) continue;
    const data = includedNames
      .map((name) => optionIds.get(name))
      .filter((id): id is string => Boolean(id))
      .map((serviceOptionId) => ({ packId, serviceOptionId }));
    if (data.length) {
      await prisma.packOption.createMany({ data, skipDuplicates: true });
    }
  }

  // ─── Codes Promo ────────────────────────────
  console.log('\n🌱 Seeding codes promo...');
  const promoCodes = [
    {
      code: 'BIENVENUE10',
      name: 'Bienvenue',
      description: 'Réduction de bienvenue pour les nouveaux clients',
      discountType: 'PERCENTAGE' as const,
      discountValue: 10,
      active: true,
    },
    {
      code: 'NOEL2025',
      name: 'Promo de Noël',
      description: "Offre spéciale fêtes de fin d'année",
      discountType: 'PERCENTAGE' as const,
      discountValue: 15,
      startDate: new Date('2025-12-01'),
      endDate: new Date('2025-12-31'),
      maxUses: 50,
      active: true,
    },
    {
      code: 'ETE50',
      name: "Soldes d'été",
      description: "Réduction fixe pour l'été",
      discountType: 'FIXED_VALUE' as const,
      discountValue: 50,
      minAmount: 300,
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-08-31'),
      active: true,
    },
  ];

  for (const promo of promoCodes) {
    const existing = await prisma.promoCode.findUnique({ where: { code: promo.code } });
    if (!existing) {
      await prisma.promoCode.create({ data: promo });
      console.log(`  ✅ Code promo "${promo.code}" — ${promo.discountType === 'PERCENTAGE' ? promo.discountValue + '%' : promo.discountValue + '€'}`);
    } else {
      console.log(`  ℹ️  Code promo "${promo.code}" existe déjà`);
    }
  }

  // ─── Études de cas de démonstration ─────────
  console.log('\n🌱 Seeding portfolio demos...');
  const portfolioDemos = [
    {
      slug: 'restaurant-signature',
      name: 'Restaurant Signature',
      description:
        'Une expérience digitale immersive pour un restaurant indépendant : carte, réservation, galerie et privatisation.',
      tag: 'Restaurant',
      languages: ['Next.js', 'TypeScript', 'Animations', 'Responsive'],
      link: 'https://web-templates-beta.vercel.app/template-restaurant',
      image:
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1400&h=900&fit=crop&q=85',
      clientProblem:
        "Le restaurant doit transmettre son univers avant même la première visite, présenter une carte qui évolue et transformer l'intérêt des visiteurs en réservations.",
      solution:
        "Une vitrine éditoriale en cinq pages avec une carte animée, un parcours de réservation clair, une galerie filtrable, l'histoire du lieu et une offre de privatisation.",
      result:
        'Une démonstration commerciale complète qui permet au restaurateur de se projeter et centralise les principaux leviers de conversion.',
      features: [
        'Carte et menus animés',
        'Parcours de réservation',
        'Galerie filtrable',
        'Présentation du lieu et de l’équipe',
        'Page privatisation',
      ],
      position: 0,
      active: true,
    },
    {
      slug: 'artisans-local',
      name: 'Artisans locaux',
      description:
        'Des vitrines métier pensées pour rassurer, valoriser les réalisations et générer des demandes de devis qualifiées.',
      tag: 'Artisans',
      languages: ['Next.js', 'SEO local', 'Responsive', 'Formulaire'],
      link: 'https://web-templates-beta.vercel.app/template-paysagiste',
      image:
        'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=1400&h=900&q=85',
      clientProblem:
        "Un artisan vit souvent du bouche-à-oreille mais manque d'une vitrine crédible pour montrer son savoir-faire, expliquer ses prestations et capter les recherches locales.",
      solution:
        'Une base adaptable au métier, structurée autour des services, réalisations, zones d’intervention, méthode de travail, avis et demande de devis.',
      result:
        'Une présence professionnelle, rapide à personnaliser, qui rassure les prospects et transforme la visite en prise de contact.',
      features: [
        'Présentation claire des prestations',
        'Galerie de réalisations',
        'Zones d’intervention et SEO local',
        'Formulaire de devis',
        'Déclinaisons paysagiste et plaquiste',
      ],
      position: 1,
      active: true,
    },
  ];

  for (const demo of portfolioDemos) {
    await prisma.project.upsert({
      where: { slug: demo.slug },
      update: {},
      create: demo,
    });
    console.log(`  ✅ Étude de cas "${demo.name}"`);
  }

  console.log('\n✨ Seed terminé !');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
