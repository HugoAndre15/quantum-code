import { useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: "◆" },
  { href: "/admin/clients", label: "Clients", icon: "◇" },
  { href: "/admin/offers", label: "Offres", icon: "▣" },
  { href: "/admin/devis", label: "Devis", icon: "▤" },
  { href: "/admin/factures", label: "Factures", icon: "▥" },
  { href: "/admin/promo-codes", label: "Codes Promo", icon: "✦" },
  { href: "/admin/portfolio", label: "Portfolio", icon: "◈" },
];

export default function AdminLayout({ children, title }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--black)",
        }}
      >
        <div style={{ color: "var(--grey-3)", fontSize: 14 }}>
          Chargement...
        </div>
      </div>
    );
  }

  if (!user) return null;

  const isActive = (href) => {
    if (href === "/admin") return router.pathname === "/admin";
    return router.pathname.startsWith(href);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--black)",
        display: "flex",
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: 220,
          minHeight: "100vh",
          background: "var(--black-2)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 100,
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: "20px 20px 16px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <Link
            href="/admin"
            style={{
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                background: "var(--blue)",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
                Q
              </span>
            </div>
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "var(--white)",
                letterSpacing: "-.02em",
              }}
            >
              Quantum <b style={{ color: "var(--blue)" }}>Admin</b>
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 10px" }}>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 12px",
                  borderRadius: 6,
                  marginBottom: 2,
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  color: item.soon
                    ? "var(--grey-3)"
                    : active
                      ? "var(--white)"
                      : "var(--grey-3)",
                  background: active ? "rgba(45,111,255,.1)" : "transparent",
                  opacity: item.soon ? 0.45 : 1,
                  pointerEvents: item.soon ? "none" : "auto",
                  transition: "all .15s",
                }}
              >
                <span style={{ fontSize: 12, opacity: 0.7 }}>{item.icon}</span>
                <span>{item.label}</span>
                {item.soon && (
                  <span
                    style={{
                      fontSize: 9,
                      padding: "1px 6px",
                      borderRadius: 4,
                      background: "var(--black-3)",
                      color: "var(--grey-3)",
                      marginLeft: "auto",
                    }}
                  >
                    Bientôt
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div
          style={{
            padding: "14px 16px",
            borderTop: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--white)",
              marginBottom: 2,
            }}
          >
            {user.name}
          </div>
          <div
            style={{ fontSize: 11, color: "var(--grey-3)", marginBottom: 10 }}
          >
            {user.email}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link
              href="/"
              style={{
                fontSize: 11,
                color: "var(--grey-3)",
                textDecoration: "none",
              }}
            >
              ← Site
            </Link>
            <button
              onClick={logout}
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#ff6b6b",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                marginLeft: "auto",
              }}
            >
              Déconnexion
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, marginLeft: 220 }}>
        {/* Top bar */}
        <header
          style={{
            height: 56,
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            padding: "0 32px",
            background: "var(--black)",
            position: "sticky",
            top: 0,
            zIndex: 50,
          }}
        >
          <h1
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "var(--white)",
              margin: 0,
            }}
          >
            {title || "Dashboard"}
          </h1>
        </header>

        {/* Page content */}
        <main style={{ padding: "28px 32px" }}>{children}</main>
      </div>
    </div>
  );
}
