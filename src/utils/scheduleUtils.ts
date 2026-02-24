import type { DayKey, JobId } from "../types/types";

function rotate<T>(arr: readonly T[], shiftDown: number): T[] {
  const len = arr.length;
  if (len === 0) return [];

  // normalize shiftDown to be within the bounds of the array length
  const size = ((shiftDown % len) + len) % len;
  // shiftDown=1: [a,b,c,d] -> [d,a,b,c]
  return arr.slice(len - size).concat(arr.slice(0, len - size));
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ROTATION_BASE_WEEK_NUMBER = 9;

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

function getCalendarWeekNumber(referenceDate: Date): number {
  const date = new Date(referenceDate);
  date.setHours(0, 0, 0, 0);

  const startOfYear = new Date(date.getFullYear(), 0, 1);
  startOfYear.setHours(0, 0, 0, 0);

  const dayOfYear =
    Math.floor((date.getTime() - startOfYear.getTime()) / MS_PER_DAY) + 1;
  const firstDayOfYear = startOfYear.getDay();

  return Math.ceil((dayOfYear + firstDayOfYear) / 7);
}

/**
 * Returns an object where each day is an array of initials in job-row order.
 */
export function generateWeeklyAssignments(
  cleaners: readonly string[],
  referenceDate: Date = new Date(),
) {
  const base = cleaners;
  const weekNumber = getCalendarWeekNumber(referenceDate);
  const weekOffset = weekNumber - ROTATION_BASE_WEEK_NUMBER;

  const weekly: Record<DayKey, string[]> = {
    mon: rotate(base, weekOffset + 0),
    tue: rotate(base, weekOffset + 1),
    wed: rotate(base, weekOffset + 2),
    thu: rotate(base, weekOffset + 3),
    fri: rotate(base, weekOffset + 4),
  };

  return weekly;
}

type WeeklyAssignments = Record<DayKey, string[]>;

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
