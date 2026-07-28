import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Politique de confidentialité | Quantum Code",
  description: "Politique de confidentialité et traitement des données de Quantum Code.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Politique de confidentialité" updatedAt="28 juillet 2026">
      <section>
        <h2>1. Responsable du traitement</h2>
        <p>
          Le responsable du traitement est Quantum Code, entreprise individuelle
          représentée par Hugo André. Pour toute question relative à vos données :
          <a href="mailto:contact@quantum-code.fr"> contact@quantum-code.fr</a>.
        </p>
      </section>

      <section>
        <h2>2. Données collectées</h2>
        <p>Selon votre utilisation du site, Quantum Code peut collecter :</p>
        <ul>
          <li>vos nom, prénom, société, email, téléphone et adresse ;</li>
          <li>les informations décrivant votre projet, votre budget et vos délais ;</li>
          <li>les choix effectués dans le simulateur de prix ;</li>
          <li>la page d’arrivée, le site référent et les paramètres UTM ;</li>
          <li>des données techniques de navigation limitées, comme le type d’appareil.</li>
        </ul>
      </section>

      <section>
        <h2>3. Finalités et bases légales</h2>
        <ul>
          <li>répondre aux demandes et préparer un devis : mesures précontractuelles ;</li>
          <li>gérer les clients, projets, factures et paiements : exécution du contrat et obligations légales ;</li>
          <li>mesurer les parcours de conversion et améliorer le site : intérêt légitime ;</li>
          <li>prévenir les abus et sécuriser les services : intérêt légitime.</li>
        </ul>
      </section>

      <section>
        <h2>4. Durées de conservation</h2>
        <ul>
          <li>prospects et demandes sans suite : jusqu’à 3 ans après le dernier contact ;</li>
          <li>données contractuelles : pendant la relation commerciale puis la durée nécessaire à la défense des droits ;</li>
          <li>factures et pièces comptables : 10 ans conformément aux obligations légales ;</li>
          <li>données de parcours de conversion : 13 mois maximum.</li>
        </ul>
      </section>

      <section>
        <h2>5. Destinataires et sous-traitants</h2>
        <p>
          Les données sont accessibles uniquement à Quantum Code et aux
          prestataires indispensables au fonctionnement du service, notamment
          l’hébergement, la base de données, l’envoi d’emails, la facturation et
          le paiement. Ces prestataires agissent selon leurs obligations
          contractuelles et de sécurité.
        </p>
      </section>

      <section>
        <h2>6. Transferts hors Union européenne</h2>
        <p>
          Certains prestataires peuvent traiter des données hors de l’Union
          européenne. Dans ce cas, Quantum Code s’appuie sur les garanties
          prévues par le RGPD, notamment les décisions d’adéquation ou les
          clauses contractuelles types.
        </p>
      </section>

      <section>
        <h2>7. Vos droits</h2>
        <p>
          Vous disposez des droits d’accès, de rectification, d’effacement,
          d’opposition, de limitation et, lorsque cela s’applique, de
          portabilité. Vous pouvez les exercer à
          <a href="mailto:contact@quantum-code.fr"> contact@quantum-code.fr</a>.
          Vous pouvez également déposer une réclamation auprès de la CNIL.
        </p>
      </section>

      <section>
        <h2>8. Cookies et mesure d’audience</h2>
        <p>
          Le site utilise des cookies strictement nécessaires à
          l’authentification de l’administration. Le suivi de conversion
          interne utilise un identifiant aléatoire conservé dans le stockage de
          session du navigateur et supprimé à la fermeture de l’onglet. Il sert
          uniquement à relier les étapes d’un même parcours, sans publicité ni
          profilage intersites.
        </p>
      </section>
    </LegalPage>
  );
}
