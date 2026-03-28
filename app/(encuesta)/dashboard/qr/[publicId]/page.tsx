import { notFound } from "next/navigation";
import {
  getQuestionPresentationPayload,
  getQuestionPresentationQr,
} from "@/lib/question-presentation-qr";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const payload = await getQuestionPresentationPayload(publicId);
  if (!payload) return { title: "QR" };
  return {
    title: `QR · ${payload.title.slice(0, 60)}${payload.title.length > 60 ? "…" : ""}`,
  };
}

export default async function DashboardQuestionQrPresentationPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const data = await getQuestionPresentationQr(publicId);
  if (!data) notFound();

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#f4f6f9] text-slate-900">
      <header className="shrink-0 border-b border-slate-200 bg-white/90 px-6 py-4 text-center backdrop-blur">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
          Votación — escanea con la cámara
        </p>
        <h1 className="mt-1 text-balance text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl md:text-3xl">
          {data.title}
        </h1>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6 sm:p-10">
        <div className="flex w-full max-w-[min(92vmin,920px)] items-center justify-center rounded-2xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-200/60 sm:p-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.dataUrl}
            alt={`Código QR para votar: ${data.title}`}
            width={1024}
            height={1024}
            className="h-auto w-full max-h-[min(78dvh,78vw)] object-contain"
          />
        </div>
        <p className="max-w-lg text-center text-sm text-slate-600">
          Mantén esta ventana a pantalla completa (F11) para proyectar el código.
        </p>
      </main>
    </div>
  );
}
