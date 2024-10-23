import Link from 'next/link';
import Image from 'next/image'; // Import du composant Image de Next.js

export default function Navbar() {
  return (
    <nav className="bg-gray-800 p-4 text-white">
      <div className="container mx-auto flex justify-between items-center">
        {/* Liens de navigation */}
        <ul className="flex space-x-4">
          <li><Link href="/">Accueil</Link></li>
          <li><Link href="/portfolio">Portfolio</Link></li>
          <li><Link href="/services">Services</Link></li>
          <li><Link href="/devis">Devis</Link></li>
          <li><Link href="/dashboard">Dashboard</Link></li>
        </ul>

        {/* Section à droite avec l'image et les boutons */}
        <div className="flex items-center space-x-4">
          {/* Boutons Login et Sign Up */}
          <div className="flex space-x-2">
            <Link href="/login">
              <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                Login
              </button>
            </Link>
            <Link href="/signup">
              <button className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
                Sign Up
              </button>
            </Link>
          </div>

          {/* Image (utilise un lien ou un fichier local) */}
          <div className="relative w-10 h-10">
            <Image
              src="/images/logo-q-code.png"
              alt="Logo"
              layout="fill"
              objectFit="cover"
              className="rounded-full"
            />
          </div>
        </div>
      </div>
    </nav>
  );
}
