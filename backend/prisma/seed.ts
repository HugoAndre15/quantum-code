import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  // ─── Admin user ─────────────────────────────
  const email = process.env.ADMIN_EMAIL ?? 'admin@quantumcode.dev';
  const password = process.env.ADMIN_PASSWORD ?? 'Admin2026!';
  const name = process.env.ADMIN_NAME ?? 'Admin Quantum Code';

  if (!process.env.ADMIN_PASSWORD) {
    console.warn('⚠️  ADMIN_PASSWORD not set in .env, using default password.');
  }

  const exists = await prisma.user.findUnique({ where: { email } });

  if (!exists) {
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

  // ─── Packs ──────────────────────────────────
  console.log('\n🌱 Seeding packs...');
  const packs = [
    {
      name: 'Présence en ligne',
      description: '1 page, formulaire simple, Google Maps, Responsive',
      price: 200,
      type: 'CLASSIQUE' as const,
      devTime: 6,
      position: 0,
      features: ['1 page', 'Formulaire simple', 'Google Maps', 'Design responsive'],
    },
    {
      name: 'Site Vitrine',
      description: '3 pages, galerie, formulaire avancé, SEO',
      price: 400,
      type: 'CLASSIQUE' as const,
      devTime: 14,
      position: 1,
      features: ['3 pages', 'Galerie', 'Formulaire avancé', 'SEO', 'Design responsive'],
    },
    {
      name: 'Business',
      description: '4/5 pages, galerie, SEO, Google Reviews, formulaire avancé',
      price: 600,
      type: 'ADMIN_INTEGRE' as const,
      devTime: 25,
      position: 2,
      features: ['4 à 5 pages', 'Galerie', 'SEO', 'Google Reviews', 'Formulaire avancé', 'Design responsive'],
    },
    {
      name: 'E-Commerce',
      description: 'Paiement en ligne, administration, rédaction de contenu',
      price: 1000,
      type: 'ADMIN_INTEGRE' as const,
      devTime: 45,
      position: 3,
      features: ['Paiement en ligne', 'Admin intégré', 'Rédaction de contenu', 'Design premium', 'SEO', 'Design responsive'],
    },
  ];

  for (const pack of packs) {
    await prisma.pack.upsert({
      where: { name: pack.name },
      update: pack,
      create: pack,
    });
    console.log(`  ✅ Pack "${pack.name}" — ${pack.price}€`);
  }

  // ─── Options (one-time) ─────────────────────
  console.log('\n🌱 Seeding options...');
  const options = [
    { name: 'Page supplémentaire', description: 'Ajout d\'une page supplémentaire au site', price: 50, category: 'contenu', devTime: 3 },
    { name: 'Multilangue', description: 'Traduction du site en une langue supplémentaire', price: 150, category: 'contenu', devTime: 6 },
    { name: 'Animations', description: 'Animations et transitions avancées', price: 75, category: 'design', devTime: 5 },
    { name: 'Réservation', description: 'Module de réservation en ligne', price: 180, category: 'fonctionnalité', devTime: 8 },
    { name: 'Blog', description: 'Section blog avec gestion des articles', price: 200, category: 'fonctionnalité', devTime: 10 },
    { name: 'Galerie', description: 'Galerie photo / portfolio', price: 100, category: 'contenu', devTime: 5 },
    { name: 'Paiement', description: 'Intégration d\'un module de paiement en ligne', price: 200, category: 'fonctionnalité', devTime: 8 },
    { name: 'Admin', description: 'Back-office d\'administration personnalisé', price: 250, category: 'fonctionnalité', devTime: 12 },
    { name: 'Google Reviews', description: 'Affichage des avis Google sur le site', price: 50, category: 'fonctionnalité', devTime: 3 },
    { name: 'SEO', description: 'Optimisation du référencement naturel', price: 100, category: 'fonctionnalité', devTime: 4 },
    { name: 'Rédaction de contenu', description: 'Rédaction des textes et contenus du site', price: 100, category: 'contenu', devTime: 6 },
    { name: 'Formulaire avancé', description: 'Formulaire personnalisé avec champs multiples', price: 50, category: 'fonctionnalité', devTime: 3 },
  ];

  for (const opt of options) {
    await prisma.serviceOption.upsert({
      where: { name: opt.name },
      update: { ...opt, recurring: false },
      create: { ...opt, recurring: false },
    });
    console.log(`  ✅ Option "${opt.name}" — ${opt.price}€`);
  }

  // ─── Options récurrentes ────────────────────
  console.log('\n🌱 Seeding récurrents...');
  const recurring = [
    { name: 'Maintenance classic', description: 'Maintenance de base et mises à jour', price: 10, category: 'récurrent', devTime: 0, recurring: true, recurringUnit: 'mois' },
    { name: 'Maintenance +', description: 'Maintenance avancée avec support prioritaire', price: 20, category: 'récurrent', devTime: 0, recurring: true, recurringUnit: 'mois' },
    { name: 'Frais de domaine', description: 'Nom de domaine (.fr, .com, etc.)', price: 15, category: 'récurrent', devTime: 0, recurring: true, recurringUnit: 'an' },
  ];

  for (const rec of recurring) {
    await prisma.serviceOption.upsert({
      where: { name: rec.name },
      update: rec,
      create: rec,
    });
    console.log(`  ✅ Récurrent "${rec.name}" — ${rec.price}€/${rec.recurringUnit}`);
  }

  console.log('\n✨ Seed terminé !');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
