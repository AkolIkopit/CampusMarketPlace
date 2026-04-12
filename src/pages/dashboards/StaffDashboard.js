import DashboardShell from "./DashboardShell";

const cards = [
  {
    icon: "📥",
    title: "Incoming drop-offs",
    description: "Review items scheduled to arrive at the campus trade facility today.",
  },
  {
    icon: "📤",
    title: "Ready for collection",
    description: "Confirm which orders are cleared and ready for student pickup.",
  },
  {
    icon: "📋",
    title: "Booking schedule",
    description: "Keep the facility timetable organized and avoid stacked handover slots.",
  },
  {
    icon: "✅",
    title: "Confirm transactions",
    description: "Close out completed exchanges and mark each trade hub handoff correctly.",
  },
];

export default function StaffDashboard({ profile }) {
  return (
    <DashboardShell
      theme="staff"
      profile={profile}
      title="Staff Dashboard"
      subtitle="Manage the trade hub workflow on desktop or mobile without the header breaking apart."
      cards={cards}
    />
  );
}
