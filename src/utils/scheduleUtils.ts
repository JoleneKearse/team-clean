import type { DayKey, JobId } from "../types/types";
import { ANCHOR_MONDAY, isNecessaryJob } from "../constants/consts";

function rotate<T>(arr: readonly T[], shiftDown: number): T[] {
  const len = arr.length;
  if (len === 0) return [];

  // normalize shiftDown to be within the bounds of the array length
  const size = ((shiftDown % len) + len) % len;
  // shiftDown=1: [a,b,c,d] -> [d,a,b,c]
  return arr.slice(len - size).concat(arr.slice(0, len - size));
}

const BACKFILL_PRIORITY: readonly JobId[] = ["Flo3", "Flo2", "Flo1"];

function normalizePeopleIn(peopleIn: number): number {
  return Math.max(0, Math.min(8, peopleIn));
}

export function getDaycareJobLabel(jobId: JobId, peopleIn: number): string {
  const staffing = normalizePeopleIn(peopleIn);

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

function getDaycareAreasForJob(jobId: JobId, peopleIn: number): string[] {
  const staffing = normalizePeopleIn(peopleIn);

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

export function getRequiredDaycareAreas(peopleIn: number): string[] {
  void peopleIn;
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

export function getMissingDayCareAreasForDay(params: {
  day: DayKey;
  jobs: readonly JobId[];
  weeklyAssignments: WeeklyAssignments;
  peopleIn: number;
}) {
  const { day, jobs, weeklyAssignments, peopleIn } = params;
  const dayAssignments = weeklyAssignments[day];
  const coveredAreas = new Set<string>();

  jobs.forEach((jobId, index) => {
    const initials = dayAssignments[index] ?? "";
    if (!initials) return;

    getDaycareAreasForJob(jobId, peopleIn).forEach((area) => {
      coveredAreas.add(area);
    });
  });

  return getRequiredDaycareAreas(peopleIn).filter(
    (area) => !coveredAreas.has(area),
  );
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
      if (isWorkday(cursor)) count += 1;
      cursor.setDate(cursor.getDate() + 1);
    }

    return count;
  }

  const cursor = new Date(end);
  let count = 0;

  while (cursor < start) {
    if (isWorkday(cursor)) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }

  return -count;
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

  const rebalanceForPresence = (day: DayKey, dayAssignments: string[]) => {
    const presentForDay = presentCleanersByDay?.[day] ?? cleaners;
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

    const lockedIndexes = new Set<number>();

    const findDonorIndex = (targetIndex: number) => {
      for (const jobId of BACKFILL_PRIORITY) {
        const index = jobs.indexOf(jobId);
        if (index < 0) continue;
        if (index === targetIndex) continue;
        if (lockedIndexes.has(index)) continue;
        if (!nextAssignments[index]) continue;

        return index;
      }

      return -1;
    };

    const moveFromFloatDonor = (targetIndexes: number[]) => {
      targetIndexes.forEach((targetIndex) => {
        if (nextAssignments[targetIndex]) return;

        const donorIndex = findDonorIndex(targetIndex);
        if (donorIndex < 0) return;

        nextAssignments[targetIndex] = nextAssignments[donorIndex];
        nextAssignments[donorIndex] = "";
        lockedIndexes.add(targetIndex);
      });
    };

    const floatBackfillTargetIndexes = (["Flo1", "Flo2"] as const)
      .map((jobId) => jobs.indexOf(jobId))
      .filter((index) => index >= 0 && !nextAssignments[index]);

    moveFromFloatDonor(floatBackfillTargetIndexes);

    const necessaryBackfillTargetIndexes = jobs
      .map((jobId, index) => ({ jobId, index }))
      .filter(
        ({ jobId, index }) => isNecessaryJob(jobId) && !nextAssignments[index],
      )
      .map(({ index }) => index);

    moveFromFloatDonor(necessaryBackfillTargetIndexes);

    return nextAssignments;
  };

  const weekly: Record<DayKey, string[]> = {
    mon: rebalanceForPresence("mon", rotate(base, weekOffset + 0)),
    tue: rebalanceForPresence("tue", rotate(base, weekOffset + 1)),
    wed: rebalanceForPresence("wed", rotate(base, weekOffset + 2)),
    thu: rebalanceForPresence("thu", rotate(base, weekOffset + 3)),
    fri: rebalanceForPresence("fri", rotate(base, weekOffset + 4)),
  };

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
}) {
  const { day, jobs, weeklyAssignments, peopleIn } = params;
  const dayAssignments = weeklyAssignments[day];

  return jobs.map((jobId, index) => ({
    job: jobId,
    initials: dayAssignments[index] ?? "",
    label: getDaycareJobLabel(jobId, peopleIn),
    missing: !dayAssignments[index],
  }));
}
