import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  AdminConjuntosPanel,
  type AdminMeetingRowInput,
} from "@/components/admin/admin-conjuntos-panel";
import { authOptions } from "@/lib/auth-options";
import { isAdministratorHost, isLocalDevAppHost } from "@/lib/hosts";
import { listMeetingsForAdminAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const h = (await headers()).get("host") ?? "";
  if (!isAdministratorHost(h) && !isLocalDevAppHost(h)) {
    redirect("/");
  }

  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "superadmin") {
    redirect("/login?callbackUrl=/admin");
  }

  const rows = await listMeetingsForAdminAction();

  const initialRows: AdminMeetingRowInput[] = rows.map((r) => ({
    meetingId: r.meetingId,
    title: r.title,
    meetingDate:
      r.meetingDate instanceof Date
        ? r.meetingDate.toISOString()
        : new Date(r.meetingDate).toISOString(),
    actaStepsCompleted: r.actaStepsCompleted,
    actaUpdatedAt: r.actaUpdatedAt
      ? r.actaUpdatedAt instanceof Date
        ? r.actaUpdatedAt.toISOString()
        : new Date(r.actaUpdatedAt).toISOString()
      : null,
    isActive: r.isActive,
    organizationName: r.organizationName,
    ownerEmail: r.ownerEmail,
    ownerName: r.ownerName,
  }));

  return (
    <AdminConjuntosPanel
      initialRows={initialRows}
      userEmail={session.user.email ?? ""}
    />
  );
}
