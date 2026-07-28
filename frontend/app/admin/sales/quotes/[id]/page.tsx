import QuoteEditor from "../QuoteEditor";

export default function QuoteDetailsPage({ params }: { params: { id: string } }) {
  return <QuoteEditor quoteId={params.id} />;
}
