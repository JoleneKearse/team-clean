import { describe, expect, it } from "vitest";

import { CALL_IN_CLEANERS, JOBS, STAFF_CLEANERS } from "../constants/consts";
import {
  enforceNecessaryJobsBeforeFlo,
  generateWeeklyAssignments,
} from "./scheduleUtils";

function rotateDownByOne<T>(values: readonly T[]): T[] {
  if (values.length === 0) return [];
  return [values[values.length - 1], ...values.slice(0, -1)];
}

describe("scheduleUtils rotation", () => {
  it("shifts only once to the next working day across consecutive holidays", () => {
    const previousWeek = generateWeeklyAssignments(
      STAFF_CLEANERS,
      new Date(2026, 3, 2),
      JOBS.length,
      undefined,
      JOBS,
      CALL_IN_CLEANERS,
    );

    const nextWeek = generateWeeklyAssignments(
      STAFF_CLEANERS,
      new Date(2026, 3, 7),
      JOBS.length,
      undefined,
      JOBS,
      CALL_IN_CLEANERS,
    );

    const emptyDay = Array.from({ length: JOBS.length }, () => "");
    expect(previousWeek.fri).toEqual(emptyDay);
    expect(nextWeek.mon).toEqual(emptyDay);

    // Tue Apr 7 should be one step after Thu Apr 2 (the previous working day).
    expect(nextWeek.tue).toEqual(rotateDownByOne(previousWeek.thu));

    const asByJob = Object.fromEntries(
      JOBS.map((jobId, index) => [jobId, nextWeek.tue[index]]),
    );

    expect(asByJob.Bath).toBe("AN");
    expect(asByJob.Flo1).toBe("RB");
    expect(asByJob.SW).toBe("D");
    expect(asByJob.Flo2).toBe("SN");
    expect(asByJob.Vac).toBe("TW");
    expect(asByJob.San).toBe("PW");
  });
});

// JOBS = ["Bath", "Flo1", "SW", "Flo2", "Vac", "San", "Flo3", "Gar"]
// Indices:          0      1     2      3     4     5      6     7

describe("enforceNecessaryJobsBeforeFlo float fallback", () => {
  // Build a baseline assignment array where all 8 jobs are staffed.
  // Slots: Bath=PW, Flo1=JA, SW=BM, Flo2=AN, Vac=RB, San=D, Flo3=JK, Gar=TW
  const BASE = ["PW", "JA", "BM", "AN", "RB", "D", "JK", "TW"];

  function withEmpty(slots: number[]): string[] {
    return BASE.map((initials, i) => (slots.includes(i) ? "" : initials));
  }

  function resultByJob(assignments: string[]): Record<string, string> {
    return Object.fromEntries(
      JOBS.map((jobId, i) => [jobId, assignments[i] ?? ""]),
    );
  }

  it("Flo3 out: no float movement because no higher float can fill a lower gap", () => {
    // Flo3 is absent; Flo1 and Flo2 should stay where they are.
    const input = withEmpty([6]); // Flo3 empty
    const result = resultByJob(
      enforceNecessaryJobsBeforeFlo({ assignments: input, jobs: JOBS }),
    );

    expect(result.Flo1).toBe("JA");
    expect(result.Flo2).toBe("AN");
    expect(result.Flo3).toBe("");
  });

  it("Flo2 out: Flo3 steps down to Flo2, Flo1 stays, Flo3 slot becomes empty", () => {
    // Architecture rule: if the call-off is Flo2, Flo3 becomes Flo2.
    const input = withEmpty([3]); // Flo2 empty
    const result = resultByJob(
      enforceNecessaryJobsBeforeFlo({ assignments: input, jobs: JOBS }),
    );

    expect(result.Flo1).toBe("JA"); // Flo1 unchanged
    expect(result.Flo2).toBe("JK"); // JK was Flo3; now fills Flo2
    expect(result.Flo3).toBe(""); // Flo3 vacated
  });

  it("Flo1 out: Flo3 steps down to Flo1, Flo2 stays, Flo3 slot becomes empty", () => {
    // Architecture rule: if the call-off is Flo1, Flo3 becomes Flo1.
    const input = withEmpty([1]); // Flo1 empty
    const result = resultByJob(
      enforceNecessaryJobsBeforeFlo({ assignments: input, jobs: JOBS }),
    );

    expect(result.Flo1).toBe("JK"); // JK was Flo3; now fills Flo1
    expect(result.Flo2).toBe("AN"); // Flo2 unchanged — Flo2 must NOT step up
    expect(result.Flo3).toBe(""); // Flo3 vacated
  });

  it("Flo1 and Flo2 both out: Flo3 fills Flo1 only, Flo2 remains empty", () => {
    // Only one higher float (Flo3) available, so only the lowest empty slot (Flo1) gets filled.
    const input = withEmpty([1, 3]); // Flo1 and Flo2 empty
    const result = resultByJob(
      enforceNecessaryJobsBeforeFlo({ assignments: input, jobs: JOBS }),
    );

    expect(result.Flo1).toBe("JK"); // JK was Flo3; fills Flo1 (lowest gap)
    expect(result.Flo2).toBe(""); // No higher float left to fill Flo2
    expect(result.Flo3).toBe(""); // Flo3 vacated
  });

  it("necessary job out: Flo3 fills the necessary job, leaving float slots as-is", () => {
    // Bath is a necessary job. On call-off, Flo3 (highest priority donor) fills it.
    // Flo1 and Flo2 are untouched because the float compaction only runs after
    // necessary-job backfill, and no float slot is empty at that point.
    const input = withEmpty([0]); // Bath empty
    const result = resultByJob(
      enforceNecessaryJobsBeforeFlo({ assignments: input, jobs: JOBS }),
    );

    expect(result.Bath).toBe("JK"); // JK (Flo3) fills Bath
    expect(result.Flo1).toBe("JA"); // Flo1 unchanged
    expect(result.Flo2).toBe("AN"); // Flo2 unchanged
    expect(result.Flo3).toBe(""); // Flo3 vacated
  });
});

