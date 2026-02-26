import { JOBS } from "../constants/consts";
import { useSchedule } from "../context/ScheduleContext";

import { getHealthCenterAssignmentsForDay } from "../utils/scheduleUtils";
import type { JobId } from "../types/types";

const DEFAULT_HEALTH_CENTER_JOBS: readonly JobId[] = ["Flo1", "Flo2", "Flo3"];

const HealthCenter = () => {
  const { selectedDay, weeklyAssignments, weeklyReassignmentFlags, peopleIn } =
    useSchedule();
  const dayAssignments = weeklyAssignments[selectedDay];
  const healthCenterJobs: readonly JobId[] =
    peopleIn === 6
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
    <article className="w-full border border-gray-500 overflow-hidden rounded-xl shadow-lg p-4 bg-gray-200">
      <h2 className="text-center">Health Center 🩺</h2>

      <ul className="mt-3 space-y-1">
        {assignments
          .filter(
            (assignment) =>
              assignment.initials !== "" && Boolean(assignment.label),
          )
          .map((assignment) => {
            const isReassigned =
              assignment.index >= 0 &&
              Boolean(weeklyReassignmentFlags[selectedDay]?.[assignment.index]);
            const baselineLabel = getHealthCenterAssignmentsForDay(
              assignment.jobId,
              8,
            );
            const isStaffingChanged = assignment.label !== baselineLabel;
            const shouldHighlight = isReassigned || isStaffingChanged;

            return (
              <li key={assignment.jobId}>
                <span
                  className={[
                    "font-medium",
                    shouldHighlight ? "text-pink-700" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {assignment.initials}
                </span>
                :{" "}
                <span className={shouldHighlight ? "text-pink-700" : ""}>
                  {assignment.label}
                </span>
              </li>
            );
          })}
      </ul>
    </article>
  );
};

export default HealthCenter;
