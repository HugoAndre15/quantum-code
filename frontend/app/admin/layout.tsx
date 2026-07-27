import { AuthProvider } from "@/app/context/AuthContext";
import AdminSidebar from "@/app/admin/components/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div style={{ minHeight: "100vh", background: "var(--black)", display: "flex" }}>
        <AdminSidebar />
        <main style={{ marginLeft: 220, flex: 1, padding: 28, minWidth: 0 }}>
          {children}
        </main>
      </div>
    </AuthProvider>
  );
}
