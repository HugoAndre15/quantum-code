'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

type State = 'loading' | 'success' | 'already' | 'expired' | 'error';

interface SuccessData {
  message: string;
  devisId: string;
  projectId: string;
  clientId: string;
}

export default function AcceptDevisPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<State>('loading');
  const [data, setData] = useState<SuccessData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) return;

    fetch(`/api/devis/accept/${token}`, { method: 'POST' })
      .then(async (res) => {
        const body = await res.json();
        if (res.ok) {
          if (body.message?.includes('déjà')) {
            setState('already');
          } else {
            setData(body);
            setState('success');
          }
        } else {
          const msg: string = body?.message ?? 'Une erreur est survenue';
          if (msg.toLowerCase().includes('expiré') || msg.toLowerCase().includes('expire')) {
            setState('expired');
          } else {
            setErrorMsg(msg);
            setState('error');
          }
        }
      })
      .catch(() => {
        setErrorMsg('Impossible de contacter le serveur. Vérifiez votre connexion.');
        setState('error');
      });
  }, [token]);

  return (
    <main className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 text-center">
        <div className="mb-6">
          <span className="text-2xl font-bold text-white tracking-tight">Quantum Code</span>
        </div>

        {state === 'loading' && (
          <>
            <div className="mx-auto mb-4 w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-white/70 text-sm">Traitement de votre acceptation…</p>
          </>
        )}

        {state === 'success' && (
          <>
            <div className="mx-auto mb-4 w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-white mb-2">Devis accepté !</h1>
            <p className="text-white/60 text-sm mb-6">
              Merci pour votre confiance. Votre projet a été créé et nous allons prendre contact avec vous très prochainement pour démarrer la collaboration.
            </p>
            <Link
              href="/"
              className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-3 rounded-lg transition-colors text-sm"
            >
              Revenir au site
            </Link>
          </>
        )}

        {state === 'already' && (
          <>
            <div className="mx-auto mb-4 w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-white mb-2">Devis déjà accepté</h1>
            <p className="text-white/60 text-sm mb-6">
              Ce devis a déjà été accepté. Votre projet est en cours de traitement.
            </p>
            <Link href="/" className="inline-block bg-white/10 hover:bg-white/20 text-white font-medium px-6 py-3 rounded-lg transition-colors text-sm">
              Revenir au site
            </Link>
          </>
        )}

        {state === 'expired' && (
          <>
            <div className="mx-auto mb-4 w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-white mb-2">Lien expiré</h1>
            <p className="text-white/60 text-sm mb-6">
              Ce lien d&apos;acceptation a expiré (validité : 30 jours). Contactez-nous pour recevoir un nouveau devis.
            </p>
            <Link href="/contact" className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-3 rounded-lg transition-colors text-sm">
              Nous contacter
            </Link>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="mx-auto mb-4 w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-white mb-2">Lien invalide</h1>
            <p className="text-white/60 text-sm mb-6">{errorMsg || 'Ce lien est invalide ou a déjà été utilisé.'}</p>
            <Link href="/" className="inline-block bg-white/10 hover:bg-white/20 text-white font-medium px-6 py-3 rounded-lg transition-colors text-sm">
              Revenir au site
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
