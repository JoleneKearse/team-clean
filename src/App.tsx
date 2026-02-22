import type { DayKey } from "./types/types";

import Calendar from "./components/Calendar";

function App() {
  const calendarView = "weekly";
  const dayIndex = new Date().getDay();
  const highlightedDayKey: DayKey =
    dayIndex === 0 || dayIndex === 6
      ? "mon"
      : (["sun", "mon", "tue", "wed", "thu", "fri", "sat"][dayIndex] as DayKey);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <header className="text-gray-800">Team Clean 🧼</header>
      <Calendar
        calendarView={calendarView}
        highlightedDayKey={highlightedDayKey}
      />
    </div>
  );
}

export default App;
