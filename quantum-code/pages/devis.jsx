export default function Devis() {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-4">Demander un devis</h1>
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Nom du projet</label>
            <input type="text" className="mt-1 block w-full border-gray-300 rounded-md text-black" />
          </div>
          <div>
            <label className="block text-sm font-medium">Budget</label>
            <input type="number" className="mt-1 block w-full border-gray-300 rounded-md text-black" />
          </div>
          <button className="bg-blue-600 text-white py-2 px-4 rounded-md">Envoyer</button>
        </form>
      </div>
    );
  }
  