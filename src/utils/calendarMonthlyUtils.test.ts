import { describe, expect, it } from "vitest";

import {
  getLocalDateKey,
  getMonthlyWeekdayGrid,
  parseLocalDateKey,
} from "./calendarMonthlyUtils";

describe("calendarMonthlyUtils", () => {
  it("parses valid local date keys", () => {
    const parsed = parseLocalDateKey("2026-03-30");

    expect(parsed).not.toBeNull();
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(2);
    expect(parsed?.getDate()).toBe(30);
  });

  it("rejects invalid local date keys", () => {
    expect(parseLocalDateKey("2026-13-01")).toBeNull();
    expect(parseLocalDateKey("2026-02-30")).toBeNull();
    expect(parseLocalDateKey("2026/03/30")).toBeNull();
  });

  it("formats local date keys as yyyy-mm-dd", () => {
    const date = new Date(2026, 0, 2);
    expect(getLocalDateKey(date)).toBe("2026-01-02");
  });

  it("builds a monday-first, six-row, weekday-only grid for March 2026", () => {
    const grid = getMonthlyWeekdayGrid(new Date(2026, 2, 30));

    expect(grid).toHaveLength(6);
    expect(grid.every((week) => week.length === 5)).toBe(true);

    expect(grid[0][0].dateKey).toBe("2026-02-23");
    expect(grid[0][4].dateKey).toBe("2026-02-27");

    expect(grid[1][0].dateKey).toBe("2026-03-02");
    expect(grid[1][4].dateKey).toBe("2026-03-06");

    expect(grid[5][0].dateKey).toBe("2026-03-30");
    expect(grid[5][1].dateKey).toBe("2026-03-31");
    expect(grid[5][2].dateKey).toBe("2026-04-01");
    expect(grid[5][3].dateKey).toBe("2026-04-02");
    expect(grid[5][4].dateKey).toBe("2026-04-03");

    expect(grid[5][2].isCurrentMonth).toBe(false);
    expect(grid[5][3].isCurrentMonth).toBe(false);
    expect(grid[5][4].isCurrentMonth).toBe(false);
  });

  it("correctly handles January 2026 leading spillover days", () => {
    const grid = getMonthlyWeekdayGrid(new Date(2026, 0, 15));

    expect(grid[0][0].dateKey).toBe("2025-12-29");
    expect(grid[0][1].dateKey).toBe("2025-12-30");
    expect(grid[0][2].dateKey).toBe("2025-12-31");
    expect(grid[0][3].dateKey).toBe("2026-01-01");
    expect(grid[0][4].dateKey).toBe("2026-01-02");

    expect(grid[0][0].isCurrentMonth).toBe(false);
    expect(grid[0][1].isCurrentMonth).toBe(false);
    expect(grid[0][2].isCurrentMonth).toBe(false);
    expect(grid[0][3].isCurrentMonth).toBe(true);
    expect(grid[0][4].isCurrentMonth).toBe(true);
  });

  it("handles leap-year February", () => {
    const grid = getMonthlyWeekdayGrid(new Date(2028, 1, 20));

    const allKeys = grid.flat().map((cell) => cell.dateKey);
    expect(allKeys).toContain("2028-02-29");
  });
});
