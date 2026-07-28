"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import AdminSidebar from "@/app/admin/components/AdminSidebar";

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      const requestedPath = pathname?.startsWith("/admin")
        ? pathname
        : "/admin";
      router.replace(`/login?next=${encodeURIComponent(requestedPath)}`);
    }
  }, [loading, pathname, router, user]);

  if (loading || !user) {
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
          {loading ? "Vérification de la session..." : "Redirection..."}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--black)",
        display: "flex",
      }}
    >
      <AdminSidebar />
      <main style={{ marginLeft: 220, flex: 1, padding: 28, minWidth: 0 }}>
        {children}
      </main>
    </div>
  );
}
