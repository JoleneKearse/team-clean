import type { CleanerId, DayKey, JobId, ShiftEvent } from "../types/types";
import { ANCHOR_MONDAY, isNecessaryJob } from "../constants/consts";
import {
  getExtraHolidayOnDate,
  getOntarioPublicHolidayOnDate,
} from "./holidayUtils";

function rotate<T>(arr: readonly T[], shiftDown: number): T[] {
  const len = arr.length;
  if (len === 0) return [];

  // normalize shiftDown to be within the bounds of the array length
  const size = ((shiftDown % len) + len) % len;
  // shiftDown=1: [a,b,c,d] -> [d,a,b,c]
  return arr.slice(len - size).concat(arr.slice(0, len - size));
}

const BACKFILL_PRIORITY: readonly JobId[] = ["Flo3", "Flo2", "Flo1"];
const WEEK_DAY_KEYS: readonly DayKey[] = ["mon", "tue", "wed", "thu", "fri"];

type ShiftPhaseWindows = {
  buildingsStartMinute: number;
  daycareStartMinute: number;
  lunchEndMinute: number;
  bandOfficeStartMinute: number;
  healthCenterStartMinute: number;
};

const WEEKDAY_SHIFT_PHASE_WINDOWS: ShiftPhaseWindows = {
  buildingsStartMinute: 16 * 60,
  daycareStartMinute: 18 * 60 + 30,
  lunchEndMinute: 21 * 60 + 15,
  bandOfficeStartMinute: 21 * 60 + 15,
  healthCenterStartMinute: 22 * 60,
};

const FRIDAY_SHIFT_PHASE_WINDOWS: ShiftPhaseWindows = {
  buildingsStartMinute: 19 * 60,
  daycareStartMinute: 17 * 60 + 30,
  lunchEndMinute: 20 * 60 + 15,
  bandOfficeStartMinute: 20 * 60 + 15,
  healthCenterStartMinute: 21 * 60 + 30,
};

function parseShiftTimeToMinute(time: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;

  return hour * 60 + minute;
}

export function getShiftPhaseWindowsForDay(params: {
  day: DayKey;
  isFridayized?: boolean;
}): ShiftPhaseWindows {
  const { day, isFridayized = false } = params;

  if (day === "fri" || (day === "thu" && isFridayized)) {
    return FRIDAY_SHIFT_PHASE_WINDOWS;
  }

  return WEEKDAY_SHIFT_PHASE_WINDOWS;
}

function getShiftEventMinute(params: {
  event: ShiftEvent;
  windows: ShiftPhaseWindows;
}): number | null {
  const { event, windows } = params;

  switch (event.timingKind) {
    case "atTime":
      return event.time ? parseShiftTimeToMinute(event.time) : null;
    case "forDaycare":
      return windows.daycareStartMinute;
    case "afterLunch":
      return windows.lunchEndMinute;
    case "sometime":
      return null;
    default:
      return null;
  }
}

export function getPresentCleanersAtShiftMinute(params: {
  basePresentCleaners: readonly CleanerId[];
  shiftEvents: readonly ShiftEvent[];
  day: DayKey;
  minuteOfDay: number;
  isFridayized?: boolean;
}): CleanerId[] {
  const {
    basePresentCleaners,
    shiftEvents,
    day,
    minuteOfDay,
    isFridayized = false,
  } = params;
  const windows = getShiftPhaseWindowsForDay({ day, isFridayized });
  const presentSet = new Set<CleanerId>(basePresentCleaners);

  const normalizedEvents = shiftEvents
    .map((event) => ({
      event,
      minute: getShiftEventMinute({ event, windows }),
    }))
    .sort((a, b) => {
      const minuteA = a.minute ?? Number.POSITIVE_INFINITY;
      const minuteB = b.minute ?? Number.POSITIVE_INFINITY;
      return minuteA - minuteB;
    });

  normalizedEvents.forEach(({ event, minute }) => {
    if (event.action === "in") {
      if (minute === null || minute > minuteOfDay) {
        presentSet.delete(event.cleanerId);
        return;
      }

      presentSet.add(event.cleanerId);
      return;
    }

    if (minute !== null && minute <= minuteOfDay) {
      presentSet.delete(event.cleanerId);
      return;
    }

    presentSet.add(event.cleanerId);
  });

  return basePresentCleaners.filter((cleaner) => presentSet.has(cleaner));
}

