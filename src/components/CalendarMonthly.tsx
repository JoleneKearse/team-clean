import { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";

import { useSchedule } from "../context/ScheduleContext";
import { DAYS } from "../constants/consts";
import { db } from "../lib/firebase";
import Button from "./Button";
import {
  getLocalDateKey,
  getMonthlyWeekdayGrid,
  parseLocalDateKey,
} from "../utils/calendarMonthlyUtils";

type CalendarMonthlyProps = {
  onToggleCalendarView: () => void;
};

const WEEK_ROW_COLOR_STYLES = [
  {
    selectedClass: "bg-red-400 text-white",
    savedClass: "bg-red-100 ring-1 ring-red-400",
  },
  {
    selectedClass: "bg-orange-400 text-white",
    savedClass: "bg-orange-100 ring-1 ring-orange-400",
  },
  {
    selectedClass: "bg-green-400 text-white",
    savedClass: "bg-green-100 ring-1 ring-green-400",
  },
  {
    selectedClass: "bg-blue-400 text-white",
    savedClass: "bg-blue-100 ring-1 ring-blue-400",
  },
  {
    selectedClass: "bg-purple-400 text-white",
    savedClass: "bg-purple-100 ring-1 ring-purple-400",
  },
];

const CalendarMonthly = ({ onToggleCalendarView }: CalendarMonthlyProps) => {
  const { selectedDateKey, setSelectedDate } = useSchedule();
  const [savedDateKeys, setSavedDateKeys] = useState<Set<string>>(new Set());

  const selectedDate = useMemo(
    () => parseLocalDateKey(selectedDateKey) ?? new Date(),
    [selectedDateKey],
  );

  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, monthIndex) => ({
        value: monthIndex,
        label: new Intl.DateTimeFormat("en-US", {
          month: "short",
        }).format(new Date(2000, monthIndex, 1)),
      })),
    [],
  );

  const monthlyGrid = useMemo(
    () => getMonthlyWeekdayGrid(selectedDate),
    [selectedDate],
  );

  const hasCurrentMonthSavedData = useMemo(
    () =>
      monthlyGrid
        .flat()
        .some((cell) => cell.isCurrentMonth && savedDateKeys.has(cell.dateKey)),
    [monthlyGrid, savedDateKeys],
  );

  const handleMonthChange = (nextMonthIndex: number) => {
    const year = selectedDate.getFullYear();
    const day = selectedDate.getDate();
    const daysInTargetMonth = new Date(year, nextMonthIndex + 1, 0).getDate();
    const nextDate = new Date(
      year,
      nextMonthIndex,
      Math.min(day, daysInTargetMonth),
    );

    setSelectedDate(getLocalDateKey(nextDate));
  };

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
                    <div className="relative mx-auto w-fit">
                      <label
                        className="sr-only"
                        htmlFor="calendar-month-select"
                      >
                        Select month
                      </label>
                      <select
                        id="calendar-month-select"
                        value={selectedDate.getMonth()}
                        onChange={(event) => {
                          handleMonthChange(Number(event.target.value));
                        }}
                        className="cursor-pointer appearance-none bg-transparent px-2 pr-5 text-gray-200 focus:outline-none"
                        aria-label="Select month"
                      >
                        {monthOptions.map((monthOption) => (
                          <option
                            key={monthOption.value}
                            value={monthOption.value}
                            className="bg-gray-900 text-gray-100"
                          >
                            {monthOption.label}
                          </option>
                        ))}
                      </select>
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[10px] text-gray-300"
                      >
                        ▾
                      </span>
                    </div>
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
                {monthlyGrid.map((week, weekIndex) => {
                  const weekRowColorStyle =
                    WEEK_ROW_COLOR_STYLES[
                      weekIndex % WEEK_ROW_COLOR_STYLES.length
                    ];

                  return (
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
                                  !hasCurrentMonthSavedData &&
                                  cell.isCurrentMonth
                                    ? "bg-gray-100 ring-1 ring-gray-400"
                                    : isSelectedDate
                                      ? weekRowColorStyle.selectedClass
                                      : hasSavedData
                                        ? weekRowColorStyle.savedClass
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
                  );
                })}
              </tbody>
            </table>
          </article>
        </div>
      </div>

      <div className="mt-3 flex justify-center">
        <Button
          label="Back to Week"
          onClick={() => {
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
                d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
              />
            </svg>
          }
        />
      </div>
    </>
  );
};

export default CalendarMonthly;
