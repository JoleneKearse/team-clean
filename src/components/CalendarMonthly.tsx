import { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";

import { useSchedule } from "../context/ScheduleContext";
import { DAYS } from "../constants/consts";
import { db } from "../lib/firebase";
import Button from "./Button";
import {
  getMonthlyWeekdayGrid,
  parseLocalDateKey,
} from "../utils/calendarMonthlyUtils";

type CalendarMonthlyProps = {
  onToggleCalendarView: () => void;
};

const CalendarMonthly = ({ onToggleCalendarView }: CalendarMonthlyProps) => {
  const { selectedDateKey, setSelectedDate, setSelectedDateToToday } =
    useSchedule();
  const [savedDateKeys, setSavedDateKeys] = useState<Set<string>>(new Set());

  const selectedDate = useMemo(
    () => parseLocalDateKey(selectedDateKey) ?? new Date(),
    [selectedDateKey],
  );

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        month: "short",
      }).format(selectedDate),
    [selectedDate],
  );

  const monthlyGrid = useMemo(
    () => getMonthlyWeekdayGrid(selectedDate),
    [selectedDate],
  );

  useEffect(() => {
    let isCancelled = false;
    const firestore = db;

    if (!firestore) {
      return;
    }

    const visibleDateKeys = monthlyGrid.flatMap((week) =>
      week.map((cell) => cell.dateKey),
    );

    void Promise.all(
      visibleDateKeys.map(async (dateKey) => {
        const snapshot = await getDoc(
          doc(firestore, "dailySchedules", dateKey),
        );
        return { dateKey, hasSavedData: snapshot.exists() };
      }),
    ).then((results) => {
      if (isCancelled) return;

      const nextSavedDateKeys = new Set(
        results
          .filter((result) => result.hasSavedData)
          .map((result) => result.dateKey),
      );
      setSavedDateKeys(nextSavedDateKeys);
    });

    return () => {
      isCancelled = true;
    };
  }, [monthlyGrid]);

  return (
    <>
      <div className="relative w-full">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-1 rounded-2xl bg-[linear-gradient(to_bottom_right,var(--color-purple-500),var(--color-sky-500),var(--color-lime-500),var(--color-yellow-500),var(--color-orange-500))] opacity-75 blur-sm"
        />
        <div className="relative w-full rounded-xl bg-[linear-gradient(to_bottom_right,var(--color-purple-500),var(--color-sky-500),var(--color-lime-500),var(--color-yellow-500),var(--color-orange-500))] p-px shadow-lg">
          <article className="w-full overflow-hidden rounded-lg text-center bg-gray-300">
            <table className="w-full border-spacing-32">
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="w-16 bg-gray-900 py-3 text-gray-100"
                  >
                    <button
                      type="button"
                      onClick={onToggleCalendarView}
                      className="cursor-pointer text-gray-300"
                      aria-label="Switch to weekly calendar view"
                    >
                      {monthLabel}
                    </button>
                  </th>
                  {DAYS.map((day) => (
                    <th
                      key={day.key}
                      className="bg-gray-900 py-3 text-gray-100"
                    >
                      {day.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthlyGrid.map((week, weekIndex) => (
                  <tr key={`week-${weekIndex}`}>
                    <td className="w-16 bg-gray-100/80 py-2 text-xs text-gray-500">
                      <span aria-hidden="true">&nbsp;</span>
                    </td>
                    {week.map((cell) => {
                      const hasSavedData = savedDateKeys.has(cell.dateKey);
                      const isSelectedDate = cell.dateKey === selectedDateKey;

                      return (
                        <td
                          key={cell.dateKey}
                          className={[
                            "py-2",
                            cell.isCurrentMonth
                              ? "text-gray-900"
                              : "text-gray-500",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedDate(cell.dateKey)}
                            aria-label={`Select ${cell.date.toDateString()}`}
                            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full"
                          >
                            <span
                              className={[
                                "inline-flex h-8 w-8 items-center justify-center rounded-full",
                                isSelectedDate
                                  ? "bg-sky-400 text-gray-900"
                                  : hasSavedData
                                    ? "bg-sky-100 ring-1 ring-sky-400"
                                    : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                            >
                              {cell.date.getDate()}
                            </span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        </div>
      </div>

      <div className="mt-3 flex justify-center">
        <Button
          label="Reset to Today"
          onClick={() => {
            setSelectedDateToToday();
            onToggleCalendarView();
          }}
          className="w-48 whitespace-nowrap"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.0}
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
    </>
  );
};

export default CalendarMonthly;
