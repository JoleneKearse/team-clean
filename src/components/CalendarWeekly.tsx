import { useSchedule } from "../context/ScheduleContext";
import type { DayKey } from "../types/types";

type CalendarWeeklyProps = {
  highlightedDayKey: DayKey;
};

const CalendarWeekly = ({ highlightedDayKey }: CalendarWeeklyProps) => {
  const { days, jobs, weeklyAssignments } = useSchedule();

  return (
    <article className="w-full border border-gray-500 overflow-hidden rounded-xl shadow-lg text-center">
      <table className="w-full border-spacing-32">
        <thead>
          <tr>
            <th scope="col" className="w-12 bg-pink-400">
              <span className="sr-only">Jobs</span>
            </th>
            {days.map((day) => (
              <th
                key={day.key}
                className={day.key === highlightedDayKey ? "bg-pink-400 border-l border-r" : "bg-pink-400"}
              >
                {day.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {jobs.map((job, jobIndex) => (
            // highlight essential jobs for the current day, applying same styling for td highlightedDayKey in markdown below
            <tr
              key={job}
              className={job.includes("Flo") ? "bg-[#f3f3f3]" : ""}
            >
              <td className="sticky left-0 font-bold">{job}</td>

              {days.map((day) => (
                <td
                  key={day.key}
                  className={day.key === highlightedDayKey ? "bg-gray-100 border-l border-r" : ""}
                >
                  {weeklyAssignments[day.key][jobIndex]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
};

export default CalendarWeekly;
