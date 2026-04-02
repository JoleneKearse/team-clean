import { describe, expect, it } from "vitest";

import { CALL_IN_CLEANERS, JOBS, STAFF_CLEANERS } from "../constants/consts";
import { generateWeeklyAssignments } from "./scheduleUtils";

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

    expect(asByJob.Flo1).toBe("AP");
    expect(asByJob.SW).toBe("D");
    expect(asByJob.Flo2).toBe("JK");
    expect(asByJob.Vac).toBe("TW");
    expect(asByJob.San).toBe("PW");
  });
});
