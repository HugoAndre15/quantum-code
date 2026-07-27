import { redirect } from "next/navigation";

// /dashboard redirige vers /admin (la vraie dashboard)
export default function DashboardPage() {
  redirect("/admin");
}
