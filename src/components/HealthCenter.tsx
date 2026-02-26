import { JOBS } from "../constants/consts";
import { useSchedule } from "../context/ScheduleContext";

import { getHealthCenterAssignmentsForDay } from "../utils/scheduleUtils";
import type { JobId } from "../types/types";

const HEALTH_CENTER_JOBS: readonly JobId[] = ["Flo1", "Flo2", "Flo3"];

const HealthCenter = () => {
  const { selectedDay, weeklyAssignments, peopleIn } = useSchedule();
  const dayAssignments = weeklyAssignments[selectedDay];

  const assignments = HEALTH_CENTER_JOBS.map((jobId) => {
    const index = JOBS.indexOf(jobId);

    return {
      jobId,
      initials: index >= 0 ? (dayAssignments[index] ?? "") : "",
      label: getHealthCenterAssignmentsForDay(jobId, peopleIn),
    };
  });

  return (
    <article className="w-full border border-gray-500 overflow-hidden rounded-xl shadow-lg p-4 bg-gray-200">
      <h2 className="text-center">Health Center 🩺</h2>

      <ul className="mt-3 space-y-1">
        {assignments
          .filter((assignment) => assignment.initials !== "")
          .map((assignment) => (
            <li key={assignment.jobId}>
              <span className="font-medium">{assignment.initials}</span>:{" "}
              {assignment.label}
            </li>
          ))}
      </ul>
    </article>
  );
};

export default HealthCenter;
