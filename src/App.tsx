import { useEffect, useMemo, useState } from "react";

import { useSchedule } from "./context/ScheduleContext";

import { CLEANERS } from "./constants/consts";

import type { CleanerId } from "./types/types";

import Calendar from "./components/Calendar";
import Buildings from "./components/Buildings";
import Daycare from "./components/Daycare";
import BandOffice from "./components/BandOffice";
import HealthCenter from "./components/HealthCenter";

const EASTERN_TIME_ZONE = "America/Toronto";

function getEasternTimeParts(referenceDate: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TIME_ZONE,
    hour12: false,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const parts = formatter.formatToParts(referenceDate);
  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);

  return {
    weekday,
    minutesSinceMidnight:
      Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : 0,
  };
}

function getSectionVisibility(referenceDate: Date) {
  const { weekday, minutesSinceMidnight } = getEasternTimeParts(referenceDate);
  const isWeekday =
    weekday === "Mon" ||
    weekday === "Tue" ||
    weekday === "Wed" ||
    weekday === "Thu" ||
    weekday === "Fri";

  if (!isWeekday) {
    return {
      showBuildings: true,
      showDaycare: true,
      showBandOffice: true,
    };
  }

  return {
    showBuildings: minutesSinceMidnight < 18 * 60,
    showDaycare: minutesSinceMidnight < 20 * 60 + 30,
    showBandOffice: minutesSinceMidnight < 21 * 60 + 45,
  };
}

function App() {
  const { selectedDay, peopleIn, presentCleaners, setPresentCleaners } =
    useSchedule();
  const calendarView = "weekly";
  const [clockTick, setClockTick] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setClockTick(Date.now());
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const { showBuildings, showDaycare, showBandOffice } = useMemo(
    () => getSectionVisibility(new Date(clockTick)),
    [clockTick],
  );

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
    <div className="mx-auto flex max-w-112.5 flex-col items-center gap-4 p-4">
      <section className="w-full border border-gray-500 overflow-hidden rounded-xl shadow-lg bg-gray-200">
        <div className="flex items-center justify-between gap-4 bg-gray-700 px-4 py-4 text-gray-100">
          <div>
            <h2 className="font-semibold text-xl">Who is in today?</h2>
            <p className="text-sm italic text-gray-200">
              (Un)Check names if necessary
            </p>
          </div>

          <span className="font-semibold">Staffing: {peopleIn}</span>
        </div>

        <div className="p-4">
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
        </div>
      </section>

      <Calendar calendarView={calendarView} highlightedDayKey={selectedDay} />

      {showBuildings && <Buildings />}
      {showDaycare && <Daycare />}
      {showBandOffice && <BandOffice />}

      <HealthCenter />
    </div>
  );
}

export default App;
