import type { DayKey, JobId } from "../types/types";

function rotate<T>(arr: T[], shiftDown: number): T[] {
  const len = arr.length;
  if (len === 0) return arr;

  // normalize shiftDown to be within the bounds of the array length
  const size = ((shiftDown % len) + len) % len;
  // shiftDown=1: [a,b,c,d] -> [d,a,b,c]
  return arr.slice(len - size).concat(arr.slice(0, len - size));
}

/**
 * Returns an object where each day is an array of initials in job-row order.
 * Example: result.mon[0] is Monday's person for the first job row ("Bath"),
 * result.mon[1] for "Flo1", etc.
 */
export function generateWeeklyAssignments(cleaners: string[]) {
  const base = cleaners;

  const weekly: Record<DayKey, string[]> = {
    mon: rotate(base, 0),
    tue: rotate(base, 1),
    wed: rotate(base, 2),
    thu: rotate(base, 3),
    fri: rotate(base, 4),
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
            initials: idx >= 0 ? dayAssignments[idx] ?? "" : "",
            missing: idx < 0 ,
        }
    })
}
