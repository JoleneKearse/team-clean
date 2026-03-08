import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";

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
import { db } from "../lib/firebase";

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
  currentDay: DayKey;
  setCurrentDay: React.Dispatch<React.SetStateAction<DayKey>>;
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

type PresentCleanersByDay = Record<DayKey, CleanerId[]>;
type SwapOperation = {
  fromJobIndex: number;
  toJobIndex: number;
};
type SwapOperationsByDay = Record<DayKey, SwapOperation[]>;
type BuildingMoveOperationsByDay = Record<DayKey, SwapOperation[]>;
type DaycareMoveOperationsByDay = Record<DayKey, SwapOperation[]>;
type Flo1AtAnnexByDay = Record<DayKey, boolean>;

interface PersistedScheduleState {
  date: string;
  currentDay: DayKey;
  presentCleanersByDay: PresentCleanersByDay;
  swapOperationsByDay: SwapOperationsByDay;
  buildingMoveOperationsByDay: BuildingMoveOperationsByDay;
  flo1AtAnnexByDay: Flo1AtAnnexByDay;
  daycareMoveOperationsByDay: DaycareMoveOperationsByDay;
}

interface ScheduleSnapshot {
  currentDay: DayKey;
  presentCleanersByDay: PresentCleanersByDay;
  swapOperationsByDay: SwapOperationsByDay;
  buildingMoveOperationsByDay: BuildingMoveOperationsByDay;
  flo1AtAnnexByDay: Flo1AtAnnexByDay;
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

function getDefaultFlo1AtAnnexByDay(): Flo1AtAnnexByDay {
  return {
    mon: false,
    tue: false,
    wed: false,
    thu: false,
    fri: false,
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

  const [currentDay, setCurrentDay] = useState<DayKey>(
    persistedScheduleState?.currentDay ?? todayDayKey,
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
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [saveScheduleError, setSaveScheduleError] = useState<string | null>(
    null,
  );
  const [lastSavedToCloudAt, setLastSavedToCloudAt] = useState<string | null>(
    null,
  );
  const flo1AtAnnex = flo1AtAnnexByDay[currentDay];

  const presentCleaners = presentCleanersByDay[currentDay];

  const setPresentCleaners: React.Dispatch<
    React.SetStateAction<CleanerId[]>
  > = (valueOrUpdater) => {
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

  const getDerivedAssignmentsForSnapshot = (snapshot: ScheduleSnapshot) => {
    const generatedWeeklyAssignments = generateWeeklyAssignments(
      STAFF_CLEANERS,
      today,
      JOBS.length,
      snapshot.presentCleanersByDay,
      JOBS,
      CALL_IN_CLEANERS,
    );

    const snapshotWeeklyAssignments = {
      mon: applyDaySwapOperations(
        generatedWeeklyAssignments.mon,
        snapshot.swapOperationsByDay.mon,
      ),
      tue: applyDaySwapOperations(
        generatedWeeklyAssignments.tue,
        snapshot.swapOperationsByDay.tue,
      ),
      wed: applyDaySwapOperations(
        generatedWeeklyAssignments.wed,
        snapshot.swapOperationsByDay.wed,
      ),
      thu: applyDaySwapOperations(
        generatedWeeklyAssignments.thu,
        snapshot.swapOperationsByDay.thu,
      ),
      fri: applyDaySwapOperations(
        generatedWeeklyAssignments.fri,
        snapshot.swapOperationsByDay.fri,
      ),
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

    return {
      snapshotWeeklyAssignments,
      snapshotBuildingWeeklyAssignments,
      snapshotDaycareWeeklyAssignments,
    };
  };

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

  const setFlo1AtAnnexForDay = (day: DayKey, value: boolean) => {
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
    if (isSavingSchedule) return;

    setIsSavingSchedule(true);
    setSaveScheduleError(null);

    const {
      snapshotWeeklyAssignments,
      snapshotBuildingWeeklyAssignments,
      snapshotDaycareWeeklyAssignments,
    } = getDerivedAssignmentsForSnapshot(snapshot);

    try {
      await setDoc(
        doc(db, "dailySchedules", todayDateKey),
        {
          date: todayDateKey,
          todayDayKey,
          currentDay: snapshot.currentDay,
          presentCleanersByDay: snapshot.presentCleanersByDay,
          swapOperationsByDay: snapshot.swapOperationsByDay,
          buildingMoveOperationsByDay: snapshot.buildingMoveOperationsByDay,
          flo1AtAnnexByDay: snapshot.flo1AtAnnexByDay,
          daycareMoveOperationsByDay: snapshot.daycareMoveOperationsByDay,
          weeklyAssignments: snapshotWeeklyAssignments,
          buildingWeeklyAssignments: snapshotBuildingWeeklyAssignments,
          daycareWeeklyAssignments: snapshotDaycareWeeklyAssignments,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      setLastSavedToCloudAt(new Date().toISOString());
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to save schedule to Firestore.";

      setSaveScheduleError(message);
      throw error;
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const saveScheduleToFirestore = async () => {
    await persistScheduleSnapshotToFirestore({
      currentDay,
      presentCleanersByDay,
      swapOperationsByDay,
      buildingMoveOperationsByDay,
      flo1AtAnnexByDay,
      daycareMoveOperationsByDay,
    });
  };

  const resetScheduleState = async () => {
    const snapshot: ScheduleSnapshot = {
      currentDay: todayDayKey,
      presentCleanersByDay: getDefaultPresentCleanersByDay(),
      swapOperationsByDay: getDefaultSwapOperationsByDay(),
      buildingMoveOperationsByDay: getDefaultBuildingMoveOperationsByDay(),
      flo1AtAnnexByDay: getDefaultFlo1AtAnnexByDay(),
      daycareMoveOperationsByDay: getDefaultDaycareMoveOperationsByDay(),
    };

    setCurrentDay(snapshot.currentDay);
    setPresentCleanersByDay(snapshot.presentCleanersByDay);
    setSwapOperationsByDay(snapshot.swapOperationsByDay);
    setBuildingMoveOperationsByDay(snapshot.buildingMoveOperationsByDay);
    setFlo1AtAnnexByDay(snapshot.flo1AtAnnexByDay);
    setDaycareMoveOperationsByDay(snapshot.daycareMoveOperationsByDay);

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }

    await persistScheduleSnapshotToFirestore(snapshot);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

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

        setCurrentDay(syncedSnapshot.currentDay);
        setPresentCleanersByDay(syncedSnapshot.presentCleanersByDay);
        setSwapOperationsByDay(syncedSnapshot.swapOperationsByDay);
        setBuildingMoveOperationsByDay(
          syncedSnapshot.buildingMoveOperationsByDay,
        );
        setFlo1AtAnnexByDay(syncedSnapshot.flo1AtAnnexByDay);
        setDaycareMoveOperationsByDay(
          syncedSnapshot.daycareMoveOperationsByDay,
        );

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
  }, [todayDateKey, todayDayKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const payload: PersistedScheduleState = {
      date: todayDateKey,
      currentDay,
      presentCleanersByDay,
      swapOperationsByDay,
      buildingMoveOperationsByDay,
      flo1AtAnnexByDay,
      daycareMoveOperationsByDay,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [
    buildingMoveOperationsByDay,
    flo1AtAnnexByDay,
    daycareMoveOperationsByDay,
    presentCleanersByDay,
    currentDay,
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
        currentDay,
        setCurrentDay,
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
