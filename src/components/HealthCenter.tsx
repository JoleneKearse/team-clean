import { JOBS } from "../constants/consts";
import { useSchedule } from "../context/ScheduleContext";

import {
  getHealthCenterAssignmentsForDay,
  getLowStaffingSkippedJobs,
} from "../utils/scheduleUtils";
import { getCleanerInitialsBadgeClassName } from "../utils/cleanerBadgeUtils";
import type { JobId } from "../types/types";
import healthCenterImage from "../assets/health-center.webp";

const DEFAULT_HEALTH_CENTER_JOBS: readonly JobId[] = ["Flo1", "Flo2", "Flo3"];

const HealthCenter = () => {
  const { currentDay, weeklyAssignments, weeklyReassignmentFlags, peopleIn } =
    useSchedule();
  const isMoppingDay = currentDay === "thu";
  const dayAssignments = weeklyAssignments[currentDay];
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
  const healthCenterJobs: readonly JobId[] =
    peopleIn >= 5 && peopleIn <= 6
      ? ["Vac", ...DEFAULT_HEALTH_CENTER_JOBS]
      : DEFAULT_HEALTH_CENTER_JOBS;

  const assignments = healthCenterJobs.map((jobId) => {
    const index = JOBS.indexOf(jobId);

    return {
      jobId,
      index,
      initials: index >= 0 ? (dayAssignments[index] ?? "") : "",
      label: getHealthCenterAssignmentsForDay(jobId, peopleIn),
    };
  });

  return (
    <article className="w-full border border-gray-500 rounded-xl shadow-lg bg-gray-200">
      <h2 className="relative rounded-t-xl bg-gray-700 px-4 py-4 text-center font-bold text-gray-100">
        <img
          src={healthCenterImage}
          alt="health center"
          aria-hidden="true"
          className="pointer-events-none absolute -left-3 top-7 h-18 w-18 -translate-y-1/2 rounded-full border-2 border-gray-700 object-cover"
        />
        Health Center {isMoppingDay ? "🫧" : ""}
      </h2>
      {isMoppingDay && (
        <p className="border-b border-gray-300 px-4 py-2 text-center font-semibold text-sky-800">
          It's a mop day!
        </p>
      )}

      <div className="p-4">
        {showLowStaffingAlert && (
          <h3 className="font-semibold text-pink-700">{lowStaffingAlert}</h3>
        )}
        <ul className="mt-3 space-y-1">
          {assignments
            .filter(
              (assignment) =>
                assignment.initials !== "" && Boolean(assignment.label),
            )
            .map((assignment) => {
              const isReassigned =
                assignment.index >= 0 &&
                Boolean(
                  weeklyReassignmentFlags[currentDay]?.[assignment.index],
                );
              const baselineLabel = getHealthCenterAssignmentsForDay(
                assignment.jobId,
                8,
              );
              const isStaffingChanged = assignment.label !== baselineLabel;
              const shouldHighlight = isReassigned || isStaffingChanged;

              return (
                <li key={assignment.jobId}>
                  <span
                    className={getCleanerInitialsBadgeClassName(
                      assignment.jobId,
                      shouldHighlight ? "text-pink-700" : "",
                    )}
                  >
                    {assignment.initials}
                  </span>{" "}
                  <span className={shouldHighlight ? "text-pink-700" : ""}>
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

export default HealthCenter;
