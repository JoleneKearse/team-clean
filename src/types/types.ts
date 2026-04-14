import {
  BUILDINGS,
  CLEANERS,
  CLOSURE_OPTIONS,
  DAYS,
  JOBS,
} from "../constants/consts";

export type DayKey = (typeof DAYS)[number]["key"];
export type JobId = (typeof JOBS)[number];
export type BuildingKey = (typeof BUILDINGS)[number]["key"];
export type CleanerId = (typeof CLEANERS)[number];
export type ClosureId = (typeof CLOSURE_OPTIONS)[number]["id"];

export const SHIFT_EVENT_ACTIONS = ["in", "out"] as const;
export type ShiftEventAction = (typeof SHIFT_EVENT_ACTIONS)[number];

export const SHIFT_EVENT_TIMING_KINDS = [
  "atTime",
  "sometime",
  "forDaycare",
  "afterLunch",
] as const;
export type ShiftEventTimingKind = (typeof SHIFT_EVENT_TIMING_KINDS)[number];

export const SHIFT_EVENT_TIME_QUALIFIERS = ["exact", "around", "ish"] as const;
export type ShiftEventTimeQualifier =
  (typeof SHIFT_EVENT_TIME_QUALIFIERS)[number];

export type ShiftEvent = {
  id: string;
  cleanerId: CleanerId;
  action: ShiftEventAction;
  timingKind: ShiftEventTimingKind;
  time?: string;
  timeQualifier?: ShiftEventTimeQualifier;
  note?: string;
};

export type ShiftEventsByDay = Record<DayKey, ShiftEvent[]>;

export const EDITABLE_SECTION_IDS = [
  "seniors",
  "grade1",
  "grade2",
  "education",
  "fieldhouse",
  "social",
  "annex",
  "buildings",
  "daycare",
  "bandOffice",
  "healthCenter",
] as const;
export type EditableSectionId = (typeof EDITABLE_SECTION_IDS)[number];
