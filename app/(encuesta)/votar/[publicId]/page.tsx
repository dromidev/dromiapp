import { VoteForm } from "@/components/encuesta/vote-form";

export default async function VotarPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="font-serif text-2xl font-semibold text-white">Votación</h1>
      <div className="mt-8">
        <VoteForm publicId={publicId} />
      </div>
    </div>
  );
}
