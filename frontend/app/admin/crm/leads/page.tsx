import { redirect } from "next/navigation";

export default function LegacyLeadsPage() {
  redirect("/admin/crm/prospects");
}