export function getPendingShiftInCleanersAtMinute(params: {
  shiftEvents: readonly ShiftEvent[];
  day: DayKey;
  minuteOfDay: number;
  isFridayized?: boolean;
}): CleanerId[] {
  const { shiftEvents, day, minuteOfDay, isFridayized = false } = params;
  const windows = getShiftPhaseWindowsForDay({ day, isFridayized });
  const pendingSet = new Set<CleanerId>();

  shiftEvents.forEach((event) => {
    if (event.action !== "in") return;

    const minute = getShiftEventMinute({ event, windows });
    if (minute === null || minute > minuteOfDay) {
      pendingSet.add(event.cleanerId);
      return;
    }

    pendingSet.delete(event.cleanerId);
  });

  return Array.from(pendingSet);
}

function normalizePeopleIn(peopleIn: number): number {
  return Math.max(0, Math.min(8, peopleIn));
}

export function getLowStaffingSkippedJobs(peopleIn: number): JobId[] {
  const staffing = normalizePeopleIn(peopleIn);
  const skippedJobs: JobId[] = [];

  if (staffing <= 4) {
    skippedJobs.push("Vac");
  }

  if (staffing <= 3) {
    skippedJobs.push("Gar");
  }

  return skippedJobs;
}

type DaycareScheduleOptions = {
  isMarchBreakReducedScheduleDay?: boolean;
};

export function getDaycareJobLabel(
  jobId: JobId,
  peopleIn: number,
  options: DaycareScheduleOptions = {},
): string {
  const staffing = normalizePeopleIn(peopleIn);
  const isMarchBreakReducedScheduleDay =
    options.isMarchBreakReducedScheduleDay === true;

  if (isMarchBreakReducedScheduleDay) {
    switch (jobId) {
      case "Bath":
        return "Bathrooms";
      case "Vac":
        return "Baby Room";
      case "SW":
        return "P2";
      case "San":
        return "Toddler and P2 lockers";
      case "Gar":
        return staffing <= 5 ? "Fill & all outside" : "Fill & Front outside";
      case "Flo1":
        return "Back outside";
      case "Flo2":
        if (staffing >= 7) return "Toddler Room & P2 lockers";
        return "Flo2";
      case "Flo3":
        if (staffing >= 7) return "Back outside & P1 lockers";
        return "Flo3";
      default:
        return jobId;
    }
  }

  switch (jobId) {
    case "Bath":
      return "Bathrooms";
    case "Vac":
      return "P1 & playground doorway";
    case "SW":
      return "P2";
    case "San":
      return "Kindergarten";
    case "Gar":
      return staffing <= 6 ? "Fill & all outside" : "Fill & front outside";
    case "Flo1":
      if (staffing >= 8) return "Baby Room & Kindergarten lockers";
      if (staffing <= 7) return "Baby & Toddler";
      return "Flo1";
    case "Flo2":
      if (staffing >= 8) return "Toddler Room & P2 lockers";
      if (staffing === 7) return "Back outside";
      return "Flo2";
    case "Flo3":
      if (staffing >= 8) return "Back outside & P1 lockers";
      return "Flo3";
    default:
      return jobId;
  }
}

export function getBandOfficeAssignmentsForDay(jobId: JobId): string {
  switch (jobId) {
    case "Flo1":
      return "Chambers or basement";
    case "Flo2":
      return "Basement";
    case "Flo3":
      return "Basement bathrooms";
    default:
      return "Basement";
  }
}

export function getHealthCenterAssignmentsForDay(
  jobId: JobId,
  peopleIn: number,
) {
  switch (jobId) {
    case "Vac":
      if (peopleIn <= 6) {
        return "Vac & big room";
      }
      return;
    case "Flo1":
      return "Medical rooms";
    case "Flo2":
      return "Big room";
    case "Flo3":
      return "Choose a wing";
    default:
      return "Clean something!";
  }
}

