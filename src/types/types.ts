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
export const EDITABLE_SECTION_IDS = [
  "seniors",
  "grade1",
  "grade2",
  "education",
  "fieldhouse",
  "social",
  "annex",
  "dropIn",
  "buildings",
  "daycare",
  "bandOffice",
  "healthCenter",
] as const;
export type EditableSectionId = (typeof EDITABLE_SECTION_IDS)[number];
