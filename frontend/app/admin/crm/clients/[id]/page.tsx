import ClientEditor from "../ClientEditor";

export default async function ClientDetailsPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  return <ClientEditor clientId={params.id} />;
}
