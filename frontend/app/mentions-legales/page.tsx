import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Mentions légales | Quantum Code",
  description: "Mentions légales du site Quantum Code.",
};

export default function LegalNoticePage() {
  return (
    <LegalPage title="Mentions légales" updatedAt="28 juillet 2026">
      <section>
        <h2>1. Éditeur du site</h2>
        <p>
          Le site <strong>quantum-code.fr</strong> est édité par Quantum Code,
          entreprise individuelle représentée par Hugo André.
        </p>
        <ul>
          <li>Nom commercial : Quantum Code</li>
          <li>Forme juridique : entrepreneur individuel</li>
          <li>SIRET : 102 934 916 00010</li>
          <li>Siège : Oise, Hauts-de-France, France</li>
          <li>Email : <a href="mailto:contact@quantum-code.fr">contact@quantum-code.fr</a></li>
          <li>Téléphone : <a href="tel:+33603681198">+33 6 03 68 11 98</a></li>
          <li>Directeur de la publication : Hugo André</li>
        </ul>
      </section>

      <section>
        <h2>2. Hébergement</h2>
        <p>
          Le frontend du site est hébergé par Vercel Inc., 340 S Lemon Ave
          #4133, Walnut, CA 91789, États-Unis. Les services applicatifs et les
          données métier peuvent être opérés par des prestataires techniques
          sélectionnés par Quantum Code dans le cadre strict de la fourniture du
          service.
        </p>
      </section>

      <section>
        <h2>3. Propriété intellectuelle</h2>
        <p>
          Les textes, éléments graphiques, logos, interfaces, démonstrations et
          développements présentés sur ce site sont protégés par le droit de la
          propriété intellectuelle. Toute reproduction ou exploitation sans
          autorisation écrite préalable est interdite, hors exceptions prévues
          par la loi.
        </p>
      </section>

      <section>
        <h2>4. Responsabilité</h2>
        <p>
          Quantum Code s’efforce de fournir des informations exactes et à jour,
          mais ne garantit pas l’absence d’erreur ou d’interruption. Les
          estimations fournies par le simulateur sont indicatives et ne
          constituent pas un devis contractuel.
        </p>
      </section>

      <section>
        <h2>5. Données personnelles</h2>
        <p>
          Les modalités de collecte et de traitement des données sont détaillées
          dans la <a href="/politique-confidentialite">politique de confidentialité</a>.
        </p>
      </section>
    </LegalPage>
  );
}
