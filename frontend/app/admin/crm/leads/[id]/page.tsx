import { redirect } from "next/navigation";

export default async function LegacyLeadDetailsPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  redirect(`/admin/crm/prospects/${params.id}`);
}
