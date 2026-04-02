import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";

import {
  enforceNecessaryJobsBeforeFlo,
  generateWeeklyAssignments,
  getWeeklyReassignmentFlags,
  getDayKeyFromDate,
  type WeeklyReassignmentFlags,
} from "../utils/scheduleUtils";
import {
  getMarchBreakReducedScheduleByDayForWeek,
  getExtraHolidaysByDayForWeek,
  getOntarioPublicHolidaysByDayForWeek,
  type ExtraHoliday,
  type OntarioPublicHoliday,
} from "../utils/holidayUtils";

import {
  CALL_IN_CLEANERS,
  CLEANERS,
  CLOSURE_OPTIONS,
  JOBS,
  STAFF_CLEANERS,
} from "../constants/consts";

import type { CleanerId, ClosureId, DayKey } from "../types/types";
import { db, firebaseConfigError } from "../lib/firebase";

interface ScheduleContextType {
  todayDateKey: string;
  todayDayKey: DayKey;
  selectedDateKey: string;
  isViewingPastDate: boolean;
  weeklyPublicHolidays: Partial<Record<DayKey, OntarioPublicHoliday>>;
  weeklyExtraHolidays: Partial<Record<DayKey, ExtraHoliday>>;
  isMarchBreakReducedScheduleDay: boolean;
  weeklyAssignments: Record<DayKey, string[]>;
  referenceWeeklyAssignments: Record<DayKey, string[]>;
  weeklyReassignmentFlags: WeeklyReassignmentFlags;
  buildingWeeklyAssignments: Record<DayKey, string[]>;
  buildingReassignmentFlags: WeeklyReassignmentFlags;
  daycareWeeklyAssignments: Record<DayKey, string[]>;
  daycareReassignmentFlags: WeeklyReassignmentFlags;
  closedItems: ClosureId[];
  toggleClosedItem: (closureId: ClosureId) => void;
  presentCleaners: CleanerId[];
  setPresentCleaners: React.Dispatch<React.SetStateAction<CleanerId[]>>;
  peopleIn: number;
  currentDay: DayKey;
  setCurrentDay: React.Dispatch<React.SetStateAction<DayKey>>;
  setSelectedDateToToday: () => void;
  setSelectedDate: (dateKey: string) => void;
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
  flo1AtAnnex: boolean;
  setFlo1AtAnnexForDay: (day: DayKey, value: boolean) => void;
  moveDaycareAssignment: (
    day: DayKey,
    fromJobIndex: number,
    toJobIndex: number,
  ) => void;
  saveScheduleToFirestore: () => Promise<void>;
  isSavingSchedule: boolean;
  saveScheduleError: string | null;
  lastSavedToCloudAt: string | null;
  resetScheduleState: () => Promise<void>;
}

const STORAGE_KEY = "team-clean:schedule-state";
const CLOSED_ITEMS_DEFAULTS_VERSION = 6;
const FIRESTORE_SAVE_TIMEOUT_MS = 15000;
const FIREBASE_NOT_CONFIGURED_MESSAGE =
  "Firebase is not configured. For local development, add the required VITE_FIREBASE_* values to .env and restart the app. For hosted builds, configure the same variables in your deployment environment and redeploy.";

type PresentCleanersByDay = Record<DayKey, CleanerId[]>;
type SwapOperation = {
  fromJobIndex: number;
  toJobIndex: number;
};
type SwapOperationsByDay = Record<DayKey, SwapOperation[]>;
type BuildingMoveOperationsByDay = Record<DayKey, SwapOperation[]>;
type DaycareMoveOperationsByDay = Record<DayKey, SwapOperation[]>;
type Flo1AtAnnexByDay = Record<DayKey, boolean>;
type ClosedItemsByDay = Record<DayKey, ClosureId[]>;

const DAY_OFFSET_BY_KEY: Record<DayKey, number> = {
  mon: 0,
  tue: 1,
  wed: 2,
  thu: 3,
  fri: 4,
};

const CLOSURE_IDS = CLOSURE_OPTIONS.map((option) => option.id) as ClosureId[];
const CLOSURE_ID_SET = new Set<string>(CLOSURE_IDS);
const DEFAULT_CLOSED_ITEMS = CLOSURE_IDS.filter(
  (closureId) =>
    closureId === "Community Center" ||
    closureId === "Drop-in Center" ||
    closureId === "Church",
);

