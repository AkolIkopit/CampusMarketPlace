import DashboardShell from "./DashboardShell";

const cards = [
  {
    icon: "🛍️",
    title: "Browse items",
    description: "Explore verified listings from students across campus and filter by category fast.",
  },
  {
    icon: "📦",
    title: "My listings",
    description: "Track the items you are selling or trading and keep pricing current.",
  },
  {
    icon: "💬",
    title: "Messages",
    description: "Follow active negotiations, answer buyers, and keep deals moving.",
  },
  {
    icon: "⭐",
    title: "My reviews",
    description: "See how your last trades went and build trust for future buyers.",
  },
];

export default function StudentDashboard({ profile }) {
  return (
    <DashboardShell
      theme="student"
      profile={profile}
      title="Student Dashboard"
      subtitle="Browse, buy, sell, and trade from one place without the cramped desktop-only layout."
      cards={cards}
    />
  );
}
