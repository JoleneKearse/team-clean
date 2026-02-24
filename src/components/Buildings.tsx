import { useSchedule } from "../context/ScheduleContext";
import { BUILDINGS, JOBS } from "../constants/consts";
import { getBuildingAssignmentsForDay } from "../utils/scheduleUtils";

const Buildings = () => {
  const { selectedDay, weeklyAssignments } = useSchedule();

  return (
    <article className="w-full border border-gray-500 overflow-hidden rounded-xl shadow-lg p-4">
      <h2>Building Assignments 🏗️</h2>

      <div className="mt-3 space-y-4">
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
              <ul>
                {assignments.map((assignment) => (
                  <li key={assignment.job}>
                    <span className="font-medium">{assignment.job}</span>: {assignment.initials}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </article>
  );
};

export default Buildings;
