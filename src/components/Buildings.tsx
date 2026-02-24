import { useSchedule } from "../context/ScheduleContext";
import { BUILDINGS, JOBS } from "../constants/consts";
import { getBuildingAssignmentsForDay } from "../utils/scheduleUtils";

const Buildings = () => {
  const { selectedDay, weeklyAssignments } = useSchedule();

  return (
    <article className="w-full border border-gray-500 overflow-hidden rounded-xl shadow-lg p-4">
      <h2>Building Assignments 🏗️</h2>

      <div className="mt-2 space-y-2">
        {BUILDINGS.map((building) => {
          const assignments = getBuildingAssignmentsForDay({
            day: selectedDay,
            jobs: JOBS,
            weeklyAssignments,
            buildingJobs: building.jobIds,
          });

          return (
            <section key={building.key}>
              <h3 className="font-semibold">{building.label}</h3>
              <table className="mt-1 w-full text-center border border-gray-400 border-collapse">
                <tbody>
                  <tr>
                    {assignments.map((assignment) => (
                      <td
                        key={`${assignment.job}-job`}
                        className="italic border border-gray-400 px-2 py-1"
                      >
                        {assignment.job}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    {assignments.map((assignment) => (
                      <td
                        key={`${assignment.job}-cleaner`}
                        className="border border-gray-400 px-2 py-1"
                      >
                        {assignment.initials}
                      </td>
                    ))}
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
