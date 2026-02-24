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
const NECESSARY_JOBS: readonly JobId[] = ["Bath", "SW", "Vac", "San", "Gar"];
const BACKFILL_PRIORITY: readonly JobId[] = ["Flo3", "Flo2", "Flo1"];
const FLOAT_JOBS: readonly JobId[] = ["Flo1", "Flo2", "Flo3"];

function normalizePeopleIn(peopleIn: number): 6 | 7 | 8 {
  if (peopleIn <= 6) return 6;
  if (peopleIn >= 8) return 8;
  return 7;
}

export function getDaycareJobLabel(jobId: JobId, peopleIn: number): string {
  const staffing = normalizePeopleIn(peopleIn);

  if (jobId === "Bath") {
    return "Bathrooms";
  }

  if (staffing > 8 && jobId === "Vac") {
    return "P1 including lockers";
  }
  if (staffing > 8 && jobId === "SW") {
    return "P2 including lockers";
  }
  if (staffing > 8 && jobId === "San") {
    return "Kindergarten including lockers";
  }
  if (staffing === 8 && jobId === "Vac") {
    return "P1";
  }
  if (staffing === 8 && jobId === "SW") {
    return "P2";
  }
  if (staffing === 8 && jobId === "San") {
    return "Kindergarten";
  }
  
  if (staffing === 6 && jobId === "Gar") {
    return "All outside";
  }
  if (staffing >= 7 && jobId === "Gar") {
    return "Fill & front outside";
  }

  if (staffing === 7) {
    if (jobId === "Flo1") return "Baby & Toddler Rooms";
    if (jobId === "Flo2") return "Back Outside";
  }

  if (staffing === 8) {
    if (jobId === "Flo1") return "Baby Room + Kindergarten Lockers";
    if (jobId === "Flo2") return "Toddler Room + P2 Lockers";
    if (jobId === "Flo3") return "Back Outside + P1 Lockers";
  }

  return jobId;
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
  slotCount: number = 8,
  presentCleanersByDay?: Partial<Record<DayKey, readonly string[]>>,
  jobs: readonly JobId[] = ["Bath", "Flo1", "SW", "Flo2", "Vac", "San", "Flo3", "Gar"],
) {
  const totalSlots = Math.max(0, slotCount);
  const base =
    cleaners.length === 0
      ? Array.from({ length: totalSlots }, () => "")
      : Array.from(
          { length: totalSlots },
          (_, index) => cleaners[index % cleaners.length],
        );

  const weekNumber = getCalendarWeekNumber(referenceDate);
  const weekOffset = weekNumber - ROTATION_BASE_WEEK_NUMBER;

  const rebalanceForPresence = (day: DayKey, dayAssignments: string[]) => {
    const presentForDay = presentCleanersByDay?.[day] ?? cleaners;
    const presentSet = new Set(presentForDay);
    const nextAssignments = [...dayAssignments];

    for (let index = 0; index < jobs.length; index += 1) {
      const initials = nextAssignments[index] ?? "";
      if (initials && !presentSet.has(initials)) {
        nextAssignments[index] = "";
      }
    }

    const missingNecessaryIndexes = jobs
      .map((jobId, index) => ({ jobId, index }))
      .filter(({ jobId, index }) => NECESSARY_JOBS.includes(jobId) && !nextAssignments[index]);

    const donorIndexes = BACKFILL_PRIORITY.flatMap((jobId) => {
      const index = jobs.indexOf(jobId);
      if (index < 0) return [];
      return nextAssignments[index] ? [index] : [];
    });

    const unfilledNecessaryIndexes = missingNecessaryIndexes.map(
      ({ index }) => index,
    );

    donorIndexes.forEach((donorIndex) => {
      if (unfilledNecessaryIndexes.length === 0) return;

      const targetIndex = unfilledNecessaryIndexes.reduce((best, candidate) => {
        const bestDistance = Math.abs(best - donorIndex);
        const candidateDistance = Math.abs(candidate - donorIndex);

        if (candidateDistance < bestDistance) return candidate;
        if (candidateDistance > bestDistance) return best;

        return candidate < best ? candidate : best;
      }, unfilledNecessaryIndexes[0]);

      nextAssignments[targetIndex] = nextAssignments[donorIndex];
      nextAssignments[donorIndex] = "";

      const filledIndex = unfilledNecessaryIndexes.indexOf(targetIndex);
      unfilledNecessaryIndexes.splice(filledIndex, 1);
    });

    const allNecessaryCovered = jobs
      .map((jobId, index) => ({ jobId, index }))
      .filter(({ jobId }) => NECESSARY_JOBS.includes(jobId))
      .every(({ index }) => Boolean(nextAssignments[index]));

    if (allNecessaryCovered) {
      const floatIndexes = FLOAT_JOBS.map((jobId) => jobs.indexOf(jobId)).filter(
        (index) => index >= 0,
      );

      const presentFloatAssignments = floatIndexes
        .map((index) => nextAssignments[index])
        .filter((initials): initials is string => Boolean(initials));

      floatIndexes.forEach((index, order) => {
        nextAssignments[index] = presentFloatAssignments[order] ?? "";
      });
    }

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
