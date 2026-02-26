import { useSchedule } from "../context/ScheduleContext";

import {
  getDaycareJobLabel,
  getDayCareAssignmentsForDay,
  getMissingDayCareAreasForDay,
} from "../utils/scheduleUtils";

import { JOBS } from "../constants/consts";

function formatMissingAreas(areas: string[]): string {
  if (areas.length === 0) return "";
  if (areas.length === 1) return areas[0];
  if (areas.length === 2) return `${areas[0]} & ${areas[1]}`;

  return `${areas.slice(0, -2).join(", ")}, ${areas[areas.length - 2]} & ${areas[areas.length - 1]}`;
}

const Daycare = () => {
  const { selectedDay, weeklyAssignments, weeklyReassignmentFlags, peopleIn } =
    useSchedule();
  const assignments = getDayCareAssignmentsForDay({
    day: selectedDay,
    jobs: JOBS,
    weeklyAssignments,
    peopleIn,
  });
  // call attention to missing areas to reassign cleaners
  const missingAreas = getMissingDayCareAreasForDay({
    day: selectedDay,
    jobs: JOBS,
    weeklyAssignments,
    peopleIn,
  });

  const missingAreasText = formatMissingAreas(missingAreas);

  return (
    <article className="w-full border border-gray-500 overflow-hidden rounded-xl shadow-lg p-4 bg-gray-200">
      <h2 className="text-center">Daycare Assignments 🧸</h2>

      {missingAreas.length > 0 && (
        <h3 className="font-semibold text-pink-700">
          {`${missingAreasText} ${missingAreas.length === 1 ? "needs" : "need"} to be assigned`}
        </h3>
      )}

      <ul className="mt-3 space-y-1">
        {assignments
          .filter((assignment) => assignment.initials !== "")
          .map((assignment) => {
            const jobIndex = JOBS.indexOf(assignment.job);
            const isReassigned =
              jobIndex >= 0 &&
              Boolean(weeklyReassignmentFlags[selectedDay]?.[jobIndex]);
            const baselineLabel = getDaycareJobLabel(assignment.job, 8);
            const isAreaChanged = assignment.label !== baselineLabel;
            const shouldHighlightLabel = isReassigned || isAreaChanged;

            return (
              <li key={assignment.job}>
                <span
                  className={[
                    "font-medium",
                    isReassigned ? "text-pink-700" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {assignment.initials}
                </span>
                :{" "}
                <span className={shouldHighlightLabel ? "text-pink-700" : ""}>
                  {assignment.label}
                </span>
              </li>
            );
          })}
      </ul>
    </article>
  );
};

export default Daycare;
