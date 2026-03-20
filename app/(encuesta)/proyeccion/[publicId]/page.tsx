import { ProjectionClient } from "@/components/encuesta/projection-client";

export default async function ProyeccionPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  return <ProjectionClient publicId={publicId} />;
}