function getDaycareAreasForJob(
  jobId: JobId,
  peopleIn: number,
  options: DaycareScheduleOptions = {},
): string[] {
  const staffing = normalizePeopleIn(peopleIn);
  const isMarchBreakReducedScheduleDay =
    options.isMarchBreakReducedScheduleDay === true;

  if (isMarchBreakReducedScheduleDay) {
    switch (jobId) {
      case "Bath":
        return ["Bathrooms"];
      case "Vac":
        return ["Baby"];
      case "SW":
        return ["P2"];
      case "San":
        return ["Toddler"];
      case "Gar":
        return staffing <= 5
          ? ["Front outside", "Back outside"]
          : ["Front outside"];
      case "Flo1":
        return ["Back outside"];
      case "Flo2":
        if (staffing >= 7) return ["Toddler"];
        return [];
      case "Flo3":
        if (staffing >= 7) return ["Back outside"];
        return [];
      default:
        return [];
    }
  }

  switch (jobId) {
    case "Bath":
      return ["Bathrooms"];
    case "Vac":
      return ["P1"];
    case "SW":
      return ["P2"];
    case "San":
      return ["Kindergarten"];
    case "Gar":
      return staffing <= 6
        ? ["Front outside", "Back outside"]
        : ["Front outside"];
    case "Flo1":
      return staffing >= 8 ? ["Baby"] : ["Baby", "Toddler"];
    case "Flo2":
      if (staffing >= 8) return ["Toddler"];
      if (staffing === 7) return ["Back outside"];
      return [];
    case "Flo3":
      if (staffing >= 8) return ["Back outside"];
      return [];
    default:
      return [];
  }
}

export function getRequiredDaycareAreas(
  peopleIn: number,
  options: DaycareScheduleOptions = {},
): string[] {
  void peopleIn;

  if (options.isMarchBreakReducedScheduleDay) {
    return [
      "Bathrooms",
      "P2",
      "Baby",
      "Toddler",
      "Back outside",
      "Front outside",
    ];
  }

  return [
    "Bathrooms",
    "P1",
    "P2",
    "Kindergarten",
    "Baby",
    "Toddler",
    "Back outside",
    "Front outside",
  ];
}

function getMarchBreakSanBackfillArea(params: {
  jobs: readonly JobId[];
  dayAssignments: readonly string[];
  peopleIn: number;
  isMarchBreakReducedScheduleDay: boolean;
}): string | null {
  const { jobs, dayAssignments, peopleIn, isMarchBreakReducedScheduleDay } =
    params;

  if (!isMarchBreakReducedScheduleDay || normalizePeopleIn(peopleIn) !== 7) {
    return null;
  }

  const marchBreakSanLabel = getDaycareJobLabel("San", peopleIn, {
    isMarchBreakReducedScheduleDay,
  });

  if (marchBreakSanLabel !== "Needs assignment") {
    return null;
  }

  const sanJobIndex = jobs.indexOf("San");
  if (sanJobIndex < 0) {
    return null;
  }

  const sanInitials = dayAssignments[sanJobIndex] ?? "";
  if (!sanInitials) {
    return null;
  }

  const coveredAreasWithoutSan = new Set<string>();

  jobs.forEach((jobId, index) => {
    if (index === sanJobIndex) return;

    const initials = dayAssignments[index] ?? "";
    if (!initials) return;

    getDaycareAreasForJob(jobId, peopleIn, {
      isMarchBreakReducedScheduleDay,
    }).forEach((area) => {
      coveredAreasWithoutSan.add(area);
    });
  });

  return (
    getRequiredDaycareAreas(peopleIn, {
      isMarchBreakReducedScheduleDay,
    }).find((area) => !coveredAreasWithoutSan.has(area)) ?? null
  );
}

function getMarchBreakSanBackfillLabel(area: string): string {
  switch (area) {
    case "Bathrooms":
      return "Bathrooms";
    case "P1":
      return "P1 & playground doorway";
    case "P2":
      return "P2";
    case "Baby":
      return "Baby Room";
    case "Toddler":
      return "Toddler Room & P2 lockers";
    case "Back outside":
      return "Back outside & P1 lockers";
    case "Front outside":
      return "Fill & front outside";
    default:
      return area;
  }
}

