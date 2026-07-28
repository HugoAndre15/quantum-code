"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";

function getSafeDestination() {
  if (typeof window === "undefined") return "/admin";

  const next = new URLSearchParams(window.location.search).get("next");
  return next?.startsWith("/admin") && !next.startsWith("//")
    ? next
    : "/admin";
}

export default function LoginPage() {
  const { user, loading: authLoading, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace(getSafeDestination());
    }
  }, [authLoading, router, user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.replace(getSafeDestination());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--black)",
          color: "var(--grey-3)",
          fontSize: 14,
        }}
      >
        {authLoading ? "Vérification de la session..." : "Redirection vers le dashboard..."}
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--black)",
        padding: "20px",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: 400,
          background: "var(--black-2)",
          border: "1px solid var(--border-2)",
          borderRadius: "var(--r-l)",
          padding: "40px 32px",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 48,
              height: 48,
              background: "var(--blue)",
              borderRadius: "var(--r-m)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>
              Q
            </span>
          </div>
          <h1
            style={{ fontSize: 22, fontWeight: 700, color: "var(--white)", marginBottom: 6 }}
          >
            Admin
          </h1>
          <p style={{ fontSize: 13, color: "var(--grey-3)" }}>
            Connexion à l&apos;espace d&apos;administration
          </p>
        </div>

        {error && (
          <div
            style={{
              background: "rgba(255,80,80,.12)",
              border: "1px solid rgba(255,80,80,.3)",
              borderRadius: "var(--r)",
              padding: "10px 14px",
              marginBottom: 20,
              fontSize: 13,
              color: "#ff6b6b",
            }}
          >
            {error}
          </div>
        )}

        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--grey-2)", letterSpacing: ".04em", marginBottom: 6 }}>
          Email
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@quantumcode.dev"
          style={{
            width: "100%",
            padding: "10px 14px",
            background: "var(--black-3)",
            border: "1px solid var(--border-2)",
            borderRadius: "var(--r)",
            color: "var(--white)",
            fontSize: 14,
            fontFamily: "var(--font-sans)",
            marginBottom: 16,
            outline: "none",
          }}
        />

        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--grey-2)", letterSpacing: ".04em", marginBottom: 6 }}>
          Mot de passe
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          style={{
            width: "100%",
            padding: "10px 14px",
            background: "var(--black-3)",
            border: "1px solid var(--border-2)",
            borderRadius: "var(--r)",
            color: "var(--white)",
            fontSize: 14,
            fontFamily: "var(--font-sans)",
            marginBottom: 24,
            outline: "none",
          }}
        />

        <button
          type="submit"
          disabled={loading}
          className="btn btn-blue"
          style={{ width: "100%", opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "Connexion..." : "Se connecter"}
        </button>

        <div style={{ marginTop: 20, textAlign: "center" }}>
          <Link href="/" style={{ fontSize: 12, color: "var(--grey-3)" }}>
            ← Retour au site
          </Link>
        </div>
      </form>
    </div>
  );
}
