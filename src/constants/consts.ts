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

export const NECESSARY_JOBS = ["Bath", "SW", "Vac", "San", "Gar"] as const;

type NecessaryJobId = (typeof NECESSARY_JOBS)[number];

export const NECESSARY_JOB_STYLES = {
  Bath: {
    lineBgClass: "bg-orange-500/20",
    cellBgClass: "bg-orange-500/35",
    solidClass: "bg-orange-500 text-gray-900",
    badgeClass: "bg-orange-500 text-gray-900",
    textClass: "text-gray-900",
  },
  SW: {
    lineBgClass: "bg-yellow-500/20",
    cellBgClass: "bg-yellow-500/35",
    solidClass: "bg-yellow-500 text-gray-900",
    badgeClass: "bg-yellow-500 text-gray-900",
    textClass: "text-gray-900",
  },
  Vac: {
    lineBgClass: "bg-lime-500/20",
    cellBgClass: "bg-lime-500/35",
    solidClass: "bg-lime-500 text-gray-900",
    badgeClass: "bg-lime-500 text-gray-900",
    textClass: "text-gray-900",
  },
  San: {
    lineBgClass: "bg-sky-500/20",
    cellBgClass: "bg-sky-500/35",
    solidClass: "bg-sky-500 text-gray-900",
    badgeClass: "bg-sky-500 text-gray-900",
    textClass: "text-gray-900",
  },
  Gar: {
    lineBgClass: "bg-purple-500/20",
    cellBgClass: "bg-purple-500/35",
    solidClass: "bg-purple-500 text-gray-900",
    badgeClass: "bg-purple-500 text-gray-900",
    textClass: "text-gray-900",
  },
} as const satisfies Record<
  NecessaryJobId,
  {
    lineBgClass: string;
    cellBgClass: string;
    solidClass: string;
    badgeClass: string;
    textClass: string;
  }
>;

const NECESSARY_JOB_SET = new Set<string>(NECESSARY_JOBS);

export function isNecessaryJob(jobId: string): jobId is NecessaryJobId {
  return NECESSARY_JOB_SET.has(jobId);
}

export function getNecessaryJobStyle(jobId: string) {
  if (!isNecessaryJob(jobId)) {
    return null;
  }

  return NECESSARY_JOB_STYLES[jobId];
}

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
