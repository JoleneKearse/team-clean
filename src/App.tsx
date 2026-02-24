import Calendar from "./components/Calendar";
import Buildings from "./components/Buildings";
import { useSchedule } from "./context/ScheduleContext";

function App() {
  const { selectedDay } = useSchedule();
  const calendarView = "weekly";

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <header className="text-gray-800">Team Clean 🧼</header>
      <Calendar calendarView={calendarView} highlightedDayKey={selectedDay} />
      <Buildings />
    </div>
  );
}

export default App;
