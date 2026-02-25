import Calendar from "./components/Calendar";
import Buildings from "./components/Buildings";
import Daycare from "./components/Daycare";
import { useSchedule } from "./context/ScheduleContext";
import { CLEANERS } from "./constants/consts";
import type { CleanerId } from "./types/types";

function App() {
  const { selectedDay, peopleIn, presentCleaners, setPresentCleaners } =
    useSchedule();
  const calendarView = "weekly";

  const toggleCleaner = (cleaner: CleanerId) => {
    setPresentCleaners((current) =>
      current.includes(cleaner)
        ? current.filter((initials) => initials !== cleaner)
        : CLEANERS.filter((initials) =>
            [...current, cleaner].includes(initials),
          ),
    );
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <section className="w-full border border-gray-500 overflow-hidden rounded-xl shadow-lg p-4 bg-gray-200">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold">Who is in today?</h2>
            <p className="text-sm italic">Uncheck names if necessary</p>
          </div>
          
          <span className="font-semibold">Staffing: {peopleIn}</span>
        </div>

        <div className="mt-3 flex flex-wrap gap-3">
          {CLEANERS.map((cleaner) => {
            const checked = presentCleaners.includes(cleaner);

            return (
              <label key={cleaner} className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleCleaner(cleaner)}
                />
                <span>{cleaner}</span>
              </label>
            );
          })}
        </div>

        {peopleIn < 8 && (
          <p className="mt-3 font-semibold text-pink-700">
            Please review the changes below. ⬇️
          </p>
        )}
      </section>

      <Calendar calendarView={calendarView} highlightedDayKey={selectedDay} />
      <Buildings />
      <Daycare />
    </div>
  );
}

export default App;