const LEGACY_DEFAULT_CLOSED_ITEMS_V4 = new Set<ClosureId>([
  "Community Center",
  "Seniors",
  "Education",
  "Social",
  "Annex",
  "Drop-in Center",
  "Church",
]);

const LEGACY_DEFAULT_CLOSED_ITEMS_V5 = new Set<ClosureId>([
  "Community Center",
  "Social",
  "Annex",
  "Drop-in Center",
  "Church",
]);

function hasSameClosureSelection(
  selected: Set<ClosureId>,
  expected: Set<ClosureId>,
): boolean {
  if (selected.size !== expected.size) {
    return false;
  }

  for (const closureId of expected) {
    if (!selected.has(closureId)) {
      return false;
    }
  }

  return true;
}

interface PersistedScheduleState {
  date: string;
  closedItemsDefaultsVersion: number;
  currentDay: DayKey;
  presentCleanersByDay: PresentCleanersByDay;
  swapOperationsByDay: SwapOperationsByDay;
  buildingMoveOperationsByDay: BuildingMoveOperationsByDay;
  flo1AtAnnexByDay: Flo1AtAnnexByDay;
  daycareMoveOperationsByDay: DaycareMoveOperationsByDay;
  closedItemsByDay: ClosedItemsByDay;
}

interface ScheduleSnapshot {
  currentDay: DayKey;
  presentCleanersByDay: PresentCleanersByDay;
  swapOperationsByDay: SwapOperationsByDay;
  buildingMoveOperationsByDay: BuildingMoveOperationsByDay;
  flo1AtAnnexByDay: Flo1AtAnnexByDay;
  daycareMoveOperationsByDay: DaycareMoveOperationsByDay;
  closedItemsByDay: ClosedItemsByDay;
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

function getDefaultFlo1AtAnnexByDay(): Flo1AtAnnexByDay {
  return {
    mon: false,
    tue: false,
    wed: false,
    thu: false,
    fri: false,
  };
}

function getDefaultClosedItemsByDay(): ClosedItemsByDay {
  return {
    mon: [...DEFAULT_CLOSED_ITEMS],
    tue: [...DEFAULT_CLOSED_ITEMS],
    wed: [...DEFAULT_CLOSED_ITEMS],
    thu: [...DEFAULT_CLOSED_ITEMS],
    fri: [...DEFAULT_CLOSED_ITEMS],
  };
}

function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseLocalDateKey(dateKey: string): Date | null {
  const parts = dateKey.split("-");
  if (parts.length !== 3) return null;

  const [yearPart, monthPart, dayPart] = parts;
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }

  const parsedDate = new Date(year, month - 1, day);
  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return null;
  }

  parsedDate.setHours(0, 0, 0, 0);
  return parsedDate;
}

function getDisplayedWeekStart(referenceDate: Date): Date {
  const date = new Date(referenceDate);
  date.setHours(0, 0, 0, 0);

  // On weekends, map the calendar view to the upcoming work week.
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }

  const day = date.getDay();
  const daysFromMonday = (day + 6) % 7;
  date.setDate(date.getDate() - daysFromMonday);

  return date;
}

function getDateKeyForDayInDisplayedWeek(
  dayKey: DayKey,
  referenceDate: Date,
): string {
  const weekStart = getDisplayedWeekStart(referenceDate);
  const date = new Date(weekStart);
  date.setDate(weekStart.getDate() + DAY_OFFSET_BY_KEY[dayKey]);

  return getLocalDateKey(date);
}

