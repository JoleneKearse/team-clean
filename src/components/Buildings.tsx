import { useSchedule } from "../context/ScheduleContext";
import { BUILDINGS, JOBS } from "../constants/consts";
import { getBuildingAssignmentsForDay } from "../utils/scheduleUtils";

const Buildings = () => {
  const { selectedDay, weeklyAssignments, weeklyReassignmentFlags } =
    useSchedule();

  return (
    <article className="w-full border border-gray-500 overflow-hidden rounded-xl shadow-lg p-4 bg-gray-200">
      <h2 className="text-center">Building Assignments 🏗️</h2>

      <div className="mt-2 space-y-2">
        {BUILDINGS.map((building) => {
          const assignments = getBuildingAssignmentsForDay({
            day: selectedDay,
            jobs: JOBS,
            weeklyAssignments,
            buildingJobs: building.jobIds,
          });
          const uniqueAssignedCleaners = new Set(
            assignments
              .map((assignment) => assignment.initials)
              .filter((initials) => initials !== ""),
          );
          const hasOnlyOneAssignedCleaner = uniqueAssignedCleaners.size === 1;

          return (
            <section key={building.key}>
              <h3
                className={[
                  "font-semibold",
                  hasOnlyOneAssignedCleaner ? "text-pink-700" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {hasOnlyOneAssignedCleaner
                  ? `${building.label} needs another cleaner`
                  : building.label}
              </h3>
              <table className="mt-1 w-full text-center border border-gray-400 border-collapse">
                <tbody>
                  <tr>
                    {assignments.map((assignment) => {
                      const jobIndex = JOBS.indexOf(assignment.job);
                      const isReassigned =
                        jobIndex >= 0 &&
                        Boolean(
                          weeklyReassignmentFlags[selectedDay]?.[jobIndex],
                        );

                      return (
                        <td
                          key={`${assignment.job}-job`}
                          className={[
                            "italic border border-gray-400 px-2 py-1",
                            hasOnlyOneAssignedCleaner &&
                            assignment.initials === ""
                              ? "text-pink-700"
                              : "",
                            isReassigned ? "text-pink-700" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          {assignment.job}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    {assignments.map((assignment) => {
                      const jobIndex = JOBS.indexOf(assignment.job);
                      const isReassigned =
                        jobIndex >= 0 &&
                        Boolean(
                          weeklyReassignmentFlags[selectedDay]?.[jobIndex],
                        );

                      return (
                        <td
                          key={`${assignment.job}-cleaner`}
                          className={[
                            "border border-gray-400 px-2 py-1",
                            hasOnlyOneAssignedCleaner &&
                            assignment.initials === ""
                              ? "bg-pink-100"
                              : "bg-gray-100",
                            isReassigned ? "text-pink-700" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          {assignment.initials}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </section>
          );
        })}
      </div>
    </article>
  );
};

export default Buildings;
