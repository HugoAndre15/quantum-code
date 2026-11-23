import QuoteEditor from "../QuoteEditor";

export default async function QuoteDetailsPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  return <QuoteEditor quoteId={params.id} />;
}