function getDefaultScheduleSnapshot(currentDay: DayKey): ScheduleSnapshot {
  return {
    currentDay,
    presentCleanersByDay: getDefaultPresentCleanersByDay(),
    swapOperationsByDay: getDefaultSwapOperationsByDay(),
    buildingMoveOperationsByDay: getDefaultBuildingMoveOperationsByDay(),
    flo1AtAnnexByDay: getDefaultFlo1AtAnnexByDay(),
    daycareMoveOperationsByDay: getDefaultDaycareMoveOperationsByDay(),
    closedItemsByDay: getDefaultClosedItemsByDay(),
  };
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

function normalizeFlo1AtAnnexByDay(value: unknown): Flo1AtAnnexByDay {
  const source =
    value && typeof value === "object"
      ? (value as Partial<Record<DayKey, unknown>>)
      : {};

  return {
    mon: source.mon === true,
    tue: source.tue === true,
    wed: source.wed === true,
    thu: source.thu === true,
    fri: source.fri === true,
  };
}

function isClosureId(value: unknown): value is ClosureId {
  return typeof value === "string" && CLOSURE_ID_SET.has(value);
}

function normalizeClosedItemsForDay(
  value: unknown,
  backfillDefaultWhenEmpty: boolean,
): ClosureId[] {
  if (!Array.isArray(value)) return [...DEFAULT_CLOSED_ITEMS];
  const selected = new Set(value.filter(isClosureId));

  if (
    backfillDefaultWhenEmpty &&
    (value.length === 0 ||
      hasSameClosureSelection(selected, LEGACY_DEFAULT_CLOSED_ITEMS_V4) ||
      hasSameClosureSelection(selected, LEGACY_DEFAULT_CLOSED_ITEMS_V5))
  ) {
    return [...DEFAULT_CLOSED_ITEMS];
  }

  return CLOSURE_IDS.filter((closureId) => selected.has(closureId));
}

function normalizeClosedItemsByDay(
  value: unknown,
  backfillDefaultWhenEmpty = false,
): ClosedItemsByDay {
  const source =
    value && typeof value === "object"
      ? (value as Partial<Record<DayKey, unknown>>)
      : {};

  return {
    mon: normalizeClosedItemsForDay(source.mon, backfillDefaultWhenEmpty),
    tue: normalizeClosedItemsForDay(source.tue, backfillDefaultWhenEmpty),
    wed: normalizeClosedItemsForDay(source.wed, backfillDefaultWhenEmpty),
    thu: normalizeClosedItemsForDay(source.thu, backfillDefaultWhenEmpty),
    fri: normalizeClosedItemsForDay(source.fri, backfillDefaultWhenEmpty),
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
  | "currentDay"
  | "presentCleanersByDay"
  | "swapOperationsByDay"
  | "buildingMoveOperationsByDay"
  | "flo1AtAnnexByDay"
  | "daycareMoveOperationsByDay"
  | "closedItemsByDay"
> | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedScheduleState>;
    const backfillDefaultWhenEmpty =
      parsed.closedItemsDefaultsVersion !== CLOSED_ITEMS_DEFAULTS_VERSION;

    if (parsed.date !== todayDateKey) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    const currentDay = isDayKey(parsed.currentDay) ? parsed.currentDay : null;

    if (!currentDay) return null;

    return {
      currentDay,
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
      flo1AtAnnexByDay: normalizeFlo1AtAnnexByDay(parsed.flo1AtAnnexByDay),
      daycareMoveOperationsByDay: normalizeSwapOperationsByDay(
        parsed.daycareMoveOperationsByDay,
        JOBS.length,
      ),
      closedItemsByDay: normalizeClosedItemsByDay(
        parsed.closedItemsByDay,
        backfillDefaultWhenEmpty,
      ),
    };
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function getScheduleSnapshotFromFirestoreData(
  value: unknown,
  fallbackCurrentDay: DayKey,
): ScheduleSnapshot | null {
  const source =
    value && typeof value === "object"
      ? (value as Partial<Record<string, unknown>>)
      : null;

  if (!source) return null;

  const backfillDefaultWhenEmpty =
    source.closedItemsDefaultsVersion !== CLOSED_ITEMS_DEFAULTS_VERSION;

  return {
    currentDay: isDayKey(source.currentDay)
      ? source.currentDay
      : fallbackCurrentDay,
    presentCleanersByDay: normalizePresentCleanersByDay(
      source.presentCleanersByDay,
    ),
    swapOperationsByDay: normalizeSwapOperationsByDay(
      source.swapOperationsByDay,
      JOBS.length,
    ),
    buildingMoveOperationsByDay: normalizeSwapOperationsByDay(
      source.buildingMoveOperationsByDay,
      JOBS.length,
    ),
    flo1AtAnnexByDay: normalizeFlo1AtAnnexByDay(source.flo1AtAnnexByDay),
    daycareMoveOperationsByDay: normalizeSwapOperationsByDay(
      source.daycareMoveOperationsByDay,
      JOBS.length,
    ),
    closedItemsByDay: normalizeClosedItemsByDay(
      source.closedItemsByDay,
      backfillDefaultWhenEmpty,
    ),
  };
}

function getIsoDateFromFirestoreTimestamp(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  return null;
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

  const [currentDay, setCurrentDayState] = useState<DayKey>(
    persistedScheduleState?.currentDay ?? todayDayKey,
  );
  const [selectedDateKey, setSelectedDateKey] = useState(() =>
    getDateKeyForDayInDisplayedWeek(
      persistedScheduleState?.currentDay ?? todayDayKey,
      today,
    ),
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
  const [flo1AtAnnexByDay, setFlo1AtAnnexByDay] = useState<Flo1AtAnnexByDay>(
    persistedScheduleState?.flo1AtAnnexByDay ?? getDefaultFlo1AtAnnexByDay(),
  );
  const [daycareMoveOperationsByDay, setDaycareMoveOperationsByDay] =
    useState<DaycareMoveOperationsByDay>(
      persistedScheduleState?.daycareMoveOperationsByDay ??
        getDefaultDaycareMoveOperationsByDay(),
    );
  const [closedItemsByDay, setClosedItemsByDay] = useState<ClosedItemsByDay>(
    persistedScheduleState?.closedItemsByDay ?? getDefaultClosedItemsByDay(),
  );
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [saveScheduleError, setSaveScheduleError] = useState<string | null>(
    null,
  );
  const [lastSavedToCloudAt, setLastSavedToCloudAt] = useState<string | null>(
    null,
  );
  const [pastScheduleSnapshot, setPastScheduleSnapshot] =
    useState<ScheduleSnapshot | null>(null);

  const selectedDate = useMemo(
    () => parseLocalDateKey(selectedDateKey) ?? today,
    [selectedDateKey, today],
  );
  const selectedDateDayKey = useMemo(
    () => getDayKeyFromDate(selectedDate),
    [selectedDate],
  );
  const isViewingPastDate = selectedDateKey < todayDateKey;

  const setCurrentDay: React.Dispatch<React.SetStateAction<DayKey>> = (
    valueOrUpdater,
  ) => {
    setCurrentDayState((current) => {
      const nextDay =
        typeof valueOrUpdater === "function"
          ? valueOrUpdater(current)
          : valueOrUpdater;

      setSelectedDateKey((currentDateKey) => {
        const referenceDate = parseLocalDateKey(currentDateKey) ?? today;
        return getDateKeyForDayInDisplayedWeek(nextDay, referenceDate);
      });

      return nextDay;
    });
  };

  const setSelectedDateToToday = () => {
    setSelectedDateKey(todayDateKey);
    setCurrentDayState(todayDayKey);
  };

  const setSelectedDate = (dateKey: string) => {
    const parsedDate = parseLocalDateKey(dateKey);
    if (!parsedDate) return;

    const normalizedDateKey = getLocalDateKey(parsedDate);
    setSelectedDateKey(normalizedDateKey);
    setCurrentDayState(getDayKeyFromDate(parsedDate));
  };

  const setPresentCleaners: React.Dispatch<
    React.SetStateAction<CleanerId[]>
  > = (valueOrUpdater) => {
    if (isViewingPastDate) return;

    setPresentCleanersByDay((current) => {
      const nextForCurrentDay =
        typeof valueOrUpdater === "function"
          ? valueOrUpdater(current[currentDay])
          : valueOrUpdater;

      return {
        ...current,
        [currentDay]: nextForCurrentDay,
      };
    });
  };

  const toggleClosedItem = (closureId: ClosureId) => {
    if (isViewingPastDate) return;

    setClosedItemsByDay((current) => {
      const nextSelection = new Set(current[currentDay]);

      if (nextSelection.has(closureId)) {
        nextSelection.delete(closureId);
      } else {
        nextSelection.add(closureId);
      }

      return {
        ...current,
        [currentDay]: CLOSURE_IDS.filter((id) => nextSelection.has(id)),
      };
    });
  };

  useEffect(() => {
    if (!isViewingPastDate) {
      setPastScheduleSnapshot(null);
      return;
    }

    if (!db) {
      setPastScheduleSnapshot(null);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "dailySchedules", selectedDateKey),
      (snapshot) => {
        if (!snapshot.exists()) {
          setPastScheduleSnapshot(null);
          return;
        }

        const syncedSnapshot = getScheduleSnapshotFromFirestoreData(
          snapshot.data(),
          selectedDateDayKey,
        );

        if (!syncedSnapshot) {
          setPastScheduleSnapshot(null);
          return;
        }

        setPastScheduleSnapshot(syncedSnapshot);
      },
      () => {
        setPastScheduleSnapshot(null);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [isViewingPastDate, selectedDateDayKey, selectedDateKey]);

  const getDerivedAssignmentsForSnapshot = (
    snapshot: ScheduleSnapshot,
    referenceDate: Date,
  ) => {
    const generatedWeeklyAssignments = generateWeeklyAssignments(
      STAFF_CLEANERS,
      referenceDate,
      JOBS.length,
      snapshot.presentCleanersByDay,
      JOBS,
      CALL_IN_CLEANERS,
    );

    const snapshotWeeklyAssignments = {
      mon: enforceNecessaryJobsBeforeFlo({
        assignments: applyDaySwapOperations(
          generatedWeeklyAssignments.mon,
          snapshot.swapOperationsByDay.mon,
        ),
        jobs: JOBS,
      }),
      tue: enforceNecessaryJobsBeforeFlo({
        assignments: applyDaySwapOperations(
          generatedWeeklyAssignments.tue,
          snapshot.swapOperationsByDay.tue,
        ),
        jobs: JOBS,
      }),
      wed: enforceNecessaryJobsBeforeFlo({
        assignments: applyDaySwapOperations(
          generatedWeeklyAssignments.wed,
          snapshot.swapOperationsByDay.wed,
        ),
        jobs: JOBS,
      }),
      thu: enforceNecessaryJobsBeforeFlo({
        assignments: applyDaySwapOperations(
          generatedWeeklyAssignments.thu,
          snapshot.swapOperationsByDay.thu,
        ),
        jobs: JOBS,
      }),
      fri: enforceNecessaryJobsBeforeFlo({
        assignments: applyDaySwapOperations(
          generatedWeeklyAssignments.fri,
          snapshot.swapOperationsByDay.fri,
        ),
        jobs: JOBS,
      }),
    };

    const snapshotBuildingWeeklyAssignments = {
      mon: applyDaySwapOperations(
        snapshotWeeklyAssignments.mon,
        snapshot.buildingMoveOperationsByDay.mon,
      ),
      tue: applyDaySwapOperations(
        snapshotWeeklyAssignments.tue,
        snapshot.buildingMoveOperationsByDay.tue,
      ),
      wed: applyDaySwapOperations(
        snapshotWeeklyAssignments.wed,
        snapshot.buildingMoveOperationsByDay.wed,
      ),
      thu: applyDaySwapOperations(
        snapshotWeeklyAssignments.thu,
        snapshot.buildingMoveOperationsByDay.thu,
      ),
      fri: applyDaySwapOperations(
        snapshotWeeklyAssignments.fri,
        snapshot.buildingMoveOperationsByDay.fri,
      ),
    };

    const snapshotDaycareWeeklyAssignments = {
      mon: applyDaySwapOperations(
        snapshotWeeklyAssignments.mon,
        snapshot.daycareMoveOperationsByDay.mon,
      ),
      tue: applyDaySwapOperations(
        snapshotWeeklyAssignments.tue,
        snapshot.daycareMoveOperationsByDay.tue,
      ),
      wed: applyDaySwapOperations(
        snapshotWeeklyAssignments.wed,
        snapshot.daycareMoveOperationsByDay.wed,
      ),
      thu: applyDaySwapOperations(
        snapshotWeeklyAssignments.thu,
        snapshot.daycareMoveOperationsByDay.thu,
      ),
      fri: applyDaySwapOperations(
        snapshotWeeklyAssignments.fri,
        snapshot.daycareMoveOperationsByDay.fri,
      ),
    };

    const baselineWeeklyAssignments = generateWeeklyAssignments(
      STAFF_CLEANERS,
      referenceDate,
      JOBS.length,
      undefined,
      JOBS,
      CALL_IN_CLEANERS,
    );

    const snapshotReferenceWeeklyAssignments = {
      mon: enforceNecessaryJobsBeforeFlo({
        assignments: applyDaySwapOperations(
          baselineWeeklyAssignments.mon,
          snapshot.swapOperationsByDay.mon,
        ),
        jobs: JOBS,
      }),
      tue: enforceNecessaryJobsBeforeFlo({
        assignments: applyDaySwapOperations(
          baselineWeeklyAssignments.tue,
          snapshot.swapOperationsByDay.tue,
        ),
        jobs: JOBS,
      }),
      wed: enforceNecessaryJobsBeforeFlo({
        assignments: applyDaySwapOperations(
          baselineWeeklyAssignments.wed,
          snapshot.swapOperationsByDay.wed,
        ),
        jobs: JOBS,
      }),
      thu: enforceNecessaryJobsBeforeFlo({
        assignments: applyDaySwapOperations(
          baselineWeeklyAssignments.thu,
          snapshot.swapOperationsByDay.thu,
        ),
        jobs: JOBS,
      }),
      fri: enforceNecessaryJobsBeforeFlo({
        assignments: applyDaySwapOperations(
          baselineWeeklyAssignments.fri,
          snapshot.swapOperationsByDay.fri,
        ),
        jobs: JOBS,
      }),
    };

    const snapshotWeeklyReassignmentFlags = getWeeklyReassignmentFlags({
      baseAssignments: baselineWeeklyAssignments,
      adjustedAssignments: snapshotWeeklyAssignments,
    });

    const snapshotBuildingReassignmentFlags = getWeeklyReassignmentFlags({
      baseAssignments: snapshotWeeklyAssignments,
      adjustedAssignments: snapshotBuildingWeeklyAssignments,
    });

    const snapshotDaycareReassignmentFlags = getWeeklyReassignmentFlags({
      baseAssignments: snapshotWeeklyAssignments,
      adjustedAssignments: snapshotDaycareWeeklyAssignments,
    });

    return {
      snapshotWeeklyAssignments,
      snapshotReferenceWeeklyAssignments,
      snapshotWeeklyReassignmentFlags,
      snapshotBuildingWeeklyAssignments,
      snapshotBuildingReassignmentFlags,
      snapshotDaycareWeeklyAssignments,
      snapshotDaycareReassignmentFlags,
    };
  };

  const editableSnapshot = useMemo(
    () => ({
      currentDay,
      presentCleanersByDay,
      swapOperationsByDay,
      buildingMoveOperationsByDay,
      flo1AtAnnexByDay,
      daycareMoveOperationsByDay,
      closedItemsByDay,
    }),
    [
      buildingMoveOperationsByDay,
      closedItemsByDay,
      currentDay,
      daycareMoveOperationsByDay,
      flo1AtAnnexByDay,
      presentCleanersByDay,
      swapOperationsByDay,
    ],
  );

  const historicalSnapshot = useMemo(
    () =>
      pastScheduleSnapshot ?? getDefaultScheduleSnapshot(selectedDateDayKey),
    [pastScheduleSnapshot, selectedDateDayKey],
  );

  const editableDerivedAssignments = useMemo(
    () => getDerivedAssignmentsForSnapshot(editableSnapshot, today),
    [editableSnapshot, today],
  );

  const historicalDerivedAssignments = useMemo(
    () => getDerivedAssignmentsForSnapshot(historicalSnapshot, selectedDate),
    [historicalSnapshot, selectedDate],
  );

  const activeSnapshot = isViewingPastDate
    ? historicalSnapshot
    : editableSnapshot;
  const activeDerivedAssignments = isViewingPastDate
    ? historicalDerivedAssignments
    : editableDerivedAssignments;

  const weeklyPublicHolidays = useMemo(
    () => getOntarioPublicHolidaysByDayForWeek(selectedDate),
    [selectedDate],
  );
  const weeklyExtraHolidays = useMemo(
    () => getExtraHolidaysByDayForWeek(selectedDate),
    [selectedDate],
  );
  const weeklyMarchBreakReducedSchedule = useMemo(
    () => getMarchBreakReducedScheduleByDayForWeek(selectedDate),
    [selectedDate],
  );
  const isMarchBreakReducedScheduleDay = Boolean(
    weeklyMarchBreakReducedSchedule[currentDay],
  );
  const weeklyAssignments = activeDerivedAssignments.snapshotWeeklyAssignments;
  const referenceWeeklyAssignments =
    activeDerivedAssignments.snapshotReferenceWeeklyAssignments;
  const weeklyReassignmentFlags =
    activeDerivedAssignments.snapshotWeeklyReassignmentFlags;
  const buildingWeeklyAssignments =
    activeDerivedAssignments.snapshotBuildingWeeklyAssignments;
  const buildingReassignmentFlags =
    activeDerivedAssignments.snapshotBuildingReassignmentFlags;
  const daycareWeeklyAssignments =
    activeDerivedAssignments.snapshotDaycareWeeklyAssignments;
  const daycareReassignmentFlags =
    activeDerivedAssignments.snapshotDaycareReassignmentFlags;

  const presentCleaners = activeSnapshot.presentCleanersByDay[currentDay];
  const closedItems = activeSnapshot.closedItemsByDay[currentDay];
  const flo1AtAnnex = activeSnapshot.flo1AtAnnexByDay[currentDay];
  const peopleIn = presentCleaners.length;

  const swapAssignments = (
    day: DayKey,
    fromJobIndex: number,
    toJobIndex: number,
  ) => {
    if (isViewingPastDate) return;

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
    if (isViewingPastDate) return;

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

  const setFlo1AtAnnexForDay = (day: DayKey, value: boolean) => {
    if (isViewingPastDate) return;

    setFlo1AtAnnexByDay((current) => ({
      ...current,
      [day]: value,
    }));
  };

  const moveDaycareAssignment = (
    day: DayKey,
    fromJobIndex: number,
    toJobIndex: number,
  ) => {
    if (isViewingPastDate) return;

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

  const persistScheduleSnapshotToFirestore = async (
    snapshot: ScheduleSnapshot,
  ) => {
    if (!db) {
      const message = firebaseConfigError ?? FIREBASE_NOT_CONFIGURED_MESSAGE;
      setSaveScheduleError(message);
      throw new Error(message);
    }

    if (isSavingSchedule) return;

    setIsSavingSchedule(true);
    setSaveScheduleError(null);

    const {
      snapshotWeeklyAssignments,
      snapshotBuildingWeeklyAssignments,
      snapshotDaycareWeeklyAssignments,
    } = getDerivedAssignmentsForSnapshot(snapshot, today);

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    try {
      const savePromise = setDoc(
        doc(db, "dailySchedules", todayDateKey),
        {
          date: todayDateKey,
          closedItemsDefaultsVersion: CLOSED_ITEMS_DEFAULTS_VERSION,
          todayDayKey,
          currentDay: snapshot.currentDay,
          presentCleanersByDay: snapshot.presentCleanersByDay,
          swapOperationsByDay: snapshot.swapOperationsByDay,
          buildingMoveOperationsByDay: snapshot.buildingMoveOperationsByDay,
          flo1AtAnnexByDay: snapshot.flo1AtAnnexByDay,
          daycareMoveOperationsByDay: snapshot.daycareMoveOperationsByDay,
          closedItemsByDay: snapshot.closedItemsByDay,
          weeklyAssignments: snapshotWeeklyAssignments,
          buildingWeeklyAssignments: snapshotBuildingWeeklyAssignments,
          daycareWeeklyAssignments: snapshotDaycareWeeklyAssignments,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(
            new Error(
              `Cloud save timed out after ${Math.floor(FIRESTORE_SAVE_TIMEOUT_MS / 1000)} seconds. Check your internet connection and Firebase configuration, then try again.`,
            ),
          );
        }, FIRESTORE_SAVE_TIMEOUT_MS);
      });

      await Promise.race([savePromise, timeoutPromise]);

      setLastSavedToCloudAt(new Date().toISOString());
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to save schedule to Firestore.";

      setSaveScheduleError(message);
      throw error;
    } finally {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }

      setIsSavingSchedule(false);
    }
  };

  const saveScheduleToFirestore = async () => {
    if (isViewingPastDate) return;

    await persistScheduleSnapshotToFirestore({
      currentDay,
      presentCleanersByDay,
      swapOperationsByDay,
      buildingMoveOperationsByDay,
      flo1AtAnnexByDay,
      daycareMoveOperationsByDay,
      closedItemsByDay,
    });
  };

  const resetScheduleState = async () => {
    if (isViewingPastDate) return;

    const snapshot: ScheduleSnapshot = {
      currentDay: todayDayKey,
      presentCleanersByDay: getDefaultPresentCleanersByDay(),
      swapOperationsByDay: getDefaultSwapOperationsByDay(),
      buildingMoveOperationsByDay: getDefaultBuildingMoveOperationsByDay(),
      flo1AtAnnexByDay: getDefaultFlo1AtAnnexByDay(),
      daycareMoveOperationsByDay: getDefaultDaycareMoveOperationsByDay(),
      closedItemsByDay: getDefaultClosedItemsByDay(),
    };

    setSelectedDateToToday();
    setPresentCleanersByDay(snapshot.presentCleanersByDay);
    setSwapOperationsByDay(snapshot.swapOperationsByDay);
    setBuildingMoveOperationsByDay(snapshot.buildingMoveOperationsByDay);
    setFlo1AtAnnexByDay(snapshot.flo1AtAnnexByDay);
    setDaycareMoveOperationsByDay(snapshot.daycareMoveOperationsByDay);
    setClosedItemsByDay(snapshot.closedItemsByDay);

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }

    await persistScheduleSnapshotToFirestore(snapshot);
  };

  useEffect(() => {
    if (typeof window === "undefined" || isViewingPastDate) return;

    if (!db) {
      setSaveScheduleError(
        firebaseConfigError ?? FIREBASE_NOT_CONFIGURED_MESSAGE,
      );
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "dailySchedules", todayDateKey),
      (snapshot) => {
        if (!snapshot.exists()) return;

        const data = snapshot.data();
        const syncedSnapshot = getScheduleSnapshotFromFirestoreData(
          data,
          todayDayKey,
        );

        if (!syncedSnapshot) return;

        setPresentCleanersByDay(syncedSnapshot.presentCleanersByDay);
        setSwapOperationsByDay(syncedSnapshot.swapOperationsByDay);
        setBuildingMoveOperationsByDay(
          syncedSnapshot.buildingMoveOperationsByDay,
        );
        setFlo1AtAnnexByDay(syncedSnapshot.flo1AtAnnexByDay);
        setDaycareMoveOperationsByDay(
          syncedSnapshot.daycareMoveOperationsByDay,
        );
        setClosedItemsByDay(syncedSnapshot.closedItemsByDay);

        const updatedAtIso = getIsoDateFromFirestoreTimestamp(data.updatedAt);
        if (updatedAtIso) {
          setLastSavedToCloudAt(updatedAtIso);
        }

        setSaveScheduleError(null);
      },
      (error) => {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to sync schedule from Firestore.";

        setSaveScheduleError(message);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [isViewingPastDate, todayDateKey, todayDayKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const payload: PersistedScheduleState = {
      date: todayDateKey,
      closedItemsDefaultsVersion: CLOSED_ITEMS_DEFAULTS_VERSION,
      currentDay,
      presentCleanersByDay,
      swapOperationsByDay,
      buildingMoveOperationsByDay,
      flo1AtAnnexByDay,
      daycareMoveOperationsByDay,
      closedItemsByDay,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [
    buildingMoveOperationsByDay,
    closedItemsByDay,
    flo1AtAnnexByDay,
    daycareMoveOperationsByDay,
    presentCleanersByDay,
    currentDay,
    isViewingPastDate,
    swapOperationsByDay,
    todayDateKey,
  ]);

  return (
    <ScheduleContext.Provider
      value={{
        todayDateKey,
        todayDayKey,
        selectedDateKey,
        isViewingPastDate,
        weeklyPublicHolidays,
        weeklyExtraHolidays,
        isMarchBreakReducedScheduleDay,
        weeklyAssignments,
        referenceWeeklyAssignments,
        weeklyReassignmentFlags,
        buildingWeeklyAssignments,
        buildingReassignmentFlags,
        daycareWeeklyAssignments,
        daycareReassignmentFlags,
        closedItems,
        toggleClosedItem,
        presentCleaners,
        setPresentCleaners,
        peopleIn,
        currentDay,
        setCurrentDay,
        setSelectedDateToToday,
        setSelectedDate,
        swapAssignments,
        moveBuildingAssignment,
        flo1AtAnnex,
        setFlo1AtAnnexForDay,
        moveDaycareAssignment,
        saveScheduleToFirestore,
        isSavingSchedule,
        saveScheduleError,
        lastSavedToCloudAt,
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
