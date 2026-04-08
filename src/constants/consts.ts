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
  "AN",
  "RB",
  "D",
  "JK",
  "TW",
] as const;

export const CALL_IN_CLEANERS = ["KR", "MB", "EB", "KK", "new"] as const;

export const CLEANERS = [...STAFF_CLEANERS, ...CALL_IN_CLEANERS] as const;

export const CLOSURE_OPTIONS = [
  { id: "Seniors", label: "Seniors", colorClass: "bg-blue-300" },
  { id: "Grade 1", label: "Grade 1", colorClass: "bg-blue-300" },
  { id: "Grade 2", label: "Grade 2", colorClass: "bg-blue-300" },
  { id: "Daycare", label: "Daycare", colorClass: "bg-blue-300" },
  { id: "Education", label: "Education", colorClass: "bg-red-300" },
  { id: "Fieldhouse", label: "Fieldhouse", colorClass: "bg-red-300" },
  { id: "Social", label: "Social", colorClass: "bg-red-300" },
  { id: "Annex", label: "Annex", colorClass: "bg-red-300" },
  { id: "Band Office", label: "Band Office", colorClass: "bg-red-300" },
  {
    id: "Health Center",
    label: "Health Center",
    colorClass: "bg-green-300",
  },
  {
    id: "Community Center",
    label: "Community Center",
    colorClass: "bg-blue-300",
  },
  {
    id: "Drop-in Center",
    label: "Drop-in Center",
    colorClass: "bg-red-300",
  },
  {
    id: "Church",
    label: "Church",
    colorClass: "bg-red-300",
  },
] as const;

const CLOSURE_LABEL_BY_ID = Object.fromEntries(
  CLOSURE_OPTIONS.map((option) => [option.id, option.label]),
) as Record<string, string>;

export function getClosureLabelById(closureId: string): string {
  return CLOSURE_LABEL_BY_ID[closureId] ?? closureId;
}

export const BUILDINGS = [
  {
    key: "seniors_fieldhouse_education",
    label: "Seniors / Fieldhouse / Education",
    closureSegmentIds: ["Seniors", "Fieldhouse", "Education"],
    jobIds: ["SW", "San", "Flo3"],
  },
  {
    key: "grade2_social",
    label: "Grade 2 / Social",
    closureSegmentIds: ["Grade 2", "Social"],
    jobIds: ["Vac", "Gar", "Flo1"],
  },
  {
    key: "grade1_annex",
    label: "Grade 1 / Annex",
    closureSegmentIds: ["Grade 1", "Annex"],
    jobIds: ["Bath", "Flo2"],
  },
] as const;

export const ANCHOR_MONDAY = "2026-02-23" as const;
