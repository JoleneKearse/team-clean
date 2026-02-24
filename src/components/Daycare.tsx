import { useSchedule } from "../context/ScheduleContext";
import { getDayCareAssignmentsForDay } from "../utils/scheduleUtils";
import { JOBS } from "../constants/consts";

const Daycare = () => {
  const { selectedDay, weeklyAssignments, peopleIn } = useSchedule();

  const assignments = getDayCareAssignmentsForDay({
    day: selectedDay,
    jobs: JOBS,
    weeklyAssignments,
    peopleIn,
  });

  return (
    <article className="w-full border border-gray-500 overflow-hidden rounded-xl shadow-lg p-4">
      <h2>Daycare Assignments 🧸</h2>

      <ul className="mt-3 space-y-1">
        {assignments.map((assignment) => (
          <li key={assignment.job}>
            <span className="font-medium">{assignment.label}</span>:{" "}
            {assignment.initials}
          </li>
        ))}
      </ul>
    </article>
  );
};

export default Daycare;
