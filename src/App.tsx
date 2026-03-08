import { useEffect, useMemo, useState } from "react";

import { useSchedule } from "./context/ScheduleContext";

import { CLEANERS } from "./constants/consts";

import type { CleanerId } from "./types/types";

import Calendar from "./components/Calendar";
import Buildings from "./components/Buildings";
import Daycare from "./components/Daycare";
import BandOffice from "./components/BandOffice";
import HealthCenter from "./components/HealthCenter";
import Button from "./components/Button";

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
  const {
    currentDay,
    peopleIn,
    presentCleaners,
    setPresentCleaners,
    saveScheduleToFirestore,
    isSavingSchedule,
    saveScheduleError,
    resetScheduleState,
  } = useSchedule();
  const calendarView = "weekly";
  const [clockTick, setClockTick] = useState(() => Date.now());
  const [isEditMode, setIsEditMode] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [showSaveSuccessMessage, setShowSaveSuccessMessage] = useState(false);
  const [saveSuccessMessageTick, setSaveSuccessMessageTick] = useState(0);

  const triggerSaveSuccessMessage = () => {
    setShowSaveSuccessMessage(true);
    setSaveSuccessMessageTick((current) => current + 1);
  };

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setClockTick(Date.now());
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!showSaveSuccessMessage) return;

    const timeoutId = window.setTimeout(() => {
      setShowSaveSuccessMessage(false);
    }, 5000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [showSaveSuccessMessage, saveSuccessMessageTick]);

  const { showBuildings, showDaycare, showBandOffice } = useMemo(
    () => getSectionVisibility(new Date(clockTick)),
    [clockTick],
  );

  const toggleCleaner = (cleaner: CleanerId) => {
    setIsEditMode(true);

    setPresentCleaners((current) =>
      current.includes(cleaner)
        ? current.filter((initials) => initials !== cleaner)
        : CLEANERS.filter((initials) =>
            [...current, cleaner].includes(initials),
          ),
    );
  };

  const handleEditSchedule = () => {
    if (isSavingSchedule) {
      return;
    }

    if (!isEditMode) {
      setIsEditMode(true);
      return;
    }

    void saveScheduleToFirestore()
      .then(() => {
        triggerSaveSuccessMessage();
        setIsEditMode(false);
      })
      .catch(() => {
        // Error is already tracked in context and shown in the UI.
      });
  };

  const handleResetSchedule = () => {
    void resetScheduleState()
      .then(() => {
        triggerSaveSuccessMessage();
      })
      .catch(() => {
        // Error is already tracked in context and shown in the UI.
      });
    setIsEditMode(false);
  };

  const handleToggleHelp = () => {
    setIsHelpOpen((current) => !current);
  };

  const editButtonLabel = isEditMode
    ? isSavingSchedule
      ? "Saving..."
      : "Confirm"
    : "Edit";

  return (
    <div className="mx-auto flex max-w-112.5 flex-col items-center gap-4 p-4">
      <div
        className={[
          "w-full space-y-4 rounded-xl transition-colors",
          isEditMode ? "bg-pink-200/40 p-2" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <section className="w-full border border-gray-500 overflow-hidden rounded-xl shadow-lg bg-gray-200">
          <div className="flex items-center justify-between gap-4 bg-gray-700 px-4 py-4 text-gray-100">
            <div>
              <h2 className="font-semibold text-xl">Who is in today?</h2>
              <p className="text-sm italic text-gray-200">
                (Un)Check names if necessary
              </p>
            </div>

            <span
              className={
                peopleIn === 8 ? "font-semibold" : "font-bold text-pink-400"
              }
            >
              Staffing: {peopleIn}
            </span>
          </div>

          <div className="p-4">
            <div className="mt-3 flex flex-wrap gap-3">
              {CLEANERS.map((cleaner) => {
                const checked = presentCleaners.includes(cleaner);

                return (
                  <label
                    key={cleaner}
                    className="inline-flex items-center gap-2"
                  >
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
              <div className="mt-3 flex items-center justify-center gap-2 text-pink-700">
                <p className="font-semibold">
                  Please review the changes below.
                </p>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-6 shrink-0"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3"
                  />
                </svg>
              </div>
            )}
          </div>
        </section>

        <div className="relative w-full">
          <div
            className={`absolute ${isEditMode ? "-left-1" : "left-0"} top-1/2 -translate-y-1/2 mt-1`}
          >
            <button
              type="button"
              onClick={handleToggleHelp}
              aria-label={isHelpOpen ? "Hide help" : "Show help"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                className="size-8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"
                />
              </svg>
            </button>
          </div>

          <div className="flex items-center justify-center gap-6 p-2">
            <Button
              label={editButtonLabel}
              onClick={handleEditSchedule}
              disabled={isSavingSchedule}
              icon={
                isEditMode ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                    className="size-8"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m4.5 12.75 6 6 9-13.5"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="size-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
                    />
                  </svg>
                )
              }
            />
            <Button
              label="Reset"
              onClick={handleResetSchedule}
              disabled={isSavingSchedule}
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
              }
            />
          </div>
        </div>
        {saveScheduleError && (
          <p className="px-2 pb-1 text-center font-semibold text-pink-700">
            Save failed: {saveScheduleError}
          </p>
        )}
        {!saveScheduleError && showSaveSuccessMessage && (
          <p className="px-2 pb-1 text-center font-semibold text-pink-700">
            Changes sent to everyone.
          </p>
        )}

        {isHelpOpen && (
          <div>
            <p>
              To change{" "}
              <b>{currentDay[0].toUpperCase() + currentDay.slice(1)}</b>{" "}
              calendar, <b>buildings</b>, or <b>daycare</b> assignments:
            </p>
            <ol className="mt-1 list-inside list-decimal space-y-1 pl-3">
              <li>
                Click the <b>Edit</b> button.
              </li>
              <li>
                Long-press the <b>initials</b> and drag to new job to reassign
                tasks. Initials will automatically swap.
              </li>
              <li>
                Click <b>Confirm</b> to save changes.
              </li>
            </ol>
            <p className="my-2">
              Click <b>Reset</b> to revert all changes to{" "}
              {currentDay[0].toUpperCase() + currentDay.slice(1)}'s defaults.
            </p>
          </div>
        )}

        <Calendar
          calendarView={calendarView}
          highlightedDayKey={currentDay}
          isEditMode={isEditMode}
        />
        {showBuildings && <Buildings isEditMode={isEditMode} />}
        {showDaycare && <Daycare isEditMode={isEditMode} />}
      </div>
      {showBandOffice && <BandOffice />}

      <HealthCenter />
    </div>
  );
}

export default App;
