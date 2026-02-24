import type { DayKey } from "./types/types";
import { DAYS } from "./constants/consts";

import Calendar from "./components/Calendar";

function App() {
  const calendarView = "weekly";
  const dayIndex = new Date().getDay();
  const dayMap: Partial<Record<number, DayKey>> = {
    1: "mon",
    2: "tue",
    3: "wed",
    4: "thu",
    5: "fri",
  };
  const highlightedDayKey: DayKey = dayMap[dayIndex] ?? DAYS[0].key;

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
