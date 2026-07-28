import ClientEditor from "../ClientEditor";

export default function ClientDetailsPage({ params }: { params: { id: string } }) {
  return <ClientEditor clientId={params.id} />;
}
