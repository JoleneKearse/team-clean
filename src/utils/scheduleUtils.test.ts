import { describe, expect, it } from "vitest";

import {
  CALL_IN_CLEANERS,
  CLEANER_ORDER,
  JOBS,
  STAFF_CLEANERS,
} from "../constants/consts";
import {
  enforceNecessaryJobsBeforeFlo,
  generateWeeklyAssignments,
  hasLegacyCleanerRotation,
  reconcilePresentCleanersForDay,
} from "./scheduleUtils";

function rotateDownByOne<T>(values: readonly T[]): T[] {
  if (values.length === 0) return [];
  return [values[values.length - 1], ...values.slice(0, -1)];
}

describe("reconcilePresentCleanersForDay", () => {
  it("keeps the daily roster aligned with planned absences", () => {
    expect(
      reconcilePresentCleanersForDay({
        nextCleaners: ["IB", "D", "JK", "TW"],
        weeklyLeaveCleaners: ["IB", "JA"],
        allCleaners: STAFF_CLEANERS,
      }),
    ).toEqual(["D"]);
  });

  it("does not re-add staff who are already out for the week", () => {
    expect(
      reconcilePresentCleanersForDay({
        nextCleaners: ["IB", "D", "JK"],
        weeklyLeaveCleaners: ["IB", "JA", "BM"],
        allCleaners: STAFF_CLEANERS,
      }),
    ).toEqual(["D"]);
  });
});

describe("scheduleUtils rotation", () => {
  it("detects stale rotated cleaner rosters from a previous hidden order", () => {
    expect(
      hasLegacyCleanerRotation(["HA", "D", "JK", "JA", "SW", "IB", "BM", "AN"]),
    ).toBe(true);
    expect(hasLegacyCleanerRotation(CLEANER_ORDER)).toBe(false);
  });

  it("uses CLEANER_ORDER as the explicit assignment sequence for the current Monday", () => {
    const weekly = generateWeeklyAssignments(
      CLEANER_ORDER,
      new Date(2026, 10, 2),
      JOBS.length,
      undefined,
      JOBS,
      CALL_IN_CLEANERS,
    );

    expect(weekly.mon).toEqual(CLEANER_ORDER);
    expect(weekly.tue).toEqual(rotateDownByOne(CLEANER_ORDER));
  });

  it("continues the rotation from Monday Nov 2 across the rest of the week", () => {
    const weekly = generateWeeklyAssignments(
      CLEANER_ORDER,
      new Date(2026, 10, 2),
      JOBS.length,
      undefined,
      JOBS,
      CALL_IN_CLEANERS,
    );

    const asByJob = Object.fromEntries(
      JOBS.map((jobId, index) => [jobId, weekly.tue[index]]),
    );

    expect(asByJob.Bath).toBe("JA");
    expect(asByJob.Flo1).toBe("SW");
    expect(asByJob.SW).toBe("IB");
    expect(asByJob.Flo2).toBe("BM");
    expect(asByJob.Vac).toBe("AN");
    expect(asByJob.San).toBe("HA");
  });
});

// JOBS = ["Bath", "Flo1", "SW", "Flo2", "Vac", "San", "Flo3", "Gar"]
// Indices:          0      1     2      3     4     5      6     7

describe("enforceNecessaryJobsBeforeFlo float fallback", () => {
  // Build a baseline assignment array where all 8 jobs are staffed.
  // Slots: Bath=ZZ, Flo1=JA, SW=BM, Flo2=AN, Vac=RB, San=D, Gar=TW, Flo3=JK
  const BASE = ["ZZ", "JA", "BM", "AN", "RB", "D", "TW", "JK"];

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
    expect(result.Gar).toBe("TW"); // Gar is the donor that remains fixed before Flo3
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
    expect(result.Gar).toBe("TW"); // Gar remains in place above Flo3
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
    expect(result.Gar).toBe("TW"); // Gar still occupies the higher necessary slot before Flo3
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
    expect(result.Gar).toBe("TW"); // Gar remains in the necessary-job row ahead of Flo3
    expect(result.Flo3).toBe(""); // Flo3 vacated
  });
});

describe("generateWeeklyAssignments low staffing Vac/Gar handling", () => {
  it("clears Vac first when only 4 people are in", () => {
    const weekly = generateWeeklyAssignments(
      CLEANER_ORDER,
      new Date(2026, 1, 23),
      JOBS.length,
      {
        mon: ["SW", "BM", "D", "JA"],
      },
      JOBS,
      CALL_IN_CLEANERS,
    );

    const vacIndex = JOBS.indexOf("Vac");

    expect(vacIndex).toBeGreaterThanOrEqual(0);
    expect(weekly.mon[vacIndex]).toBe("");
  });

  it("clears both Vac and Gar when only 3 people are in", () => {
    const weekly = generateWeeklyAssignments(
      CLEANER_ORDER,
      new Date(2026, 3, 14),
      JOBS.length,
      {
        mon: ["SW", "JA", "BM"],
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
      CLEANER_ORDER,
      new Date(2026, 3, 14),
      JOBS.length,
      {
        mon: ["SW", "JA", "BM", "AN", "RB"],
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
  const referenceWeek = generateWeeklyAssignments(
    CLEANER_ORDER,
    new Date(2026, 2, 4),
    JOBS.length,
    undefined,
    JOBS,
    CALL_IN_CLEANERS,
  );
  const presentWithAbsentCleaners = (...absentCleaners: string[]) => [
    "JK",
    ...CLEANER_ORDER.filter(
      (cleaner) =>
        cleaner !== "JK" && !absentCleaners.includes(cleaner),
    ),
  ];

  it("fills the missing cleaner's job with call-in before float fallback", () => {
    const weekly = generateWeeklyAssignments(
      CLEANER_ORDER,
      new Date(2026, 2, 4),
      JOBS.length,
      {
        wed: presentWithAbsentCleaners("D"),
      },
      JOBS,
      CALL_IN_CLEANERS,
    );

    const missingCleanerJobIndex = referenceWeek.wed.indexOf("D");
    expect(weekly.wed[missingCleanerJobIndex]).toBe("JK");
  });

  it("honors pinned call-in mapping when multiple staff are out", () => {
    const weekly = generateWeeklyAssignments(
      CLEANER_ORDER,
      new Date(2026, 2, 4),
      JOBS.length,
      {
        wed: presentWithAbsentCleaners("D", "AN"),
      },
      JOBS,
      CALL_IN_CLEANERS,
      {
        wed: {
          JK: "AN",
        },
      },
    );

    const mappedCleanerJobIndex = referenceWeek.wed.indexOf("AN");
    expect(weekly.wed[mappedCleanerJobIndex]).toBe("JK");
  });
});
