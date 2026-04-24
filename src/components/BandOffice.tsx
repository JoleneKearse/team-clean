import { JOBS, getNecessaryJobStyle } from "../constants/consts";
import { useSchedule } from "../context/ScheduleContext";

import {
  getBandOfficeAssignmentsForDay,
  getLowStaffingSkippedJobs,
} from "../utils/scheduleUtils";
import { getCleanerInitialsBadgeClassName } from "../utils/cleanerBadgeUtils";
import type { JobId } from "../types/types";
import { getMopLocationsForDay } from "../constants/consts";
import bandOfficeImage from "../assets/band-office.webp";
import mopIcon from "../assets/mop.svg";

const BAND_OFFICE_JOBS: readonly JobId[] = ["Flo1", "Flo2", "Flo3"];
const BATHROOM_NOTICE_SUFFIX = " needs to do all the bathrooms.";

function getBandOfficeNotices(
  peopleIn: number,
  bathInitials: string,
): string[] {
  if (peopleIn <= 5) {
    return ["All jobs do both floors."];
  }

  if (peopleIn === 6) {
    return ["If chambers used, everyone has to do both floors."];
  }

  if (peopleIn === 7) {
    const bathNoticePrefix = bathInitials || "Bath";

    return [
      "There may be only one person cleaning the basement, so check it.",
      `${bathNoticePrefix} needs to do all the bathrooms.`,
    ];
  }

  return [];
}

const BandOffice = () => {
  const { currentDay, weeklyAssignments, weeklyReassignmentFlags, peopleIn } =
    useSchedule();
  const isMoppingDay = getMopLocationsForDay(currentDay).includes("bandOffice");
  const lowStaffingSkippedJobs = getLowStaffingSkippedJobs(peopleIn);
  const showLowStaffingAlert = lowStaffingSkippedJobs.length > 0;
  const lowStaffingAlert =
    peopleIn === 3 &&
    lowStaffingSkippedJobs.includes("Vac") &&
    lowStaffingSkippedJobs.includes("Gar")
      ? "Only 3 people in, so no Vac or Gar."
      : peopleIn === 4 && lowStaffingSkippedJobs.includes("Vac")
        ? "Only 4 people in, so no Vac."
        : "";
  const dayAssignments = weeklyAssignments[currentDay];
  const bathIndex = JOBS.indexOf("Bath");
  const bathInitials = bathIndex >= 0 ? (dayAssignments[bathIndex] ?? "") : "";
  const notices = getBandOfficeNotices(peopleIn, bathInitials);
  const bathBadgeStyle = getNecessaryJobStyle("Bath");

  const assignments = BAND_OFFICE_JOBS.map((jobId) => {
    const index = JOBS.indexOf(jobId);

    return {
      jobId,
      index,
      initials: index >= 0 ? (dayAssignments[index] ?? "") : "",
      label: getBandOfficeAssignmentsForDay(jobId),
    };
  });

  return (
    <article className="w-full border border-gray-500 rounded-xl shadow-lg bg-gray-200">
      <h2 className="relative rounded-t-xl bg-gray-700 px-4 py-4 text-center font-bold text-gray-100">
        <img
          src={bandOfficeImage}
          alt="band office"
          aria-hidden="true"
          className="pointer-events-none absolute -left-3 top-7 h-18 w-18 -translate-y-1/2 rounded-full border-2 border-gray-700 object-cover"
        />
        Band Office{" "}
        {isMoppingDay ? (
          <img
            src={mopIcon}
            alt="mop"
            aria-hidden="true"
            className="inline-block h-5 w-5 align-middle"
          />
        ) : (
          ""
        )}
      </h2>
      {isMoppingDay && (
        <p className="border-b border-gray-300 px-4 py-2 text-center font-semibold text-sky-800">
          It's a mop day!
        </p>
      )}

      <div className="rounded-b-xl p-4">
        {showLowStaffingAlert && (
          <h3 className="font-semibold text-pink-700">{lowStaffingAlert}</h3>
        )}
        {notices.length > 0 && (
          <ul className="mt-3 space-y-1">
            {notices.map((notice) => {
              const hasBathroomSuffix = notice.endsWith(BATHROOM_NOTICE_SUFFIX);

              if (!hasBathroomSuffix) {
                return (
                  <li key={notice} className="font-normal text-pink-700">
                    {notice}
                  </li>
                );
              }

              const prefix = notice.slice(0, -BATHROOM_NOTICE_SUFFIX.length);

              return (
                <li key={notice} className="font-normal text-pink-700">
                  <span
                    className={[
                      "inline-block rounded px-1 font-medium",
                      bathBadgeStyle ? bathBadgeStyle.badgeClass : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {prefix}
                  </span>
                  {BATHROOM_NOTICE_SUFFIX}
                </li>
              );
            })}
          </ul>
        )}

        <ul className="mt-3 space-y-1">
          {assignments
            .filter((assignment) => assignment.initials !== "")
            .map((assignment) => {
              const isReassigned =
                assignment.index >= 0 &&
                Boolean(
                  weeklyReassignmentFlags[currentDay]?.[assignment.index],
                );

              return (
                <li key={assignment.jobId}>
                  <span
                    className={getCleanerInitialsBadgeClassName(
                      assignment.jobId,
                      isReassigned ? "text-pink-700" : "",
                    )}
                  >
                    {assignment.initials}
                  </span>{" "}
                  <span className={isReassigned ? "text-pink-700" : ""}>
                    {assignment.label}
                  </span>
                </li>
              );
            })}
        </ul>
      </div>
    </article>
  );
};

export default BandOffice;
