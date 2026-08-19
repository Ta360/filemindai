import CalendarWidget from "../components/CalendarWidget";
import { useDashboard } from "../hooks/useDashboardStore";

export default function CalendarPage() {
  const { connection } = useDashboard();

  if (!connection.connected) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
        Connect Google Drive to view your activity calendar.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Activity Calendar</h1>
      <CalendarWidget />
    </div>
  );
}