describe("generateWeeklyAssignments low staffing Vac/Gar handling", () => {
  it("clears Vac first when only 4 people are in", () => {
    const weekly = generateWeeklyAssignments(
      STAFF_CLEANERS,
      new Date(2026, 1, 23),
      JOBS.length,
      {
        // Keep the four largest/necessary roles present and force Vac to be skipped.
        mon: ["PW", "BM", "D", "TW"],
      },
      JOBS,
      CALL_IN_CLEANERS,
    );

    const vacIndex = JOBS.indexOf("Vac");
    const garIndex = JOBS.indexOf("Gar");

    expect(vacIndex).toBeGreaterThanOrEqual(0);
    expect(garIndex).toBeGreaterThanOrEqual(0);
    expect(weekly.mon[vacIndex]).toBe("");
    expect(weekly.mon[garIndex]).not.toBe("");
  });

  it("clears both Vac and Gar when only 3 people are in", () => {
    const weekly = generateWeeklyAssignments(
      STAFF_CLEANERS,
      new Date(2026, 3, 14),
      JOBS.length,
      {
        mon: ["PW", "JA", "BM"],
      },
      JOBS,
      CALL_IN_CLEANERS,
    );

    const vacIndex = JOBS.indexOf("Vac");
    const garIndex = JOBS.indexOf("Gar");

    expect(vacIndex).toBeGreaterThanOrEqual(0);
    expect(garIndex).toBeGreaterThanOrEqual(0);
    expect(weekly.mon[vacIndex]).toBe("");
    expect(weekly.mon[garIndex]).toBe("");
  });

  it("keeps Vac and Gar assignable when 5 people are in", () => {
    const weekly = generateWeeklyAssignments(
      STAFF_CLEANERS,
      new Date(2026, 3, 14),
      JOBS.length,
      {
        mon: ["PW", "JA", "BM", "AN", "RB"],
      },
      JOBS,
      CALL_IN_CLEANERS,
    );

    const vacIndex = JOBS.indexOf("Vac");
    const garIndex = JOBS.indexOf("Gar");

    expect(vacIndex).toBeGreaterThanOrEqual(0);
    expect(garIndex).toBeGreaterThanOrEqual(0);
    expect(weekly.mon[vacIndex]).not.toBe("");
    expect(weekly.mon[garIndex]).not.toBe("");
  });
});

describe("generateWeeklyAssignments call-in replacement order", () => {
  it("fills the missing cleaner's job with call-in before float fallback", () => {
    const weekly = generateWeeklyAssignments(
      STAFF_CLEANERS,
      new Date(2026, 2, 4),
      JOBS.length,
      {
        // PW and D are out; JK is the call-in.
        // Wednesday base assignments for this week are:
        // Vac=D, San=SN, Flo3=TW, Gar=PW
        wed: STAFF_CLEANERS.filter(
          (cleaner) => cleaner !== "PW" && cleaner !== "D",
        ).concat("JK"),
      },
      JOBS,
      CALL_IN_CLEANERS,
    );

    const vacIndex = JOBS.indexOf("Vac");
    const garIndex = JOBS.indexOf("Gar");
    const flo3Index = JOBS.indexOf("Flo3");

    expect(weekly.wed[garIndex]).toBe("JK");
    expect(weekly.wed[vacIndex]).toBe("TW");
    expect(weekly.wed[flo3Index]).toBe("");
  });
});
