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
  buildingWeeklyAssignments: Record<DayKey, string[]>;
  buildingReassignmentFlags: WeeklyReassignmentFlags;
  daycareWeeklyAssignments: Record<DayKey, string[]>;
  daycareReassignmentFlags: WeeklyReassignmentFlags;
  presentCleaners: CleanerId[];
  setPresentCleaners: React.Dispatch<React.SetStateAction<CleanerId[]>>;
  peopleIn: number;
  selectedDay: DayKey;
  setSelectedDay: React.Dispatch<React.SetStateAction<DayKey>>;
  swapAssignments: (
    day: DayKey,
    fromJobIndex: number,
    toJobIndex: number,
  ) => void;
  moveBuildingAssignment: (
    day: DayKey,
    fromJobIndex: number,
    toJobIndex: number,
  ) => void;
  moveDaycareAssignment: (
    day: DayKey,
    fromJobIndex: number,
    toJobIndex: number,
  ) => void;
  resetScheduleState: () => void;
}

const STORAGE_KEY = "team-clean:schedule-state";

type PresentCleanersByDay = Record<DayKey, CleanerId[]>;
type SwapOperation = {
  fromJobIndex: number;
  toJobIndex: number;
};
type SwapOperationsByDay = Record<DayKey, SwapOperation[]>;
type BuildingMoveOperationsByDay = Record<DayKey, SwapOperation[]>;
type DaycareMoveOperationsByDay = Record<DayKey, SwapOperation[]>;

