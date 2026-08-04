import { redirect } from "next/navigation";

export default function LegacyLeadDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/admin/crm/prospects/${params.id}`);
}
