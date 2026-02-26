import { JOBS } from "../constants/consts";
import { useSchedule } from "../context/ScheduleContext";

import { getBandOfficeAssignmentsForDay } from "../utils/scheduleUtils";
import type { JobId } from "../types/types";

const BAND_OFFICE_JOBS: readonly JobId[] = ["Flo1", "Flo2", "Flo3"];

const BandOffice = () => {
  const { selectedDay, weeklyAssignments, weeklyReassignmentFlags } =
    useSchedule();
  const dayAssignments = weeklyAssignments[selectedDay];

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
    <article className="w-full border border-gray-500 overflow-hidden rounded-xl shadow-lg p-4 bg-gray-200">
      <h2 className="text-center">Band Office 🏢</h2>

      <ul className="mt-3 space-y-1">
        {assignments
          .filter((assignment) => assignment.initials !== "")
          .map((assignment) => (
            <li key={assignment.jobId}>
              <span
                className={[
                  "font-medium",
                  assignment.index >= 0 &&
                  weeklyReassignmentFlags[selectedDay]?.[assignment.index]
                    ? "text-pink-700"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {assignment.initials}
              </span>
              :{" "}
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
          ))}
      </ul>
    </article>
  );
};

export default BandOffice;
