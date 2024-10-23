export default function Home() {
    return (
      <div>
        <header className="bg-blue-600 p-4 text-white text-center">
          <h1 className="text-4xl font-bold">Quantum Code</h1>
          <p>Freelance Developer - Bringing Your Ideas to Life</p>
        </header>
        <main className="p-6">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold">Mes Réalisations</h2>
            {/* Galerie d'images */}
          </section>
          <section className="mb-8">
            <h2 className="text-2xl font-semibold">Services</h2>
            {/* Description des services */}
          </section>
        </main>
      </div>
    );
  }
  