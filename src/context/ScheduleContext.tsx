import { createContext, useContext, useEffect, useMemo, useState } from "react";

import {
  generateWeeklyAssignments,
  getWeeklyReassignmentFlags,
  getDayKeyFromDate,
  type WeeklyReassignmentFlags,
} from "../utils/scheduleUtils";

import {
  CALL_IN_CLEANERS,
  CLEANERS,
  JOBS,
  STAFF_CLEANERS,
} from "../constants/consts";

import type { CleanerId, DayKey } from "../types/types";

interface ScheduleContextType {
  todayDayKey: DayKey;
  weeklyAssignments: Record<DayKey, string[]>;
  weeklyReassignmentFlags: WeeklyReassignmentFlags;
  presentCleaners: CleanerId[];
  setPresentCleaners: React.Dispatch<React.SetStateAction<CleanerId[]>>;
  peopleIn: number;
  selectedDay: DayKey;
  setSelectedDay: React.Dispatch<React.SetStateAction<DayKey>>;
}

const STORAGE_KEY = "team-clean:schedule-state";

type PresentCleanersByDay = Record<DayKey, CleanerId[]>;

interface PersistedScheduleState {
  date: string;
  selectedDay: DayKey;
  presentCleanersByDay: PresentCleanersByDay;
  weeklyAssignments: Record<DayKey, string[]>;
}

function getDefaultPresentCleanersByDay(): PresentCleanersByDay {
  return {
    mon: [...STAFF_CLEANERS],
    tue: [...STAFF_CLEANERS],
    wed: [...STAFF_CLEANERS],
    thu: [...STAFF_CLEANERS],
    fri: [...STAFF_CLEANERS],
  };
}

function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isDayKey(value: unknown): value is DayKey {
  return (
    value === "mon" ||
    value === "tue" ||
    value === "wed" ||
    value === "thu" ||
    value === "fri"
  );
}

function normalizeCleanersForDay(value: unknown): CleanerId[] {
  if (!Array.isArray(value)) return [...STAFF_CLEANERS];

  const selected = new Set(
    value.filter(
      (cleaner): cleaner is CleanerId =>
        typeof cleaner === "string" && CLEANERS.includes(cleaner as CleanerId),
    ),
  );

  return CLEANERS.filter((cleaner) => selected.has(cleaner));
}

function normalizePresentCleanersByDay(value: unknown): PresentCleanersByDay {
  const source =
    value && typeof value === "object"
      ? (value as Partial<Record<DayKey, unknown>>)
      : {};

  return {
    mon: normalizeCleanersForDay(source.mon),
    tue: normalizeCleanersForDay(source.tue),
    wed: normalizeCleanersForDay(source.wed),
    thu: normalizeCleanersForDay(source.thu),
    fri: normalizeCleanersForDay(source.fri),
  };
}

function loadPersistedScheduleState(
  todayDateKey: string,
): Pick<PersistedScheduleState, "selectedDay" | "presentCleanersByDay"> | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedScheduleState>;

    if (parsed.date !== todayDateKey) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    const selectedDay = isDayKey(parsed.selectedDay)
      ? parsed.selectedDay
      : null;

    if (!selectedDay) return null;

    return {
      selectedDay,
      presentCleanersByDay: normalizePresentCleanersByDay(
        parsed.presentCleanersByDay,
      ),
    };
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

const ScheduleContext = createContext<ScheduleContextType | null>(null);

export const ScheduleProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const today = useMemo(() => new Date(), []);
  const todayDateKey = useMemo(() => getLocalDateKey(today), [today]);
  const todayDayKey = useMemo(() => getDayKeyFromDate(today), [today]);
  const persistedScheduleState = useMemo(
    () => loadPersistedScheduleState(todayDateKey),
    [todayDateKey],
  );

  const [selectedDay, setSelectedDay] = useState<DayKey>(
    persistedScheduleState?.selectedDay ?? todayDayKey,
  );
  const [presentCleanersByDay, setPresentCleanersByDay] =
    useState<PresentCleanersByDay>(
      persistedScheduleState?.presentCleanersByDay ??
        getDefaultPresentCleanersByDay(),
    );

  const presentCleaners = presentCleanersByDay[selectedDay];

  const setPresentCleaners: React.Dispatch<
    React.SetStateAction<CleanerId[]>
  > = (valueOrUpdater) => {
    setPresentCleanersByDay((current) => {
      const nextForSelectedDay =
        typeof valueOrUpdater === "function"
          ? valueOrUpdater(current[selectedDay])
          : valueOrUpdater;

      return {
        ...current,
        [selectedDay]: nextForSelectedDay,
      };
    });
  };

  const peopleIn = presentCleaners.length;

  const weeklyAssignments = useMemo(
    () =>
      generateWeeklyAssignments(
        STAFF_CLEANERS,
        today,
        JOBS.length,
        presentCleanersByDay,
        JOBS,
        CALL_IN_CLEANERS,
      ),
    [presentCleanersByDay, today],
  );

  const baselineWeeklyAssignments = useMemo(
    () =>
      generateWeeklyAssignments(
        STAFF_CLEANERS,
        today,
        JOBS.length,
        undefined,
        JOBS,
        CALL_IN_CLEANERS,
      ),
    [today],
  );

  const weeklyReassignmentFlags = useMemo(
    () =>
      getWeeklyReassignmentFlags({
        baseAssignments: baselineWeeklyAssignments,
        adjustedAssignments: weeklyAssignments,
      }),
    [baselineWeeklyAssignments, weeklyAssignments],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const payload: PersistedScheduleState = {
      date: todayDateKey,
      selectedDay,
      presentCleanersByDay,
      weeklyAssignments,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [presentCleanersByDay, selectedDay, todayDateKey, weeklyAssignments]);

  return (
    <ScheduleContext.Provider
      value={{
        todayDayKey,
        weeklyAssignments,
        weeklyReassignmentFlags,
        presentCleaners,
        setPresentCleaners,
        peopleIn,
        selectedDay,
        setSelectedDay,
      }}
    >
      {children}
    </ScheduleContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSchedule = () => {
  const context = useContext(ScheduleContext);
  if (!context) {
    throw new Error("useSchedule must be used within a ScheduleProvider");
  }
  return context;
};
