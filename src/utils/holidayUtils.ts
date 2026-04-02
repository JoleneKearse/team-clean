import type { DayKey } from "../types/types";
import Holidays from "date-holidays";

const ONTARIO_COUNTRY_CODE = "CA";
const ONTARIO_PROVINCE_CODE = "ON";
const FALLBACK_PUBLIC_HOLIDAY_ICON = "📅";
const WEEK_DAY_KEYS: readonly DayKey[] = ["mon", "tue", "wed", "thu", "fri"];
// Hard-coded reduced-schedule dates for March Break.
// Use local date keys in YYYY-MM-DD format (example for next year: 2027-03-16).
// Keep Monday out of this list when it should run the normal schedule.
const MARCH_BREAK_REDUCED_SCHEDULE_DATE_KEYS = new Set<string>([
  // Monday of March Break is still cleaned as normal; reduced schedule starts Tuesday.
  "2026-03-17",
  "2026-03-18",
  "2026-03-19",
  "2026-03-20",
]);

const ONTARIO_PUBLIC_HOLIDAY_ICONS: Readonly<Record<string, string>> = {
  "New Year's Day": "🎉",
  "Family Day": "👨‍👩‍👧‍👦",
  "Good Friday": "✝️",
  "Easter Sunday": "🐣",
  "Easter Monday": "🐰",
  "Victoria Day": "👑",
  "Canada Day": "🍁",
  "Civic Holiday": "🏛",
  "Labour Day": "🛠️",
  "National Day for Truth and Reconciliation": "🧡",
  Thanksgiving: "🦃",
  "Remembrance Day": "🌺",
  "Christmas Day": "🎄",
  "Boxing Day": "🥊",
};

const ontarioHolidayCalendar = new Holidays(
  ONTARIO_COUNTRY_CODE,
  ONTARIO_PROVINCE_CODE,
);

const publicHolidayByDateByYearCache = new Map<
  number,
  Record<string, OntarioPublicHoliday>
>();

type HolidayRecord = ReturnType<Holidays["getHolidays"]>[number];

export type OntarioHoliday = {
  date: HolidayRecord["date"];
  name: HolidayRecord["name"];
  type: HolidayRecord["type"];
};

export type OntarioPublicHoliday = OntarioHoliday & {
  dateKey: string;
  icon: string;
};

function normalizeHolidayName(name: string): string {
  return name.replace(/[’]/g, "'").trim();
}

