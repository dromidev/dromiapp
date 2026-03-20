import { listMyMeetingsAction } from "@/app/(encuesta)/actions";
import { DashboardClient } from "@/components/encuesta/dashboard-client";
import { getDashboardUserContext } from "@/lib/dashboard-user";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const ctx = await getDashboardUserContext();

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
      userEmail={ctx?.email ?? ""}
      userName={ctx?.name ?? ""}
    />
  );
}
