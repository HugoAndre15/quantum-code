export default function Portfolio() {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-4">Portfolio</h1>
        <p>Voici quelques-unes de mes réalisations récentes :</p>
        {/* Composant de galerie */}
        <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
            <h3 className="text-xl font-semibold">Projet 1</h3>
            <p className="text-gray-600">Description du projet ici.</p>
        </div>

      </div>
    );
  }
  