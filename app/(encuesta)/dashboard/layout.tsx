import { redirect } from "next/navigation";
import { getEncuestaServerSession } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const result = await getEncuestaServerSession();

  if (!result.ok) {
    redirect("/login?error=config");
  }

  if (!result.session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard");
  }

  return children;
}
