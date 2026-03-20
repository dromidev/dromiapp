import { getServerSession } from "next-auth/next";
import { listMyMeetingsAction } from "@/app/(encuesta)/actions";
import { DashboardClient } from "@/components/encuesta/dashboard-client";
import { authOptions } from "@/lib/auth-options";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const meetings = await listMyMeetingsAction();
  const initialMeetings = meetings.map((m) => ({
    id: m.id,
    title: m.title,
    meetingDate:
      m.meetingDate instanceof Date
        ? m.meetingDate.toISOString()
        : new Date(m.meetingDate as unknown as string).toISOString(),
    createdAt: m.createdAt.toISOString(),
  }));
  return (
    <DashboardClient
      initialMeetings={initialMeetings}
      userEmail={session?.user?.email ?? ""}
      userName={session?.user?.name ?? ""}
    />
  );
}
