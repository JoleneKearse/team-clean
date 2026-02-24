import Calendar from "./components/Calendar";
import Buildings from "./components/Buildings";
import Daycare from "./components/Daycare";
import { useSchedule } from "./context/ScheduleContext";

function App() {
  const { selectedDay, peopleIn, setPeopleIn } = useSchedule();
  const calendarView = "weekly";

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <header className="text-gray-800">Team Clean 🧼</header>

      <section className="w-full border border-gray-500 overflow-hidden rounded-xl shadow-lg p-4">
        <label htmlFor="people-in" className="font-semibold mr-2">
          People In:
        </label>
        <select
          id="people-in"
          className="border border-gray-400 rounded px-2 py-1"
          value={peopleIn}
          onChange={(event) => setPeopleIn(Number(event.target.value))}
        >
          <option value={8}>8</option>
          <option value={7}>7</option>
          <option value={6}>6</option>
          <option value={5}>5</option>
          <option value={4}>4</option>
          <option value={3}>3</option>
          <option value={2}>2</option>
          <option value={1}>1</option>
        </select>
      </section>

      <Calendar calendarView={calendarView} highlightedDayKey={selectedDay} />
      <Buildings />
      <Daycare />
    </div>
  );
}

export default App;
