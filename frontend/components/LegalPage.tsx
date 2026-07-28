import Link from "next/link";

export default function LegalPage({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}) {
  return (
    <main className="legal-page">
      <div className="legal-shell">
        <Link href="/" className="legal-back">← Retour à Quantum Code</Link>
        <div className="s-label">Informations juridiques</div>
        <h1>{title}</h1>
        <p className="legal-updated">Dernière mise à jour : {updatedAt}</p>
        <div className="legal-content">{children}</div>
      </div>
    </main>
  );
}
