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
      <p className="mt-2 text-sm text-zinc-400">
        Si entraste con el <strong className="text-zinc-300">QR</strong>, solo
        debes escribir el <strong className="text-zinc-300">código único de tu apartamento</strong>{" "}
        (el que figura en el listado que cargó la administración). Si abriste el
        enlace a mano, también necesitarás el código de acceso de la votación.
      </p>
      <div className="mt-8">
        <VoteForm publicId={publicId} />
      </div>
    </div>
  );
}
