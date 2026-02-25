export const DAYS = [
  { key: "mon", label: "M" },
  { key: "tue", label: "T" },
  { key: "wed", label: "W" },
  { key: "thu", label: "T" },
  { key: "fri", label: "F" },
] as const;

export const JOBS = [
  "Bath",
  "Flo1",
  "SW",
  "Flo2",
  "Vac",
  "San",
  "Flo3",
  "Gar",
] as const;

export const STAFF_CLEANERS = [
  "PW",
  "JA",
  "BM",
  "SN",
  "AP",
  "D",
  "JK",
  "TW",
] as const;

export const CALL_IN_CLEANERS = ["EB", "KK", "MB", "new"] as const;

export const CLEANERS = [...STAFF_CLEANERS, ...CALL_IN_CLEANERS] as const;

export const BUILDINGS = [
  {
    key: "seniors_fieldhouse_education",
    label: "Seniors / Fieldhouse / Education",
    jobIds: ["SW", "San", "Flo3"],
  },
  {
    key: "grade2_social",
    label: "Grade 2 / Social",
    jobIds: ["Vac", "Gar", "Flo1"],
  },
  { key: "grade1_annex", label: "Grade 1 / Annex", jobIds: ["Bath", "Flo2"] },
] as const;

export const ANCHOR_MONDAY = "2026-02-23" as const;
