import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

/** ID para `created_by_user_id` y comprobaciones de propiedad en server actions. */
export async function getDashboardUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

export type DashboardUserContext = {
  id: string;
  email: string;
  name: string | null;
};

export async function getDashboardUserContext(): Promise<DashboardUserContext | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? null,
  };
}