function getLocalDateKey(referenceDate: Date): string {
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, "0");
  const day = String(referenceDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isPublicHolidayType(type: HolidayRecord["type"]): boolean {
  if (Array.isArray(type)) {
    return type.includes("public");
  }

  return type === "public";
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

function getWeekReferenceDate(referenceDate: Date): Date {
  const date = new Date(referenceDate);
  date.setHours(0, 0, 0, 0);

  // On weekends, preview the upcoming work week to match assignment generation.
  while (!isWorkday(date)) {
    date.setDate(date.getDate() + 1);
  }

  return date;
}

function getOntarioPublicHolidayIndexForYear(
  year: number,
): Record<string, OntarioPublicHoliday> {
  const cached = publicHolidayByDateByYearCache.get(year);
  if (cached) {
    return cached;
  }

  const next: Record<string, OntarioPublicHoliday> = {};

  getOntarioHolidaysForYear(year).forEach((holiday) => {
    if (!isPublicHolidayType(holiday.type)) {
      return;
    }

    const dateKey = holiday.date.slice(0, 10);
    if (next[dateKey]) {
      return;
    }

    const normalizedName = normalizeHolidayName(holiday.name);

    next[dateKey] = {
      ...holiday,
      dateKey,
      icon:
        ONTARIO_PUBLIC_HOLIDAY_ICONS[normalizedName] ??
        FALLBACK_PUBLIC_HOLIDAY_ICON,
    };
  });

  publicHolidayByDateByYearCache.set(year, next);
  return next;
}

export function getOntarioHolidaysForYear(year: number): OntarioHoliday[] {
  return ontarioHolidayCalendar.getHolidays(year).map((holiday) => ({
    date: holiday.date,
    name: holiday.name,
    type: holiday.type,
  }));
}

export function getOntarioPublicHolidaysForYear(
  year: number,
): OntarioPublicHoliday[] {
  return Object.values(getOntarioPublicHolidayIndexForYear(year)).sort((a, b) =>
    a.dateKey.localeCompare(b.dateKey),
  );
}

export function getOntarioPublicHolidayOnDate(
  referenceDate: Date,
): OntarioPublicHoliday | null {
  const dateKey = getLocalDateKey(referenceDate);
  const byDate = getOntarioPublicHolidayIndexForYear(
    referenceDate.getFullYear(),
  );

  return byDate[dateKey] ?? null;
}

export function getOntarioPublicHolidaysByDayForWeek(
  referenceDate: Date,
): Partial<Record<DayKey, OntarioPublicHoliday>> {
  const weekReferenceDate = getWeekReferenceDate(referenceDate);
  const weekStart = getStartOfWeekMonday(weekReferenceDate);

  return WEEK_DAY_KEYS.reduce<Partial<Record<DayKey, OntarioPublicHoliday>>>(
    (holidaysByDay, dayKey, dayOffset) => {
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + dayOffset);

      const holiday = getOntarioPublicHolidayOnDate(dayDate);
      if (!holiday) {
        return holidaysByDay;
      }

      holidaysByDay[dayKey] = holiday;
      return holidaysByDay;
    },
    {},
  );
}

export function isMarchBreakReducedScheduleOnDate(
  referenceDate: Date,
): boolean {
  return MARCH_BREAK_REDUCED_SCHEDULE_DATE_KEYS.has(
    getLocalDateKey(referenceDate),
  );
}

// ---------------------------------------------------------------------------
// Extra team holidays (non-statutory days off granted by the team).
// Add one entry per extra day off using YYYY-MM-DD local date keys.
// Update each year as needed.
// ---------------------------------------------------------------------------

export type ExtraHoliday = {
  dateKey: string;
  name: string;
  icon: string;
};

const EXTRA_HOLIDAYS: readonly ExtraHoliday[] = [
  { dateKey: "2026-04-06", name: "Easter Monday", icon: "🐰" },
];

const extraHolidayByDateKey: Readonly<Record<string, ExtraHoliday>> =
  Object.fromEntries(EXTRA_HOLIDAYS.map((h) => [h.dateKey, h]));

export function getExtraHolidayOnDate(
  referenceDate: Date,
): ExtraHoliday | null {
  const dateKey = getLocalDateKey(referenceDate);
  return extraHolidayByDateKey[dateKey] ?? null;
}

export function getExtraHolidaysByDayForWeek(
  referenceDate: Date,
): Partial<Record<DayKey, ExtraHoliday>> {
  const weekReferenceDate = getWeekReferenceDate(referenceDate);
  const weekStart = getStartOfWeekMonday(weekReferenceDate);

  return WEEK_DAY_KEYS.reduce<Partial<Record<DayKey, ExtraHoliday>>>(
    (extraHolidaysByDay, dayKey, dayOffset) => {
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + dayOffset);

      const holiday = getExtraHolidayOnDate(dayDate);
      if (!holiday) {
        return extraHolidaysByDay;
      }

      extraHolidaysByDay[dayKey] = holiday;
      return extraHolidaysByDay;
    },
    {},
  );
}

export function getMarchBreakReducedScheduleByDayForWeek(
  referenceDate: Date,
): Partial<Record<DayKey, true>> {
  const weekReferenceDate = getWeekReferenceDate(referenceDate);
  const weekStart = getStartOfWeekMonday(weekReferenceDate);

  return WEEK_DAY_KEYS.reduce<Partial<Record<DayKey, true>>>(
    (reducedScheduleByDay, dayKey, dayOffset) => {
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + dayOffset);

      if (!isMarchBreakReducedScheduleOnDate(dayDate)) {
        return reducedScheduleByDay;
      }

      reducedScheduleByDay[dayKey] = true;
      return reducedScheduleByDay;
    },
    {},
  );
}