export function getMissingDayCareAreasForDay(params: {
  day: DayKey;
  jobs: readonly JobId[];
  weeklyAssignments: WeeklyAssignments;
  peopleIn: number;
  isMarchBreakReducedScheduleDay?: boolean;
}) {
  const {
    day,
    jobs,
    weeklyAssignments,
    peopleIn,
    isMarchBreakReducedScheduleDay = false,
  } = params;
  const dayAssignments = weeklyAssignments[day];
  const coveredAreas = new Set<string>();

  jobs.forEach((jobId, index) => {
    const initials = dayAssignments[index] ?? "";
    if (!initials) return;

    getDaycareAreasForJob(jobId, peopleIn, {
      isMarchBreakReducedScheduleDay,
    }).forEach((area) => {
      coveredAreas.add(area);
    });
  });

  const marchBreakSanBackfillArea = getMarchBreakSanBackfillArea({
    jobs,
    dayAssignments,
    peopleIn,
    isMarchBreakReducedScheduleDay,
  });

  if (marchBreakSanBackfillArea) {
    coveredAreas.add(marchBreakSanBackfillArea);
  }

  return getRequiredDaycareAreas(peopleIn, {
    isMarchBreakReducedScheduleDay,
  }).filter((area) => !coveredAreas.has(area));
}

export function getDayKeyFromDate(referenceDate: Date): DayKey {
  const dayMap: Partial<Record<number, DayKey>> = {
    1: "mon",
    2: "tue",
    3: "wed",
    4: "thu",
    5: "fri",
  };

  return dayMap[referenceDate.getDay()] ?? "mon";
}

function parseAnchorMonday(anchorMonday: string): Date {
  const [year, month, day] = anchorMonday
    .split("-")
    .map((part) => Number(part));

  return new Date(year, month - 1, day);
}

function getStartOfWeekMonday(referenceDate: Date): Date {
  const date = new Date(referenceDate);
  date.setHours(0, 0, 0, 0);

  const day = date.getDay();
  const daysFromMonday = (day + 6) % 7;
  date.setDate(date.getDate() - daysFromMonday);

  return date;
}

function isWorkday(referenceDate: Date): boolean {
  const day = referenceDate.getDay();
  return day >= 1 && day <= 5;
}

function getRotationReferenceDate(referenceDate: Date): Date {
  const date = new Date(referenceDate);
  date.setHours(0, 0, 0, 0);

  // On weekends we preview the upcoming work week.
  while (!isWorkday(date)) {
    date.setDate(date.getDate() + 1);
  }

  return date;
}

