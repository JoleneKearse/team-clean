import { getNecessaryJobStyle } from "../constants/consts";
import type { JobId } from "../types/types";

const BASE_INITIALS_BADGE_CLASS_NAME =
  "inline-flex w-11 shrink-0 items-center justify-center rounded px-1 py-0.5 text-center font-medium leading-none";

const FLO_INITIALS_BADGE_CLASS_NAMES: Partial<Record<JobId, string>> = {
  Flo1: "border border-gray-300 bg-gray-100 text-gray-900",
  Flo2: "border border-gray-500 bg-gray-100 text-gray-900",
  Flo3: "border border-gray-700 bg-gray-100 text-gray-900",
};

export function getCleanerInitialsBadgeClassName(
  jobId: JobId,
  extraClassName = "",
): string {
  const necessaryJobStyle = getNecessaryJobStyle(jobId);

  return [
    BASE_INITIALS_BADGE_CLASS_NAME,
    necessaryJobStyle
      ? necessaryJobStyle.badgeClass
      : (FLO_INITIALS_BADGE_CLASS_NAMES[jobId] ?? "bg-gray-100 text-gray-900"),
    extraClassName,
  ]
    .filter(Boolean)
    .join(" ");
}
