import { JOBS, getNecessaryJobStyle } from "../constants/consts";
import { useSchedule } from "../context/ScheduleContext";

import { getBandOfficeAssignmentsForDay } from "../utils/scheduleUtils";
import type { JobId } from "../types/types";

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
  const { selectedDay, weeklyAssignments, weeklyReassignmentFlags, peopleIn } =
    useSchedule();
  const dayAssignments = weeklyAssignments[selectedDay];
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
    <article className="w-full border border-gray-500 overflow-hidden rounded-xl shadow-lg bg-gray-200">
      <h2 className="relative bg-gray-700 px-4 py-4 text-center font-bold text-gray-100">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-3xl leading-none"
        >
          🏢
        </span>
        Band Office
      </h2>

      <div className="p-4">
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
              const necessaryJobStyle = getNecessaryJobStyle(assignment.jobId);

              return (
                <li key={assignment.jobId}>
                  <span
                    className={[
                      "inline-block rounded px-1 font-medium",
                      necessaryJobStyle ? necessaryJobStyle.badgeClass : "",
                      assignment.index >= 0 &&
                      weeklyReassignmentFlags[selectedDay]?.[assignment.index]
                        ? "text-pink-700"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {assignment.initials}
                  </span>{" "}
                  <span
                    className={
                      assignment.index >= 0 &&
                      weeklyReassignmentFlags[selectedDay]?.[assignment.index]
                        ? "text-pink-700"
                        : ""
                    }
                  >
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