function getElapsedWorkdays(anchorMonday: Date, untilDate: Date): number {
  const start = new Date(anchorMonday);
  const end = new Date(untilDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (start.getTime() === end.getTime()) return 0;

  if (start < end) {
    const cursor = new Date(start);
    let count = 0;

    while (cursor < end) {
      if (
        isWorkday(cursor) &&
        !getOntarioPublicHolidayOnDate(cursor) &&
        !getExtraHolidayOnDate(cursor)
      ) {
        count += 1;
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    return count;
  }

  const cursor = new Date(end);
  let count = 0;

  while (cursor < start) {
    if (
      isWorkday(cursor) &&
      !getOntarioPublicHolidayOnDate(cursor) &&
      !getExtraHolidayOnDate(cursor)
    ) {
      count += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return -count;
}

export function enforceNecessaryJobsBeforeFlo(params: {
  assignments: readonly string[];
  jobs: readonly JobId[];
}) {
  const { assignments, jobs } = params;
  const nextAssignments = [...assignments];
  const floatIndexesInFillOrder = (["Flo1", "Flo2", "Flo3"] as const)
    .map((jobId) => jobs.indexOf(jobId))
    .filter((index) => index >= 0);

  const floatDonorIndexes = BACKFILL_PRIORITY.map((jobId) =>
    jobs.indexOf(jobId),
  ).filter((index) => index >= 0);

  const findFloatDonorIndex = (targetIndex: number) => {
    for (const donorIndex of floatDonorIndexes) {
      if (donorIndex === targetIndex) continue;
      if (!nextAssignments[donorIndex]) continue;

      return donorIndex;
    }

    return -1;
  };

  const necessaryBackfillTargetIndexes = jobs
    .map((jobId, index) => ({ jobId, index }))
    .filter(
      ({ jobId, index }) => isNecessaryJob(jobId) && !nextAssignments[index],
    )
    .map(({ index }) => index);

  necessaryBackfillTargetIndexes.forEach((targetIndex) => {
    const donorIndex = findFloatDonorIndex(targetIndex);
    if (donorIndex < 0) return;

    nextAssignments[targetIndex] = nextAssignments[donorIndex];
    nextAssignments[donorIndex] = "";
  });

  // Fill empty float slots using the highest-ranked available float (Flo3 first).
  // Architecture rule: if Flo1 is out Flo3 becomes Flo1; if Flo2 is out Flo3
  // becomes Flo2. A lower float never steps up to fill an earlier gap — only a
  // higher float steps down. So we collect empty slots from lowest (Flo1) up,
  // and for each one we donate from the highest remaining filled float slot above it.
  const emptyFloatIndexes = floatIndexesInFillOrder.filter(
    (index) => !nextAssignments[index],
  );

  const filledFloatIndexesHighFirst = [...floatIndexesInFillOrder]
    .reverse()
    .filter((index) => Boolean(nextAssignments[index]));

  emptyFloatIndexes.forEach((targetIndex, i) => {
    const donorIndex = filledFloatIndexesHighFirst[i];
    if (donorIndex === undefined || donorIndex <= targetIndex) return;

    nextAssignments[targetIndex] = nextAssignments[donorIndex] ?? "";
    nextAssignments[donorIndex] = "";
  });

  return nextAssignments;
}

/**
 * Returns an object where each day is an array of initials in job-row order.
 */
export function generateWeeklyAssignments(
  cleaners: readonly string[],
  referenceDate: Date = new Date(),
  slotCount: number = 8,
  presentCleanersByDay?: Partial<Record<DayKey, readonly string[]>>,
  jobs: readonly JobId[] = [
    "Bath",
    "Flo1",
    "SW",
    "Flo2",
    "Vac",
    "San",
    "Flo3",
    "Gar",
  ],
  callInCleaners: readonly string[] = [],
) {
  const totalSlots = Math.max(0, slotCount);
  const base =
    cleaners.length === 0
      ? Array.from({ length: totalSlots }, () => "")
      : Array.from(
          { length: totalSlots },
          (_, index) => cleaners[index % cleaners.length],
        );

  const anchorMonday = parseAnchorMonday(ANCHOR_MONDAY);
  const rotationReferenceDate = getRotationReferenceDate(referenceDate);
  const weekStart = getStartOfWeekMonday(rotationReferenceDate);
  const weekOffset = getElapsedWorkdays(anchorMonday, weekStart);
  const emptyAssignments = Array.from({ length: totalSlots }, () => "");

  const rebalanceForPresence = (day: DayKey, dayAssignments: string[]) => {
    const presentForDay = presentCleanersByDay?.[day] ?? cleaners;
    const peopleInForDay = presentForDay.length;
    const presentSet = new Set(presentForDay);
    const callInSet = new Set(callInCleaners);
    const nextAssignments = [...dayAssignments];
    const missingStaffIndexes: number[] = [];

    for (let index = 0; index < jobs.length; index += 1) {
      const initials = nextAssignments[index] ?? "";
      if (initials && !presentSet.has(initials)) {
        nextAssignments[index] = "";
        missingStaffIndexes.push(index);
      }
    }

    const selectedCallIns = presentForDay.filter((initials) =>
      callInSet.has(initials),
    );

    if (missingStaffIndexes.length > 0 && selectedCallIns.length > 0) {
      missingStaffIndexes
        .slice(0, selectedCallIns.length)
        .forEach((index, replacementOrder) => {
          nextAssignments[index] = selectedCallIns[replacementOrder] ?? "";
        });
    }

    const rebalancedAssignments = enforceNecessaryJobsBeforeFlo({
      assignments: nextAssignments,
      jobs,
    });

    getLowStaffingSkippedJobs(peopleInForDay).forEach((jobId) => {
      const jobIndex = jobs.indexOf(jobId);
      if (jobIndex >= 0) {
        rebalancedAssignments[jobIndex] = "";
      }
    });

    return rebalancedAssignments;
  };

  const weekly: Record<DayKey, string[]> = {
    mon: [...emptyAssignments],
    tue: [...emptyAssignments],
    wed: [...emptyAssignments],
    thu: [...emptyAssignments],
    fri: [...emptyAssignments],
  };

  let rotationDayOffset = 0;

  WEEK_DAY_KEYS.forEach((dayKey, dayOffset) => {
    const dayDate = new Date(weekStart);
    dayDate.setDate(weekStart.getDate() + dayOffset);

    if (
      getOntarioPublicHolidayOnDate(dayDate) ||
      getExtraHolidayOnDate(dayDate)
    ) {
      weekly[dayKey] = [...emptyAssignments];
      return;
    }

    weekly[dayKey] = rebalanceForPresence(
      dayKey,
      rotate(base, weekOffset + rotationDayOffset),
    );
    rotationDayOffset += 1;
  });

  return weekly;
}

type WeeklyAssignments = Record<DayKey, string[]>;

export type WeeklyReassignmentFlags = Record<DayKey, boolean[]>;

export function getWeeklyReassignmentFlags(params: {
  baseAssignments: WeeklyAssignments;
  adjustedAssignments: WeeklyAssignments;
}) {
  const { baseAssignments, adjustedAssignments } = params;

  const flags: WeeklyReassignmentFlags = {
    mon: [],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
  };

  (Object.keys(flags) as DayKey[]).forEach((day) => {
    const baseDay = baseAssignments[day];
    const adjustedDay = adjustedAssignments[day];
    const maxLen = Math.max(baseDay.length, adjustedDay.length);

    flags[day] = Array.from({ length: maxLen }, (_, index) => {
      const before = baseDay[index] ?? "";
      const after = adjustedDay[index] ?? "";
      return after !== "" && after !== before;
    });
  });

  return flags;
}

/**
 * For a given day + building job list, return the initials assigned to those jobs.
 * It looks up the job's row index in `jobs`, then pulls initials from weeklyAssignments[day][rowIndex].
 */
export function getBuildingAssignmentsForDay(params: {
  day: DayKey;
  jobs: readonly JobId[];
  weeklyAssignments: WeeklyAssignments;
  buildingJobs: readonly JobId[];
}) {
  const { day, jobs, weeklyAssignments, buildingJobs } = params;
  const dayAssignments = weeklyAssignments[day];

  return buildingJobs.map((jobId) => {
    const idx = jobs.indexOf(jobId);

    return {
      job: jobId,
      initials: idx >= 0 ? (dayAssignments[idx] ?? "") : "",
      missing: idx < 0,
    };
  });
}

export function getDayCareAssignmentsForDay(params: {
  day: DayKey;
  jobs: readonly JobId[];
  weeklyAssignments: WeeklyAssignments;
  peopleIn: number;
  isMarchBreakReducedScheduleDay?: boolean;
}) {
  const {
    day,
    jobs,
    weeklyAssignments,
    peopleIn,
    isMarchBreakReducedScheduleDay = false,
  } = params;
  const dayAssignments = weeklyAssignments[day];
  const marchBreakSanBackfillArea = getMarchBreakSanBackfillArea({
    jobs,
    dayAssignments,
    peopleIn,
    isMarchBreakReducedScheduleDay,
  });

  return jobs.map((jobId, index) => {
    const initials = dayAssignments[index] ?? "";
    const label =
      jobId === "San" && marchBreakSanBackfillArea
        ? getMarchBreakSanBackfillLabel(marchBreakSanBackfillArea)
        : getDaycareJobLabel(jobId, peopleIn, {
            isMarchBreakReducedScheduleDay,
          });

    return {
      job: jobId,
      initials,
      label,
      missing: !dayAssignments[index],
    };
  });
}