interface PersistedScheduleState {
  date: string;
  selectedDay: DayKey;
  presentCleanersByDay: PresentCleanersByDay;
  swapOperationsByDay: SwapOperationsByDay;
  buildingMoveOperationsByDay: BuildingMoveOperationsByDay;
  daycareMoveOperationsByDay: DaycareMoveOperationsByDay;
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

function getDefaultSwapOperationsByDay(): SwapOperationsByDay {
  return {
    mon: [],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
  };
}

function getDefaultBuildingMoveOperationsByDay(): BuildingMoveOperationsByDay {
  return {
    mon: [],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
  };
}

function getDefaultDaycareMoveOperationsByDay(): DaycareMoveOperationsByDay {
  return {
    mon: [],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
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

function normalizeSwapOperationsForDay(
  value: unknown,
  slotCount: number,
): SwapOperation[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;

      const fromJobIndex = Number((entry as SwapOperation).fromJobIndex);
      const toJobIndex = Number((entry as SwapOperation).toJobIndex);

      if (!Number.isInteger(fromJobIndex) || !Number.isInteger(toJobIndex)) {
        return null;
      }

      if (
        fromJobIndex < 0 ||
        toJobIndex < 0 ||
        fromJobIndex >= slotCount ||
        toJobIndex >= slotCount ||
        fromJobIndex === toJobIndex
      ) {
        return null;
      }

      return { fromJobIndex, toJobIndex };
    })
    .filter((entry): entry is SwapOperation => Boolean(entry));
}

function normalizeSwapOperationsByDay(
  value: unknown,
  slotCount: number,
): SwapOperationsByDay {
  const source =
    value && typeof value === "object"
      ? (value as Partial<Record<DayKey, unknown>>)
      : {};

  return {
    mon: normalizeSwapOperationsForDay(source.mon, slotCount),
    tue: normalizeSwapOperationsForDay(source.tue, slotCount),
    wed: normalizeSwapOperationsForDay(source.wed, slotCount),
    thu: normalizeSwapOperationsForDay(source.thu, slotCount),
    fri: normalizeSwapOperationsForDay(source.fri, slotCount),
  };
}

function applyDaySwapOperations(
  assignments: readonly string[],
  swapOperations: readonly SwapOperation[],
): string[] {
  const nextAssignments = [...assignments];

  swapOperations.forEach(({ fromJobIndex, toJobIndex }) => {
    if (
      fromJobIndex < 0 ||
      toJobIndex < 0 ||
      fromJobIndex >= nextAssignments.length ||
      toJobIndex >= nextAssignments.length ||
      fromJobIndex === toJobIndex
    ) {
      return;
    }

    const current = nextAssignments[fromJobIndex] ?? "";
    nextAssignments[fromJobIndex] = nextAssignments[toJobIndex] ?? "";
    nextAssignments[toJobIndex] = current;
  });

  return nextAssignments;
}

function loadPersistedScheduleState(
  todayDateKey: string,
): Pick<
  PersistedScheduleState,
  | "selectedDay"
  | "presentCleanersByDay"
  | "swapOperationsByDay"
  | "buildingMoveOperationsByDay"
  | "daycareMoveOperationsByDay"
> | null {
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
      swapOperationsByDay: normalizeSwapOperationsByDay(
        parsed.swapOperationsByDay,
        JOBS.length,
      ),
      buildingMoveOperationsByDay: normalizeSwapOperationsByDay(
        parsed.buildingMoveOperationsByDay,
        JOBS.length,
      ),
      daycareMoveOperationsByDay: normalizeSwapOperationsByDay(
        parsed.daycareMoveOperationsByDay,
        JOBS.length,
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
  const [swapOperationsByDay, setSwapOperationsByDay] =
    useState<SwapOperationsByDay>(
      persistedScheduleState?.swapOperationsByDay ??
        getDefaultSwapOperationsByDay(),
    );
  const [buildingMoveOperationsByDay, setBuildingMoveOperationsByDay] =
    useState<BuildingMoveOperationsByDay>(
      persistedScheduleState?.buildingMoveOperationsByDay ??
        getDefaultBuildingMoveOperationsByDay(),
    );
  const [daycareMoveOperationsByDay, setDaycareMoveOperationsByDay] =
    useState<DaycareMoveOperationsByDay>(
      persistedScheduleState?.daycareMoveOperationsByDay ??
        getDefaultDaycareMoveOperationsByDay(),
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

  const generatedWeeklyAssignments = useMemo(
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

  const weeklyAssignments = useMemo(
    () => ({
      mon: applyDaySwapOperations(
        generatedWeeklyAssignments.mon,
        swapOperationsByDay.mon,
      ),
      tue: applyDaySwapOperations(
        generatedWeeklyAssignments.tue,
        swapOperationsByDay.tue,
      ),
      wed: applyDaySwapOperations(
        generatedWeeklyAssignments.wed,
        swapOperationsByDay.wed,
      ),
      thu: applyDaySwapOperations(
        generatedWeeklyAssignments.thu,
        swapOperationsByDay.thu,
      ),
      fri: applyDaySwapOperations(
        generatedWeeklyAssignments.fri,
        swapOperationsByDay.fri,
      ),
    }),
    [generatedWeeklyAssignments, swapOperationsByDay],
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

  const buildingWeeklyAssignments = useMemo(
    () => ({
      mon: applyDaySwapOperations(
        weeklyAssignments.mon,
        buildingMoveOperationsByDay.mon,
      ),
      tue: applyDaySwapOperations(
        weeklyAssignments.tue,
        buildingMoveOperationsByDay.tue,
      ),
      wed: applyDaySwapOperations(
        weeklyAssignments.wed,
        buildingMoveOperationsByDay.wed,
      ),
      thu: applyDaySwapOperations(
        weeklyAssignments.thu,
        buildingMoveOperationsByDay.thu,
      ),
      fri: applyDaySwapOperations(
        weeklyAssignments.fri,
        buildingMoveOperationsByDay.fri,
      ),
    }),
    [buildingMoveOperationsByDay, weeklyAssignments],
  );

  const buildingReassignmentFlags = useMemo(
    () =>
      getWeeklyReassignmentFlags({
        baseAssignments: weeklyAssignments,
        adjustedAssignments: buildingWeeklyAssignments,
      }),
    [buildingWeeklyAssignments, weeklyAssignments],
  );

  const daycareWeeklyAssignments = useMemo(
    () => ({
      mon: applyDaySwapOperations(
        weeklyAssignments.mon,
        daycareMoveOperationsByDay.mon,
      ),
      tue: applyDaySwapOperations(
        weeklyAssignments.tue,
        daycareMoveOperationsByDay.tue,
      ),
      wed: applyDaySwapOperations(
        weeklyAssignments.wed,
        daycareMoveOperationsByDay.wed,
      ),
      thu: applyDaySwapOperations(
        weeklyAssignments.thu,
        daycareMoveOperationsByDay.thu,
      ),
      fri: applyDaySwapOperations(
        weeklyAssignments.fri,
        daycareMoveOperationsByDay.fri,
      ),
    }),
    [daycareMoveOperationsByDay, weeklyAssignments],
  );

  const daycareReassignmentFlags = useMemo(
    () =>
      getWeeklyReassignmentFlags({
        baseAssignments: weeklyAssignments,
        adjustedAssignments: daycareWeeklyAssignments,
      }),
    [daycareWeeklyAssignments, weeklyAssignments],
  );

  const swapAssignments = (
    day: DayKey,
    fromJobIndex: number,
    toJobIndex: number,
  ) => {
    if (
      !Number.isInteger(fromJobIndex) ||
      !Number.isInteger(toJobIndex) ||
      fromJobIndex < 0 ||
      toJobIndex < 0 ||
      fromJobIndex >= JOBS.length ||
      toJobIndex >= JOBS.length ||
      fromJobIndex === toJobIndex
    ) {
      return;
    }

    setSwapOperationsByDay((current) => ({
      ...current,
      [day]: [...current[day], { fromJobIndex, toJobIndex }],
    }));
  };

  const moveBuildingAssignment = (
    day: DayKey,
    fromJobIndex: number,
    toJobIndex: number,
  ) => {
    if (
      !Number.isInteger(fromJobIndex) ||
      !Number.isInteger(toJobIndex) ||
      fromJobIndex < 0 ||
      toJobIndex < 0 ||
      fromJobIndex >= JOBS.length ||
      toJobIndex >= JOBS.length ||
      fromJobIndex === toJobIndex
    ) {
      return;
    }

    setBuildingMoveOperationsByDay((current) => ({
      ...current,
      [day]: [...current[day], { fromJobIndex, toJobIndex }],
    }));
  };

  const moveDaycareAssignment = (
    day: DayKey,
    fromJobIndex: number,
    toJobIndex: number,
  ) => {
    if (
      !Number.isInteger(fromJobIndex) ||
      !Number.isInteger(toJobIndex) ||
      fromJobIndex < 0 ||
      toJobIndex < 0 ||
      fromJobIndex >= JOBS.length ||
      toJobIndex >= JOBS.length ||
      fromJobIndex === toJobIndex
    ) {
      return;
    }

    setDaycareMoveOperationsByDay((current) => ({
      ...current,
      [day]: [...current[day], { fromJobIndex, toJobIndex }],
    }));
  };

  const resetScheduleState = () => {
    setSelectedDay(todayDayKey);
    setPresentCleanersByDay(getDefaultPresentCleanersByDay());
    setSwapOperationsByDay(getDefaultSwapOperationsByDay());
    setBuildingMoveOperationsByDay(getDefaultBuildingMoveOperationsByDay());
    setDaycareMoveOperationsByDay(getDefaultDaycareMoveOperationsByDay());

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const payload: PersistedScheduleState = {
      date: todayDateKey,
      selectedDay,
      presentCleanersByDay,
      swapOperationsByDay,
      buildingMoveOperationsByDay,
      daycareMoveOperationsByDay,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [
    buildingMoveOperationsByDay,
    daycareMoveOperationsByDay,
    presentCleanersByDay,
    selectedDay,
    swapOperationsByDay,
    todayDateKey,
  ]);

  return (
    <ScheduleContext.Provider
      value={{
        todayDayKey,
        weeklyAssignments,
        weeklyReassignmentFlags,
        buildingWeeklyAssignments,
        buildingReassignmentFlags,
        daycareWeeklyAssignments,
        daycareReassignmentFlags,
        presentCleaners,
        setPresentCleaners,
        peopleIn,
        selectedDay,
        setSelectedDay,
        swapAssignments,
        moveBuildingAssignment,
        moveDaycareAssignment,
        resetScheduleState,
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
