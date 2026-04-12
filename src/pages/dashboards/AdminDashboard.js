import DashboardShell from "./DashboardShell";

const cards = [
  {
    icon: "👥",
    title: "Manage users",
    description: "Review user access, role assignments, and account issues across the platform.",
  },
  {
    icon: "📋",
    title: "All listings",
    description: "Monitor marketplace inventory and intervene quickly when a listing needs action.",
  },
  {
    icon: "🏫",
    title: "Trade facilities",
    description: "Keep campus trade hubs aligned on staffing, capacity, and availability windows.",
  },
  {
    icon: "📊",
    title: "Analytics",
    description: "Watch platform growth, listing velocity, and category performance at a glance.",
  },
  {
    icon: "🚩",
    title: "Flagged content",
    description: "Handle moderation queues and resolve reports before they escalate.",
  },
  {
    icon: "⚙️",
    title: "Settings",
    description: "Adjust platform defaults, operations rules, and admin-level configuration.",
  },
];

export default function AdminDashboard({ profile }) {
  return (
    <DashboardShell
      theme="admin"
      profile={profile}
      title="Admin Dashboard"
      subtitle="Run the platform from a responsive workspace with the account controls tucked into a mobile menu."
      cards={cards}
    />
  );
}
