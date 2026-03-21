import { VoteForm } from "@/components/encuesta/vote-form";

export default async function VotarPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col px-4 py-8 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-6 sm:py-10 md:py-12">
      <h1 className="text-center font-serif text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        Votación
      </h1>
      <div className="mt-6 w-full sm:mt-8">
        <VoteForm publicId={publicId} />
      </div>
    </div>
  );
}
