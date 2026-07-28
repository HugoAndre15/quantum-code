"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  soon?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Général",
    items: [
      { href: "/admin", label: "Dashboard", icon: "◆" },
      { href: "/admin/conversions", label: "Conversions", icon: "↗" },
    ],
  },
  {
    label: "CRM",
    items: [
      { href: "/admin/crm/leads", label: "Leads", icon: "◎" },
      { href: "/admin/crm/clients", label: "Clients", icon: "◇" },
      { href: "/admin/crm/projects", label: "Projets", icon: "◈" },
    ],
  },
  {
    label: "Ventes",
    items: [
      { href: "/admin/sales/quotes", label: "Devis", icon: "▤" },
      { href: "/admin/sales/invoices", label: "Factures", icon: "▥" },
      { href: "/admin/sales/payments", label: "Paiements", icon: "✦" },
      { href: "/admin/sales/subscriptions", label: "Abonnements", icon: "↻" },
    ],
  },
  {
    label: "Offres",
    items: [
      { href: "/admin/offers/packages", label: "Packs & Options", icon: "▣" },
      { href: "/admin/offers/promotions", label: "Promotions", icon: "%" },
    ],
  },
  {
    label: "Portfolio",
    items: [
      { href: "/admin/portfolio/items", label: "Projets", icon: "◉" },
      { href: "/admin/portfolio/reviews", label: "Avis clients", icon: "★" },
    ],
  },
  {
    label: "Paramètres",
    items: [
      {
        href: "/admin/settings/crm",
        label: "Paramètres CRM",
        icon: "⚙",
      },
    ],
  },
];

export default function AdminSidebar() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

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
        <div style={{ color: "var(--grey-3)", fontSize: 14 }}>Chargement...</div>
      </div>
    );
  }

  if (!user) return null;

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname?.startsWith(href) ?? false;
  };

  return (
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
        overflowY: "auto",
      }}
    >
      {/* Logo */}
      <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid var(--border)" }}>
        <Link href="/admin" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
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
            <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Q</span>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--white)", letterSpacing: "-.02em" }}>
            Quantum <b style={{ color: "var(--blue)" }}>Admin</b>
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "12px 10px" }}>
        {NAV_GROUPS.map((group) => (
          <div key={group.label} style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: "var(--grey-4)",
                letterSpacing: ".1em",
                textTransform: "uppercase",
                padding: "0 12px",
                marginBottom: 4,
              }}
            >
              {group.label}
            </div>
            {group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 12px",
                    borderRadius: 6,
                    marginBottom: 1,
                    textDecoration: "none",
                    fontSize: 13,
                    fontWeight: active ? 600 : 400,
                    color: item.soon ? "var(--grey-3)" : active ? "var(--white)" : "var(--grey-3)",
                    background: active ? "rgba(45,111,255,.1)" : "transparent",
                    opacity: item.soon ? 0.45 : 1,
                    pointerEvents: item.soon ? "none" : "auto",
                    transition: "all .15s",
                  }}
                >
                  <span style={{ fontSize: 11, opacity: 0.7 }}>{item.icon}</span>
                  <span>{item.label}</span>
                  {item.soon && (
                    <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4, background: "var(--black-3)", color: "var(--grey-3)", marginLeft: "auto" }}>
                      Bientôt
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: "12px 10px", borderTop: "1px solid var(--border)" }}>
        <div style={{ padding: "8px 12px", marginBottom: 4 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--white)" }}>{user.name}</div>
          <div style={{ fontSize: 11, color: "var(--grey-3)" }}>{user.role}</div>
        </div>
        <button
          onClick={logout}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderRadius: 6,
            fontSize: 12,
            color: "var(--grey-3)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            textAlign: "left",
            fontFamily: "var(--font-sans)",
            transition: "color .15s",
          }}
        >
          ⬡ Déconnexion
        </button>
      </div>
    </aside>
  );
}
