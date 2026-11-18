# Envoyer un contrat de création de site

Le bouton **Envoyer le contrat à signer** est réservé aux ventes à des professionnels négociées entièrement à distance. Il ne convient pas aux consommateurs ni au démarchage physique, même si le client signe ensuite sur internet. Voir la [fiche DGCCRF sur les petits professionnels](https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/petits-professionnels-vous-avez-14-jours-pour-vous-retracter-en-cas-de-contrat-conclu-hors-etablissement). Faire relire les conditions pour l’activité réelle.

## Avant la première invitation

1. Vérifier l’identité du prestataire, le SIRET, le régime de TVA et les modalités commerciales. Régler `CONTRACT_ISSUER_ADDRESS` sur le backend avec l’adresse professionnelle complète.
2. Renseigner la raison sociale, le contact, l’adresse de facturation et l’email du client. Vérifier le périmètre dans les lignes et les notes du devis, les prix ponctuels, les abonnements et les délais. Si le client a besoin d’hébergement géré ou de maintenance, faire accepter une annexe qui précise le service, la sortie et la restitution des accès. Prévoir aussi un accord de sous-traitance de données lorsque nécessaire.
3. En préproduction, générer le client Prisma, vérifier le schéma et tester la création de la colonne optionnelle `Devis.contractOffer` et de la table `DevisSignature` avant la mise en production. Les devis historiques ne sont pas réécrits. Faire les essais avec une boîte interne et un transport de test.

## Dans le CRM

- **Ventes → Devis → Envoyer le contrat à signer** : fige la proposition et les CGV, puis transmet au client une invitation personnelle avec PDF. **Envoyer le PDF** seul ne demande pas la signature.
- Le client lit l’offre, saisit son nom et sa qualité, confirme les deux déclarations et signe. Le PDF signé, téléchargeable par les deux parties, est archivé tel quel. L’envoi de sa copie par email est distinct : son éventuel échec n’annule pas la signature. Le lien est confidentiel.
- Le dispositif est une signature électronique simple : pas de vérification d’identité indépendante ni de certificat qualifié. Pour une affaire exigeant une preuve d’identité plus forte, choisir un prestataire adapté.
- Pour modifier une offre déjà envoyée, la remettre en brouillon si nécessaire, la corriger et renvoyer une invitation. Le CRM ne permet pas de modifier un contrat signé. Pour une nouvelle prestation ou un avenant : faire accepter un nouveau document.
- Les anciennes invitations non signées doivent être réémises. Un devis accepté avant cette fonctionnalité n’est pas présenté comme ayant les nouvelles CGV signées.
- Pour changer les clauses, modifier le texte canonique dans `backend/src/devis/contract.ts`, incrémenter sa version et actualiser les éventuels modèles papier. Un lien déjà émis garde sa version tant qu’il n’est pas renouvelé.

## Si un email manque

Le formulaire de contact envoie une notification interne à `MAIL_ADMIN_TO`, ou en son absence à `MAIL_FROM`. L’adresse fournie dans le formulaire sert à répondre, ce n’est pas le destinataire d’un accusé de réception. Les invitations de signature sont envoyées à l’adresse client du devis. Dans **Brevo → Transactionnel → Logs**, retrouver l’heure, le destinataire et le dernier événement. Une acceptation par l’API n’atteste pas du classement en boîte de réception. [Aide Brevo](https://help.brevo.com/hc/fr/articles/360021533839).
