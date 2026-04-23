import { useMemo, useState } from "react";

import { CLEANERS, JOBS } from "../constants/consts";
import { useSchedule } from "../context/ScheduleContext";
import type { CleanerId, DayKey, ShiftEventAction } from "../types/types";
import { getCleanerInitialsBadgeClassName } from "../utils/cleanerBadgeUtils";
import { getDayKeyFromDate } from "../utils/scheduleUtils";

function getTodayDateInputValue(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatTimeWithoutPeriod(time: string): string {
  const [hourText, minuteText] = time.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return time;
  }

  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${String(minute).padStart(2, "0")}`;
}

function parseDateInputToLocalDate(dateInput: string): Date | null {
  const [yearText, monthText, dayText] = dateInput.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }

  return new Date(year, month - 1, day);
}

const STATUS_OPTIONS: readonly ShiftEventAction[] = ["in", "out"];

const PM_HOURS = [
  { display: "04", value: "16" },
  { display: "05", value: "17" },
  { display: "06", value: "18" },
  { display: "07", value: "19" },
  { display: "08", value: "20" },
  { display: "09", value: "21" },
  { display: "10", value: "22" },
  { display: "11", value: "23" },
] as const;

const MINUTES = ["00", "15", "30", "45"] as const;

const InOutShift = () => {
  const { weeklyAssignments } = useSchedule();
  const defaultDate = useMemo(() => getTodayDateInputValue(), []);
  const [selectedDate, setSelectedDate] = useState(defaultDate);
  const [selectedCleaner, setSelectedCleaner] = useState<CleanerId>(
    CLEANERS[0],
  );
  const [selectedTime, setSelectedTime] = useState("16:15");
  const [hour24, minute] = selectedTime.split(":");
  const [selectedStatus, setSelectedStatus] = useState<ShiftEventAction>("in");
  const selectedDayKey = useMemo<DayKey>(() => {
    const localDate = parseDateInputToLocalDate(selectedDate);
    return localDate ? getDayKeyFromDate(localDate) : "mon";
  }, [selectedDate]);
  const selectedCleanerBadgeClassName = useMemo(() => {
    const assignmentsForDay = weeklyAssignments[selectedDayKey] ?? [];
    const cleanerAssignmentIndex = assignmentsForDay.findIndex(
      (assignedCleaner) => assignedCleaner === selectedCleaner,
    );
    const jobId = JOBS[cleanerAssignmentIndex];

    if (!jobId) {
      return "inline-flex h-8 min-w-8 items-center justify-center rounded-md bg-fuchsia-600 px-2 font-semibold text-white";
    }

    return getCleanerInitialsBadgeClassName(
      jobId,
      "h-8 min-w-8 rounded-md px-2 font-semibold",
    );
  }, [selectedCleaner, selectedDayKey, weeklyAssignments]);

  return (
    <section className="w-full overflow-hidden rounded-xl border border-gray-500 bg-gray-200 shadow-lg">
      <div className="bg-gray-700 px-4 py-4 text-gray-100">
        <h2 className="text-lgl font-semibold">Mid-Shift Changes</h2>
        <p className="text-sm italic text-gray-200">
          Add or update who&apos;s in or out during the day.
        </p>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-semibold text-gray-700">Date</span>
            <input
              id="inShiftChangeDate"
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="h-11 w-full rounded-lg border border-gray-400 bg-white px-3 text-gray-900 outline-none transition-colors focus:border-gray-700"
              required
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-semibold text-gray-700">Who</span>
            <div className="flex h-11 items-center gap-3 rounded-lg border border-gray-400 bg-white px-3">
              <span className={selectedCleanerBadgeClassName}>
                {selectedCleaner}
              </span>
              <select
                id="inShiftChangeCleaner"
                value={selectedCleaner}
                onChange={(event) =>
                  setSelectedCleaner(event.target.value as CleanerId)
                }
                className="h-full w-full bg-transparent text-gray-900 outline-none"
              >
                {CLEANERS.map((cleaner) => (
                  <option key={cleaner} value={cleaner}>
                    {cleaner}
                  </option>
                ))}
              </select>
            </div>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-semibold text-gray-700">Time</span>
            <div className="space-y-1">
              <div className="flex h-11 items-center justify-center rounded-lg border border-gray-400 bg-white px-3">
                <div className="flex w-12 flex-col items-center justify-center">
                  <select
                    id="inShiftChangeHour"
                    value={hour24}
                    onChange={(event) =>
                      setSelectedTime(`${event.target.value}:${minute}`)
                    }
                    className="w-full appearance-none bg-transparent p-0 text-center leading-none text-gray-900 outline-none"
                  >
                    {PM_HOURS.map(({ display, value }) => (
                      <option key={value} value={value}>
                        {display}
                      </option>
                    ))}
                  </select>
                  <span
                    aria-hidden="true"
                    className="pointer-events-none -mt-0.5 text-[11px] leading-none text-fuchsia-600"
                  >
                    v
                  </span>
                </div>
                <span className="mx-0.5 text-gray-500">:</span>
                <div className="flex w-12 flex-col items-center justify-center">
                  <select
                    id="inShiftChangeMinute"
                    value={minute}
                    onChange={(event) =>
                      setSelectedTime(`${hour24}:${event.target.value}`)
                    }
                    className="w-full appearance-none bg-transparent p-0 text-center leading-none text-gray-900 outline-none"
                  >
                    {MINUTES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <span
                    aria-hidden="true"
                    className="pointer-events-none -mt-0.5 text-[11px] leading-none text-fuchsia-600"
                  >
                    v
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-600">
                Times from 4:15 through 11:30.
              </p>
            </div>
          </label>

          <fieldset className="space-y-1">
            <legend className="text-sm font-semibold text-gray-700">
              Status
            </legend>
            <div className="flex h-11 overflow-hidden rounded-lg border border-gray-400 bg-white">
              {STATUS_OPTIONS.map((status) => {
                const isSelected = selectedStatus === status;

                return (
                  <button
                    key={status}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedStatus(status)}
                    className={[
                      "flex-1 font-semibold capitalize transition-colors",
                      isSelected
                        ? status === "in"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-700"
                        : "bg-white text-gray-500",
                      status === "in" ? "border-r border-gray-300" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {status}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-600">
              <b>In</b> for late start times and <b>Out</b> for early end times.
            </p>
          </fieldset>
        </div>

        <div className="rounded-lg border border-gray-300 bg-gray-100/80 px-3 py-2 text-sm text-gray-700">
          <span className="font-semibold text-gray-900">Ready to add:</span>{" "}
          {selectedCleaner} {selectedStatus} on {selectedDate} at{" "}
          {formatTimeWithoutPeriod(selectedTime)}
        </div>
      </div>
    </section>
  );
};

export default InOutShift;
